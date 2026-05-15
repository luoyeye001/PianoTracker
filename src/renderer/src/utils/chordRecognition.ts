// 和弦识别工具

export interface ChordResult {
  name: string         // 完整名称，如 "Cmaj7"
  root: string         // 根音，如 "C"
  quality: string      // 品质符号，如 "maj7"
  qualityKey: string   // i18n key，如 "chord.maj7"
  inversion: number    // 0=原位, 1=第一转位 …
  notes: string[]
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// [音程模式, 品质符号, i18n key]
const CHORD_PATTERNS: [number[], string, string][] = [
  [[4, 7],         '',      'chord.maj'],
  [[3, 7],         'm',     'chord.min'],
  [[3, 6],         'dim',   'chord.dim'],
  [[4, 8],         'aug',   'chord.aug'],
  [[5, 7],         'sus4',  'chord.sus4'],
  [[2, 7],         'sus2',  'chord.sus2'],
  [[4, 7, 11],     'maj7',  'chord.maj7'],
  [[4, 7, 10],     '7',     'chord.dom7'],
  [[3, 7, 10],     'm7',    'chord.min7'],
  [[3, 7, 11],     'mM7',   'chord.minMaj7'],
  [[3, 6, 10],     'm7b5',  'chord.halfDim'],
  [[3, 6, 9],      'dim7',  'chord.dim7'],
  [[4, 8, 10],     'aug7',  'chord.aug7'],
  [[4, 7, 9],      '6',     'chord.maj6'],
  [[3, 7, 9],      'm6',    'chord.min6'],
  [[4, 7, 10, 14], '9',     'chord.dom9'],
  [[4, 7, 11, 14], 'maj9',  'chord.maj9'],
  [[3, 7, 10, 14], 'm9',    'chord.min9'],
]

function intervalsFrom(root: number, notes: number[]): number[] {
  return notes
    .map((n) => ((n - root) % 12 + 12) % 12)
    .filter((i) => i !== 0)
    .sort((a, b) => a - b)
}

export function recognizeChord(midiNotes: number[]): ChordResult | null {
  if (midiNotes.length < 2) return null
  const pitchClasses = [...new Set(midiNotes.map((n) => n % 12))].sort((a, b) => a - b)
  if (pitchClasses.length < 2) return null

  for (const [pattern, quality, qualityKey] of CHORD_PATTERNS) {
    for (const rootPc of pitchClasses) {
      const intervals = intervalsFrom(rootPc, pitchClasses)
      if (intervals.length === pattern.length && intervals.every((v, i) => v === pattern[i])) {
        const root = NOTE_NAMES[rootPc]
        const name = `${root}${quality}`
        const lowestPc = midiNotes.reduce((a, b) => (a < b ? a : b)) % 12
        const chordNotesPc = [rootPc, ...pattern.map((i) => (rootPc + i) % 12)]
        const inversion = Math.max(0, chordNotesPc.indexOf(lowestPc))
        const notes = pitchClasses.map((pc) => NOTE_NAMES[pc])
        return { name, root, quality, qualityKey, inversion, notes }
      }
    }
  }
  return null
}

// 返回转位的 i18n key
export function inversionKey(inversion: number): string {
  switch (inversion) {
    case 0:  return 'chord.rootPosition'
    case 1:  return 'chord.first'
    case 2:  return 'chord.second'
    case 3:  return 'chord.third'
    default: return ''
  }
}
