import { ipcMain } from 'electron'
import { getDb } from './db'
import { updateObsState } from './obsServer'

export interface PracticeSession {
  id: number
  date: string
  started_at: number
  ended_at: number
  duration_s: number
  note_presses: number
  unique_notes: number
  chords_recognized: number
  note_events_recorded?: number
  song_id: number | null
}

export interface Song {
  id: number
  title: string
  composer: string
  status: 'not_started' | 'practicing' | 'completed'
  notes: string
  created_at: number
  updated_at: number
}

function isValidPracticeDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

export function registerIpcHandlers(): void {
  const db = getDb()

  // New presses are stored per note immediately. Legacy session metrics stay
  // in the aggregate, while new session rows are excluded to avoid duplicates.
  const dailySummaryCte = `
    WITH session_summary AS (
      SELECT date,
             SUM(duration_s) AS total_s,
             SUM(CASE WHEN note_events_recorded = 1 THEN 0 ELSE note_presses END) AS total_presses,
             SUM(CASE WHEN note_events_recorded = 1 THEN 0 ELSE unique_notes END) AS total_unique_notes,
             SUM(chords_recognized) AS total_chords_recognized,
             COUNT(*) AS count
      FROM practice_sessions
      GROUP BY date
    ),
    note_summary AS (
      SELECT date,
             SUM(press_count) AS total_presses,
             COUNT(*) AS total_unique_notes
      FROM daily_note_counts
      GROUP BY date
    ),
    summary_dates AS (
      SELECT date FROM session_summary
      UNION
      SELECT date FROM note_summary
    )
  `
  const dailySummarySelect = `
    SELECT dates.date,
           COALESCE(sessions.total_s, 0) AS total_s,
           COALESCE(sessions.total_presses, 0) + COALESCE(notes.total_presses, 0) AS total_presses,
           COALESCE(sessions.total_unique_notes, 0) + COALESCE(notes.total_unique_notes, 0) AS total_unique_notes,
           COALESCE(sessions.total_chords_recognized, 0) AS total_chords_recognized,
           COALESCE(sessions.count, 0) AS count
    FROM summary_dates dates
    LEFT JOIN session_summary sessions ON sessions.date = dates.date
    LEFT JOIN note_summary notes ON notes.date = dates.date
  `
  const dailySummaryStmt = db.prepare(`${dailySummaryCte}${dailySummarySelect} ORDER BY dates.date`)
  const dailySummaryByDateStmt = db.prepare(`${dailySummaryCte}${dailySummarySelect} WHERE dates.date = ?`)
  const recordNotePressStmt = db.prepare(`
    INSERT INTO daily_note_counts (date, note, press_count)
    VALUES (?, ?, 1)
    ON CONFLICT(date, note) DO UPDATE SET press_count = press_count + 1
  `)

  // ── Sessions ──────────────────────────────────────────
  ipcMain.handle('sessions:save', (_, session: Omit<PracticeSession, 'id'>) => {
    const requestedSongId = Number.isInteger(session.song_id) ? session.song_id : null
    const songId = requestedSongId !== null && db.prepare('SELECT 1 FROM songs WHERE id = ?').get(requestedSongId)
      ? requestedSongId
      : null
    const stmt = db.prepare(`
      INSERT INTO practice_sessions (date, started_at, ended_at, duration_s, note_presses, unique_notes, chords_recognized, note_events_recorded, song_id)
      VALUES (@date, @started_at, @ended_at, @duration_s, @note_presses, @unique_notes, @chords_recognized, 1, @song_id)
    `)
    const result = stmt.run({ ...session, song_id: songId })
    return result.lastInsertRowid
  })

  ipcMain.handle('sessions:list', () => {
    return db.prepare('SELECT * FROM practice_sessions ORDER BY started_at DESC').all()
  })

  ipcMain.handle('sessions:byDate', (_, date: string) => {
    return db.prepare('SELECT * FROM practice_sessions WHERE date = ?').all(date)
  })

  // 返回每天的练习秒数汇总（用于打卡图）
  ipcMain.handle('sessions:dailySummary', () => {
    return dailySummaryStmt.all()
  })

  ipcMain.handle('stats:recordNotePress', (_, date: unknown, note: unknown) => {
    if (!isValidPracticeDate(date)) {
      throw new Error('Invalid practice date')
    }
    if (!Number.isInteger(note) || (note as number) < 21 || (note as number) > 108) {
      throw new Error('Invalid MIDI note')
    }

    recordNotePressStmt.run(date, note)
    return dailySummaryByDateStmt.get(date)
  })

  // ── Songs ──────────────────────────────────────────────
  ipcMain.handle('songs:list', () => {
    return db.prepare('SELECT * FROM songs ORDER BY updated_at DESC').all()
  })

  ipcMain.handle('songs:create', (_, song: Pick<Song, 'title' | 'composer' | 'notes'>) => {
    const now = Date.now()
    const stmt = db.prepare(`
      INSERT INTO songs (title, composer, status, notes, created_at, updated_at)
      VALUES (@title, @composer, 'not_started', @notes, @now, @now)
    `)
    const result = stmt.run({ ...song, now })
    return result.lastInsertRowid
  })

  ipcMain.handle('songs:update', (_, id: number, fields: Partial<Pick<Song, 'title' | 'composer' | 'status' | 'notes'>>) => {
    const allowed = ['title', 'composer', 'status', 'notes']
    const sets = Object.keys(fields)
      .filter((k) => allowed.includes(k))
      .map((k) => `${k} = @${k}`)
      .join(', ')
    if (!sets) return
    db.prepare(`UPDATE songs SET ${sets}, updated_at = @now WHERE id = @id`)
      .run({ ...fields, now: Date.now(), id })
  })

  ipcMain.handle('songs:delete', (_, id: number) => {
    const removeSong = db.transaction(() => {
      db.prepare('UPDATE practice_sessions SET song_id = NULL WHERE song_id = ?').run(id)
      db.prepare('DELETE FROM songs WHERE id = ?').run(id)
    })
    removeSong()
  })

  // ── Practice Plans ─────────────────────────────────────
  ipcMain.handle('plans:get', (_, date: string) => {
    return db.prepare('SELECT * FROM practice_plans WHERE date = ?').get(date) ?? null
  })

  ipcMain.handle('plans:set', (_, date: string, goal_min: number, note: string) => {
    db.prepare(`
      INSERT INTO practice_plans (date, goal_min, note)
      VALUES (@date, @goal_min, @note)
      ON CONFLICT(date) DO UPDATE SET goal_min = @goal_min, note = @note
    `).run({ date, goal_min, note })
  })

  ipcMain.handle('plans:delete', (_, date: string) => {
    db.prepare('DELETE FROM practice_plans WHERE date = ?').run(date)
  })

  ipcMain.handle('plans:all', () => {
    return db.prepare('SELECT * FROM practice_plans').all()
  })

  // ── OBS 状态同步 ────────────────────────────────────────
  ipcMain.on('obs:update', (_event, partial) => {
    updateObsState(partial)
  })
}
