import { useMemo, useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UseMidiReturn } from '../hooks/useMidi'
import type { UsePracticeSessionReturn } from '../hooks/usePracticeSession'
import { formatElapsed } from '../hooks/usePracticeSession'
import { recognizeChord, inversionKey, type ChordResult } from '../utils/chordRecognition'
import { RealtimePiano } from '../components/RealtimePiano'
import { ScalePopover } from '../components/ScalePopover'
import type { UseScaleAnalysisReturn } from '../hooks/useScaleAnalysis'
import type { PracticePlan, Song } from '../types/api'
import type { Settings } from '../hooks/useSettings'
import { toLocalDateString } from '../utils/date'
import './PracticePage.css'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function noteToName(note: number): string {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`
}

interface Props {
  midi: UseMidiReturn
  session: UsePracticeSessionReturn
  minHoldMs: number
  scaleAnalysis: UseScaleAnalysisReturn
  settings: Settings
  activeSongId: number | null
  onActiveSongChange: (id: number | null, title: string) => void
  onConfirmedChord: () => void
}

export function PracticePage({
  midi,
  session,
  minHoldMs,
  scaleAnalysis,
  settings,
  activeSongId,
  onActiveSongChange,
  onConfirmedChord
}: Props): JSX.Element {
  const { t } = useTranslation()
  const { lastNote, activeNotes, activeNoteVelocities, sustainedNotes, sustainActive, isConnected } = midi

  // 今日计划 + 当前曲目
  const [todayPlan, setTodayPlan] = useState<PracticePlan | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  useEffect(() => {
    const today = toLocalDateString()
    window.api?.plans.get(today).then(setTodayPlan).catch(() => {})
  }, [])
  useEffect(() => {
    window.api?.songs.list().then((loadedSongs) => {
      setSongs(loadedSongs)
      if (activeSongId !== null && !loadedSongs.some((song) => song.id === activeSongId)) {
        onActiveSongChange(null, '')
      }
    }).catch(() => {})
  }, [activeSongId, onActiveSongChange])

  const currentChord = useMemo(
    () => recognizeChord(Array.from(activeNotes), settings.chordKeyCenter),
    [activeNotes, settings.chordKeyCenter]
  )

  // confirmedChord：当前和弦持续超过 minHoldMs 后才「确认」
  // lastChord：上一个被确认的和弦（切走时才更新）
  const [confirmedChord, setConfirmedChord] = useState<ChordResult | null>(null)
  const [lastChord, setLastChord] = useState<ChordResult | null>(null)

  const currentChordRef = useRef<ChordResult | null>(null)
  const confirmedChordRef = useRef<ChordResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onConfirmedChordRef = useRef(onConfirmedChord)

  useEffect(() => {
    onConfirmedChordRef.current = onConfirmedChord
  }, [onConfirmedChord])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const chordChanged = currentChord?.name !== currentChordRef.current?.name
    if (chordChanged) {
      // 和弦变了：如果旧和弦已被确认，移入「上一个」
      if (confirmedChordRef.current) {
        setLastChord(confirmedChordRef.current)
      }
      confirmedChordRef.current = null
      setConfirmedChord(null)
      currentChordRef.current = currentChord
    }

    // 新和弦出现，或确认前修改了持续时长时，重新开始计时。
    if (currentChord && !confirmedChordRef.current) {
      timerRef.current = setTimeout(() => {
        confirmedChordRef.current = currentChord
        setConfirmedChord(currentChord)
        onConfirmedChordRef.current()
        timerRef.current = null
      }, minHoldMs)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentChord?.name, minHoldMs]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedActiveNotes = Array.from(activeNotes).sort((a, b) => a - b)

  if (!isConnected) {
    return (
      <div className="practice-layout">
        <div className="practice-empty">
          <div className="practice-empty-icon">🎹</div>
          <p>{t('practiceView.connectHint')}</p>
          <p className="practice-empty-hint">{t('practiceView.connectHint2')}</p>
        </div>
        <RealtimePiano activeNoteVelocities={new Map()} sustainedNotes={new Set()} />
      </div>
    )
  }

  return (
    <div className="practice-layout">
      <div className="practice-body">

        {/* 今日计划横幅 */}
        {todayPlan && (todayPlan.goal_min > 0 || todayPlan.note) && (
          <div className="today-plan-bar">
            <span className="today-plan-icon">📋</span>
            {todayPlan.goal_min > 0 && (
              <span className="today-plan-goal">
                {t('practiceView.todayGoal', { min: todayPlan.goal_min })}
              </span>
            )}
            {todayPlan.note && (
              <span className="today-plan-note">{todayPlan.note}</span>
            )}
          </div>
        )}

        {/* 练习会话控制栏 + 曲目选择 + 调式按钮 */}
        <div className="session-bar">
          {session.isActive ? (
            <>
              <span className="session-timer">
                <span className="session-timer-dot" />
                {formatElapsed(session.elapsed)}
              </span>
              <button className="session-btn session-btn--stop" onClick={() => session.stop()}>
                {t('session.stop')}
              </button>
            </>
          ) : (
            <button className="session-btn session-btn--start" onClick={session.start}>
              {t('session.start')}
            </button>
          )}
          <label className="song-picker">
            <span>{t('songs')}</span>
            <select
              value={activeSongId ?? ''}
              onChange={(e) => {
                const nextId = e.target.value ? Number(e.target.value) : null
                const song = songs.find((s) => s.id === nextId)
                onActiveSongChange(nextId, song?.title ?? '')
              }}
            >
              <option value="">—</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>{song.title}</option>
              ))}
            </select>
          </label>
          <div className="session-bar-spacer" />
          <ScalePopover
            matches={scaleAnalysis.scaleMatches}
            pitchCount={scaleAnalysis.recentPitchClasses.length}
          />
        </div>

        {/* 和弦行 */}
        <div className="chord-row">
          <div className={`chord-current ${currentChord ? 'chord-current--active' : ''}`}>
            <div className="section-label">
              {t('practiceView.currentChord')}
              {confirmedChord?.name === currentChord?.name && currentChord && (
                <span className="chord-confirmed-badge">{t('practiceView.held')}</span>
              )}
            </div>
            {currentChord ? (
              <>
                <div className="chord-name-large">{currentChord.name}</div>
                {currentChord.alternates && currentChord.alternates.length > 0 && (
                  <div className="chord-alternates">
                    {currentChord.alternates.map((alternate, index) => (
                      <div className="chord-alternate" key={`${alternate.name}-${index}`}>
                        {alternate.name}
                      </div>
                    ))}
                  </div>
                )}
                <div className="chord-quality">
                  {t(currentChord.qualityKey)}
                  {currentChord.inversion > 0 && ` · ${t(inversionKey(currentChord.inversion))}`}
                </div>
              </>
            ) : (
              <div className="chord-name-large chord-name--empty">—</div>
            )}
          </div>

          <div className="chord-last-col">
            <div className={`sustain-badge ${sustainActive ? 'sustain-badge--on' : ''}`}>
              <span className="sustain-dot" />
              {sustainActive ? t('practiceView.sustainOn') : t('practiceView.sustainOff')}
            </div>
            <div className="chord-last">
              <div className="section-label">{t('practiceView.lastChord')}</div>
              {lastChord ? (
                <>
                  <div className="chord-name-medium">{lastChord.name}</div>
                  <div className="chord-quality">{t(lastChord.qualityKey)}</div>
                </>
              ) : (
                <div className="chord-name-medium chord-name--empty">—</div>
              )}
            </div>
          </div>
        </div>

        {/* 音符行 */}
        <div className="note-row">
          <div className="note-section">
            <div className="section-label">{t('practiceView.lastNote')}</div>
            <div className={`last-note-name ${lastNote ? 'last-note-name--active' : ''}`}>
              {lastNote ? noteToName(lastNote.note) : '—'}
            </div>
            {lastNote && (
              <div className="note-meta">{t('practiceView.velocity')} {lastNote.velocity}</div>
            )}
          </div>

          <div className="divider" />

          <div className="note-section">
            <div className="section-label">
              {t('practiceView.activeNotes')}
              {sustainedNotes.size > 0 && (
                <span className="sustained-hint">
                  ({t('practiceView.sustainedCount', { count: sustainedNotes.size })})
                </span>
              )}
            </div>
            <div className="active-notes-list">
              {sortedActiveNotes.length === 0 ? (
                <span className="active-notes-empty">—</span>
              ) : (
                sortedActiveNotes.map((noteNum) => {
                  const name = noteToName(noteNum)
                  const isSustained = sustainedNotes.has(noteNum)
                  return (
                    <span
                      key={noteNum}
                      className={`active-note-chip ${isSustained ? 'active-note-chip--sustained' : ''}`}
                    >
                      {name}
                    </span>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>

      <RealtimePiano
        activeNoteVelocities={activeNoteVelocities}
        sustainedNotes={sustainedNotes}
        whiteKeyPressedColor={settings.whiteKeyPressedColor}
        blackKeyPressedColor={settings.blackKeyPressedColor}
        whiteKeySustainedColor={settings.whiteKeySustainedColor}
        blackKeySustainedColor={settings.blackKeySustainedColor}
      />
    </div>
  )
}
