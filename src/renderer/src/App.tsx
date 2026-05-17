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
import './styles/App.css'

function App(): JSX.Element {
  const { t, i18n } = useTranslation()
  const midi = useMidi()
  const session = usePracticeSession()
  const settingsHook = useSettings()
  const scaleAnalysis = useScaleAnalysis(midi)
  const { dailySummary } = usePracticeHistory()
  const [page, setPage] = useState<Page>('practice')
  const [activeSongId, setActiveSongId] = useState<number | null>(null)
  const [activeSongTitle, setActiveSongTitle] = useState('')
  const sessionStartCountsRef = useRef<Record<number, number>>({})
  const sessionChordCountRef = useRef(0)

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

  // OBS 状态推送（每秒）
  const lastChordRef = useRef('')
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todaySummary = dailySummary.find((d) => d.date === today)
    const todayMin = todaySummary ? Math.round(todaySummary.total_s / 60) : 0

    // 连续天数
    const sorted = [...dailySummary].sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    let expected = today
    for (const d of sorted) {
      if (d.date === expected) {
        streak++
        const dt = new Date(expected + 'T00:00:00')
        dt.setDate(dt.getDate() - 1)
        expected = dt.toISOString().slice(0, 10)
      } else break
    }

    const chord = recognizeChord(Array.from(midi.activeNotes))

    // Map → plain object for IPC serialization
    const activeNotesObj: Record<number, number> = {}
    midi.activeNoteVelocities.forEach((vel, note) => { activeNotesObj[note] = vel })

    window.api?.obs.update({
      isConnected: midi.isConnected,
      isSessionActive: session.isActive,
      elapsed: session.elapsed,
      currentChord: chord?.name ?? '',
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

    if (chord?.name) lastChordRef.current = chord.name
  }, [midi.activeNotes, midi.activeNoteVelocities, midi.sustainedNotes, midi.isConnected, session.isActive, session.elapsed, dailySummary, settingsHook.settings, activeSongTitle, t])

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
          onActiveSongChange={(id, title) => { setActiveSongId(id); setActiveSongTitle(title) }}
          onConfirmedChord={handleConfirmedChord}
        />
      )
      case 'stats':    return <StatsPage midi={midi} scaleAnalysis={scaleAnalysis} />
      case 'songs':    return <SongsPage />
      case 'calendar': return <CalendarPage />
      case 'obs':      return <OBSPage settings={settingsHook} />
      case 'settings': return <SettingsPage settings={settingsHook} />
    }
  }

  return (
    <div className="app">
      <Sidebar current={page} onChange={setPage} />

      <div className="app-body">
        <header className="app-header">
          <MidiStatus
            isSupported={midi.isSupported}
            isConnected={midi.isConnected}
            devices={midi.devices}
            permissionState={midi.permissionState}
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
