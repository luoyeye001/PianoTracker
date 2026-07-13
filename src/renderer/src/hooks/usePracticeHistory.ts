import { useState, useEffect, useCallback } from 'react'
import type { DailySummary } from '../types/api'
import { toLocalDateString } from '../utils/date'
import '../types/api'

export interface UsePracticeHistoryReturn {
  dailySummary: DailySummary[]
  reload: () => void
  recordNotePress: (note: number) => void
}

export function usePracticeHistory(): UsePracticeHistoryReturn {
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([])

  const reload = useCallback(() => {
    window.api?.sessions.dailySummary()
      .then(setDailySummary)
      .catch(console.error)
  }, [])

  useEffect(() => { reload() }, [reload])

  const recordNotePress = useCallback((note: number) => {
    const date = toLocalDateString()
    window.api?.stats.recordNotePress(date, note)
      .then((summary) => {
        setDailySummary((current) => {
          const existing = current.find((entry) => entry.date === summary.date)
          const merged = existing
            ? {
                date: summary.date,
                total_s: Math.max(existing.total_s, summary.total_s),
                total_presses: Math.max(existing.total_presses, summary.total_presses),
                total_unique_notes: Math.max(existing.total_unique_notes, summary.total_unique_notes),
                total_chords_recognized: Math.max(existing.total_chords_recognized, summary.total_chords_recognized),
                count: Math.max(existing.count, summary.count)
              }
            : summary
          return [...current.filter((entry) => entry.date !== summary.date), merged]
            .sort((a, b) => a.date.localeCompare(b.date))
        })
      })
      .catch(console.error)
  }, [])

  return { dailySummary, reload, recordNotePress }
}
