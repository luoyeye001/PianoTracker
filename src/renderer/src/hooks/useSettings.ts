import { useState, useCallback } from 'react'
import type { ChordieKeyCenter } from '../utils/chordRecognition'

export interface ObsConfig {
  showChord: boolean
  showLastChord: boolean
  showTimer: boolean
  showStreak: boolean
  showTodayMin: boolean
  showDot: boolean
  showPiano: boolean
  fontSize: number        // 和弦主字体大小 px，默认 36
  theme: 'dark' | 'light' | 'minimal'
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  bgOpacity: number       // 背景不透明度 0-100
  // OBS 独立键色
  pianoWhitePressed: string
  pianoBlackPressed: string
  pianoWhiteSustained: string
  pianoBlackSustained: string
}

export interface Settings {
  minHoldMs: number
  chordKeyCenter: ChordieKeyCenter
  whiteKeyPressedColor: string
  blackKeyPressedColor: string
  whiteKeySustainedColor: string
  blackKeySustainedColor: string
  obs: ObsConfig
}

const DEFAULTS: Settings = {
  minHoldMs: 300,
  chordKeyCenter: 0,
  whiteKeyPressedColor:   'rgba(66, 153, 225, 1)',
  blackKeyPressedColor:   'rgba(49, 103, 170, 1)',
  whiteKeySustainedColor: 'rgba(100, 160, 230, 0.55)',
  blackKeySustainedColor: 'rgba(70,  110, 180, 0.55)',
  obs: {
    showChord:     true,
    showLastChord: true,
    showTimer:     true,
    showStreak:    true,
    showTodayMin:  true,
    showDot:       true,
    showPiano:     true,
    fontSize:      36,
    theme:         'dark',
    position:      'bottom-left',
    bgOpacity:     72,
    pianoWhitePressed:   'rgba(66,153,225,1)',
    pianoBlackPressed:   'rgba(49,103,170,1)',
    pianoWhiteSustained: 'rgba(100,160,230,0.55)',
    pianoBlackSustained: 'rgba(70,110,180,0.55)',
  }
}

const STORAGE_KEY = 'pianotracker_settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeKeyCenter(value: unknown): ChordieKeyCenter {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 15
    ? value as ChordieKeyCenter
    : DEFAULTS.chordKeyCenter
}

function normalizeMinHoldMs(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1000, Math.max(50, Math.round(value)))
    : DEFAULTS.minHoldMs
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (!isRecord(parsed)) return { ...DEFAULTS, obs: { ...DEFAULTS.obs } }
      const parsedObs = isRecord(parsed.obs) ? parsed.obs : {}
      return {
        ...DEFAULTS,
        ...parsed,
        minHoldMs: normalizeMinHoldMs(parsed.minHoldMs),
        chordKeyCenter: normalizeKeyCenter(parsed.chordKeyCenter),
        obs: { ...DEFAULTS.obs, ...parsedObs }
      }
    }
  } catch {}
  return { ...DEFAULTS, obs: { ...DEFAULTS.obs } }
}

function save(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

export interface UseSettingsReturn {
  settings: Settings
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  updateObs: <K extends keyof ObsConfig>(key: K, value: ObsConfig[K]) => void
  reset: () => void
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(load)

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      save(next)
      return next
    })
  }, [])

  const updateObs = useCallback(<K extends keyof ObsConfig>(key: K, value: ObsConfig[K]) => {
    setSettings((prev) => {
      const next = { ...prev, obs: { ...prev.obs, [key]: value } }
      save(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    save(DEFAULTS)
    setSettings({ ...DEFAULTS, obs: { ...DEFAULTS.obs } })
  }, [])

  return { settings, update, updateObs, reset }
}
