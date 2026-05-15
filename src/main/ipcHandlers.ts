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

export function registerIpcHandlers(): void {
  const db = getDb()

  // ── Sessions ──────────────────────────────────────────
  ipcMain.handle('sessions:save', (_, session: Omit<PracticeSession, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO practice_sessions (date, started_at, ended_at, duration_s, note_presses, song_id)
      VALUES (@date, @started_at, @ended_at, @duration_s, @note_presses, @song_id)
    `)
    const result = stmt.run(session)
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
    return db.prepare(`
      SELECT date, SUM(duration_s) as total_s, SUM(note_presses) as total_presses, COUNT(*) as count
      FROM practice_sessions
      GROUP BY date
      ORDER BY date
    `).all()
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
    db.prepare('DELETE FROM songs WHERE id = ?').run(id)
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
