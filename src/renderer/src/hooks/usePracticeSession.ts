import { useState, useEffect, useRef, useCallback } from 'react'
import '../types/api'
import { toLocalDateString } from '../utils/date'

export interface SessionMetrics {
  notePresses?: number
  uniqueNotes?: number
  chordsRecognized?: number
  songId?: number | null
}

export interface UsePracticeSessionReturn {
  isActive: boolean
  elapsed: number
  startTime: Date | null
  start: () => void
  stop: (metrics?: SessionMetrics) => void
}

export function usePracticeSession(onSaved?: () => void): UsePracticeSessionReturn {
  const [isActive, setIsActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isActiveRef = useRef(false)
  const onSavedRef = useRef(onSaved)

  useEffect(() => {
    onSavedRef.current = onSaved
  }, [onSaved])

  const start = useCallback(() => {
    if (isActiveRef.current) return
    const now = new Date()
    isActiveRef.current = true
    startTimeRef.current = now
    setStartTime(now)
    setElapsed(0)
    setIsActive(true)
  }, [])

  const stop = useCallback((metrics: SessionMetrics = {}) => {
    if (!isActiveRef.current) return
    isActiveRef.current = false
    setIsActive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const st = startTimeRef.current
    startTimeRef.current = null
    setStartTime(null)
    if (!st) return

    const endedAt = Date.now()
    const startedAt = st.getTime()
    const durationS = Math.round((endedAt - startedAt) / 1000)
    if (durationS < 5) return

    const date = toLocalDateString(st)

    const saveRequest = window.api?.sessions.save({
      date,
      started_at: startedAt,
      ended_at: endedAt,
      duration_s: durationS,
      note_presses: metrics.notePresses ?? 0,
      unique_notes: metrics.uniqueNotes ?? 0,
      chords_recognized: metrics.chordsRecognized ?? 0,
      song_id: metrics.songId ?? null
    })
    saveRequest?.then(() => onSavedRef.current?.()).catch(console.error)
  }, [])

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive])

  return { isActive, elapsed, startTime, start, stop }
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
