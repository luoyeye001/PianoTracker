import { useState, useEffect, useRef, useCallback } from 'react'
import '../types/api'

export interface UsePracticeSessionReturn {
  isActive: boolean
  elapsed: number
  startTime: Date | null
  start: () => void
  stop: (notePresses?: number) => void
}

export function usePracticeSession(): UsePracticeSessionReturn {
  const [isActive, setIsActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    const now = new Date()
    startTimeRef.current = now
    setStartTime(now)
    setElapsed(0)
    setIsActive(true)
  }, [])

  const stop = useCallback((notePresses = 0) => {
    setIsActive(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const st = startTimeRef.current
    if (!st) return

    const endedAt = Date.now()
    const startedAt = st.getTime()
    const durationS = Math.round((endedAt - startedAt) / 1000)
    if (durationS < 5) return   // 少于5秒不记录

    const date = st.toISOString().slice(0, 10)  // YYYY-MM-DD

    window.api?.sessions.save({
      date,
      started_at: startedAt,
      ended_at: endedAt,
      duration_s: durationS,
      note_presses: notePresses,
      song_id: null
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
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
