import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMidi } from './hooks/useMidi'
import { usePracticeSession } from './hooks/usePracticeSession'
import { useSettings } from './hooks/useSettings'
import { useScaleAnalysis } from './hooks/useScaleAnalysis'
import { usePracticeHistory } from './hooks/usePracticeHistory'
import { MidiStatus } from './components/MidiStatus'
import { Sidebar, type Page } from './components/Sidebar'
import { PracticePage } from './pages/PracticePage'
import { StatsPage } from './pages/StatsPage'
import { SongsPage } from './pages/SongsPage'
import { CalendarPage } from './pages/CalendarPage'
import { OBSPage } from './pages/OBSPage'
import { SettingsPage } from './pages/SettingsPage'
import { recognizeChord } from './utils/chordRecognition'
import { addLocalDays, toLocalDateString } from './utils/date'
import './styles/App.css'

function App(): JSX.Element {
  const { t, i18n } = useTranslation()
  const { dailySummary, reload: reloadPracticeHistory, recordNotePress } = usePracticeHistory()
  const midi = useMidi(recordNotePress)
  const settingsHook = useSettings()
  const scaleAnalysis = useScaleAnalysis(midi)
  const session = usePracticeSession(reloadPracticeHistory)
  const [page, setPage] = useState<Page>('practice')
  const [activeSongId, setActiveSongId] = useState<number | null>(null)
  const [activeSongTitle, setActiveSongTitle] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('pianotracker_theme')
    return saved === 'light' ? 'light' : 'dark'
  })
  const sessionStartCountsRef = useRef<Record<number, number>>({})
  const sessionChordCountRef = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pianotracker_theme', theme)
  }, [theme])

  const startSession = (): void => {
    sessionStartCountsRef.current = { ...midi.notePressCount }
    sessionChordCountRef.current = 0
    session.start()
  }

  const stopSession = (): void => {
    const deltas = Object.entries(midi.notePressCount)
      .map(([note, count]) => [Number(note), count - (sessionStartCountsRef.current[Number(note)] ?? 0)] as const)
      .filter(([, delta]) => delta > 0)

    session.stop({
      notePresses: deltas.reduce((sum, [, delta]) => sum + delta, 0),
      uniqueNotes: deltas.length,
      chordsRecognized: sessionChordCountRef.current,
      songId: activeSongId
    })
  }

  const handleConfirmedChord = useCallback((): void => {
    if (session.isActive) sessionChordCountRef.current += 1
  }, [session.isActive])

  const handleActiveSongChange = useCallback((id: number | null, title: string): void => {
    setActiveSongId(id)
    setActiveSongTitle(title)
  }, [])

  // OBS 状态推送（每秒）
  const currentObsChordRef = useRef('')
  const lastChordRef = useRef('')
  useEffect(() => {
    const today = toLocalDateString()
    const todaySummary = dailySummary.find((d) => d.date === today)
    const activeSessionSeconds = session.isActive && session.startTime && toLocalDateString(session.startTime) === today
      ? session.elapsed
      : 0
    const todayMin = Math.round(((todaySummary?.total_s ?? 0) + activeSessionSeconds) / 60)

    // 连续天数
    const sorted = [...dailySummary].sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    let expected = today
    for (const d of sorted) {
      if (d.date === expected) {
        streak++
        expected = addLocalDays(expected, -1)
      } else break
    }

    const chord = recognizeChord(Array.from(midi.activeNotes), settingsHook.settings.chordKeyCenter)
    const chordName = chord?.name ?? ''
    if (chordName !== currentObsChordRef.current) {
      if (currentObsChordRef.current) lastChordRef.current = currentObsChordRef.current
      currentObsChordRef.current = chordName
    }

    // Map → plain object for IPC serialization
    const activeNotesObj: Record<number, number> = {}
    midi.activeNoteVelocities.forEach((vel, note) => { activeNotesObj[note] = vel })

    window.api?.obs.update({
      isConnected: midi.isConnected,
      isSessionActive: session.isActive,
      elapsed: session.elapsed,
      currentChord: chordName,
      currentChordQuality: chord ? t(chord.qualityKey) : '',
      lastChord: lastChordRef.current,
      streak,
      totalPracticeToday: todayMin,
      activeSong: activeSongTitle,
      activeNotes: activeNotesObj,
      sustainedNotes: Array.from(midi.sustainedNotes),
      config: {
        ...settingsHook.settings.obs,
        whiteKeyPressedColor:   settingsHook.settings.obs.pianoWhitePressed,
        blackKeyPressedColor:   settingsHook.settings.obs.pianoBlackPressed,
        whiteKeySustainedColor: settingsHook.settings.obs.pianoWhiteSustained,
        blackKeySustainedColor: settingsHook.settings.obs.pianoBlackSustained,
      }
    })

  }, [midi.activeNotes, midi.activeNoteVelocities, midi.sustainedNotes, midi.isConnected, session.isActive, session.elapsed, session.startTime, dailySummary, settingsHook.settings, activeSongTitle, t])

  const renderPage = (): JSX.Element => {
    switch (page) {
      case 'practice': return (
        <PracticePage
          midi={midi}
          session={{ ...session, start: startSession, stop: stopSession }}
          minHoldMs={settingsHook.settings.minHoldMs}
          scaleAnalysis={scaleAnalysis}
          settings={settingsHook.settings}
          activeSongId={activeSongId}
          onActiveSongChange={handleActiveSongChange}
          onConfirmedChord={handleConfirmedChord}
        />
      )
      case 'stats':    return <StatsPage midi={midi} scaleAnalysis={scaleAnalysis} dailySummary={dailySummary} />
      case 'songs':    return <SongsPage />
      case 'calendar': return <CalendarPage />
      case 'obs':      return <OBSPage settings={settingsHook} />
      case 'settings': return <SettingsPage settings={settingsHook} />
    }
  }

  return (
    <div className="app">
      <Sidebar current={page} onChange={setPage} theme={theme} onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))} />

      <div className="app-body">
        <header className="app-header">
          <MidiStatus
            isSupported={midi.isSupported}
            isConnected={midi.isConnected}
            devices={midi.devices}
            permissionState={midi.permissionState}
            permissionError={midi.permissionError}
            onRetry={midi.requestAccess}
          />
          <div className="lang-switcher">
            <button onClick={() => i18n.changeLanguage('zh')}>中文</button>
            <button onClick={() => i18n.changeLanguage('en')}>English</button>
            <button onClick={() => i18n.changeLanguage('ja')}>日本語</button>
          </div>
        </header>

        <main className="app-main">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
