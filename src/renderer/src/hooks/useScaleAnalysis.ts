import { useState, useEffect, useRef } from 'react'
import type { UseMidiReturn } from './useMidi'
import { recognizeScales, type ScaleMatch } from '../utils/scaleRecognition'

export interface UseScaleAnalysisReturn {
  recentPitchClasses: number[]  // 近期弹过的音级（去重，0-11）
  scaleMatches: ScaleMatch[]    // 匹配的调式（最多3个）
  reset: () => void
}

export function useScaleAnalysis(midi: UseMidiReturn): UseScaleAnalysisReturn {
  const [recentPCs, setRecentPCs] = useState<Set<number>>(new Set())
  const prevNotePressCount = useRef<Record<number, number>>({})

  // 每当有新的音符按下，把它的音级加入集合
  useEffect(() => {
    const prev = prevNotePressCount.current
    const curr = midi.notePressCount
    let changed = false
    const next = new Set(recentPCs)

    for (const key of Object.keys(curr)) {
      const note = Number(key)
      if ((curr[note] ?? 0) > (prev[note] ?? 0)) {
        next.add(note % 12)
        changed = true
      }
    }

    if (changed) {
      prevNotePressCount.current = { ...curr }
      setRecentPCs(new Set(next))
    }
  }, [midi.notePressCount])

  const recentPitchClasses = Array.from(recentPCs)

  const scaleMatches = recognizeScales(recentPitchClasses)

  const reset = (): void => {
    setRecentPCs(new Set())
    prevNotePressCount.current = {}
  }

  return { recentPitchClasses, scaleMatches, reset }
}
