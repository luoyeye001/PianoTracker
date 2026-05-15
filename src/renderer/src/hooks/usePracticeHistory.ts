import { useState, useEffect, useCallback } from 'react'
import type { DailySummary } from '../types/api'
import '../types/api'

export interface UsePracticeHistoryReturn {
  dailySummary: DailySummary[]
  reload: () => void
}

export function usePracticeHistory(): UsePracticeHistoryReturn {
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([])

  const reload = useCallback(() => {
    window.api?.sessions.dailySummary()
      .then(setDailySummary)
      .catch(console.error)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { dailySummary, reload }
}
