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
    const newlyPlayed = new Set<number>()

    for (const key of Object.keys(curr)) {
      const note = Number(key)
      if ((curr[note] ?? 0) > (prev[note] ?? 0)) {
        newlyPlayed.add(note % 12)
      }
    }

    prevNotePressCount.current = { ...curr }
    if (newlyPlayed.size > 0) {
      setRecentPCs((current) => new Set([...current, ...newlyPlayed]))
    }
  }, [midi.notePressCount])

  const recentPitchClasses = Array.from(recentPCs)

  const scaleMatches = recognizeScales(recentPitchClasses)

  const reset = (): void => {
    setRecentPCs(new Set())
    prevNotePressCount.current = { ...midi.notePressCount }
  }

  return { recentPitchClasses, scaleMatches, reset }
}
