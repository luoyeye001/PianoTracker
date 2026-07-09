// Chord recognition utilities.
// Pattern catalogue is Chordie-inspired: exact pitch-class set matching across
// every possible played root, with scored candidates and alternate names.

export interface ChordResult {
  name: string
  root: string
  quality: string
  qualityKey: string
  inversion: number
  notes: string[]
  bass?: string
  intervals?: number[]
  alternates?: ChordResult[]
}

interface ChordPattern {
  intervals: number[]
  quality: string
  qualityKey: string
  priority: number
}

interface ChordCandidate extends ChordResult {
  score: number
  sourceIndex: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const INTERVAL_NAMES = ['Unison', 'minor 2nd', 'Major 2nd', 'minor 3rd', 'Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th', 'minor 6th', 'Major 6th', 'minor 7th', 'Major 7th']

function pc(n: number): number {
  return ((n % 12) + 12) % 12
}

function normalized(values: number[]): number[] {
  return [...new Set(values.map(pc))].sort((a, b) => a - b)
}

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function chordKey(quality: string): string {
  switch (quality) {
    case '': return 'chord.maj'
    case 'm': return 'chord.min'
    case 'dim': return 'chord.dim'
    case 'aug': return 'chord.aug'
    case 'sus4': return 'chord.sus4'
    case 'sus2': return 'chord.sus2'
    case 'maj7': return 'chord.maj7'
    case '7': return 'chord.dom7'
    case 'm7': return 'chord.min7'
    case 'mM7': return 'chord.minMaj7'
    case 'm7b5': return 'chord.halfDim'
    case 'dim7': return 'chord.dim7'
    case 'aug7':
    case '7#5': return 'chord.aug7'
    case '6': return 'chord.maj6'
    case 'm6': return 'chord.min6'
    case '9': return 'chord.dom9'
    case 'maj9': return 'chord.maj9'
    case 'm9': return 'chord.min9'
    default: return quality
  }
}

function pattern(intervals: number[], quality: string, priority: number): ChordPattern {
  return { intervals: normalized(intervals), quality, qualityKey: chordKey(quality), priority }
}

const CHORD_PATTERNS: ChordPattern[] = [
  // Core triads
  pattern([0, 4, 7], '', 130),
  pattern([0, 3, 7], 'm', 130),
  pattern([0, 3, 6], 'dim', 118),
  pattern([0, 4, 8], 'aug', 118),
  pattern([0, 2, 7], 'sus2', 112),
  pattern([0, 5, 7], 'sus4', 112),
  pattern([0, 7], '5', 70),
  pattern([0, 4, 6], 'maj(b5)', 96),
  pattern([0, 2, 4], 'add2', 92),
  pattern([0, 4, 5], 'add4', 88),
  pattern([0, 1, 4], 'addb9', 80),
  pattern([0, 2, 3], 'm(add2)', 88),
  pattern([0, 3, 5], 'm(add4)', 88),

  // Sixths
  pattern([0, 4, 7, 9], '6', 122),
  pattern([0, 3, 7, 9], 'm6', 122),
  pattern([0, 2, 4, 7, 9], '6/9', 108),
  pattern([0, 2, 3, 7, 9], 'm6/9', 108),
  pattern([0, 4, 6, 7, 9], '6(#11)', 86),
  pattern([0, 2, 4, 6, 7, 9], '6/9(#11)', 82),

  // Sevenths
  pattern([0, 4, 7, 11], 'maj7', 126),
  pattern([0, 4, 7, 10], '7', 126),
  pattern([0, 3, 7, 10], 'm7', 126),
  pattern([0, 3, 7, 11], 'mM7', 112),
  pattern([0, 3, 6, 10], 'm7b5', 122),
  pattern([0, 3, 6, 9], 'dim7', 122),
  pattern([0, 4, 8, 10], '7#5', 110),
  pattern([0, 4, 6, 10], '7b5', 110),
  pattern([0, 5, 7, 10], '7sus4', 114),
  pattern([0, 2, 7, 10], '7sus2', 102),
  pattern([0, 4, 10], '7(no5)', 78),
  pattern([0, 7, 10], '7(no3)', 76),
  pattern([0, 4, 11], 'maj7(no5)', 76),
  pattern([0, 7, 11], 'maj7(no3)', 74),
  pattern([0, 3, 10], 'm7(no5)', 74),
  pattern([0, 5, 10], '7sus4(no5)', 72),
  pattern([0, 4, 5, 7, 10], '7(add11)', 92),

  // Ninths and elevenths. These use pitch classes, so 9ths are 2, not 14.
  pattern([0, 2, 4, 7, 10], '9', 120),
  pattern([0, 2, 4, 7, 11], 'maj9', 116),
  pattern([0, 2, 3, 7, 10], 'm9', 116),
  pattern([0, 2, 5, 7, 10], '9sus4', 104),
  pattern([0, 2, 5, 10], '9sus4(add3)', 82),
  pattern([0, 2, 4, 10], '7(9)', 88),
  pattern([0, 2, 4, 6, 7, 10], '9(#11)', 92),
  pattern([0, 2, 4, 8, 10], '9(#5)', 86),
  pattern([0, 2, 4, 7, 9, 10], '9(13)', 92),
  pattern([0, 2, 4, 6, 7, 9, 10], '9(13)#11', 84),
  pattern([0, 2, 3, 5, 7, 10], 'm9(11)', 96),
  pattern([0, 2, 3, 7, 9, 10], 'm9(13)', 88),
  pattern([0, 3, 5, 7, 10], 'm7(11)', 96),

  // Common alterations and altered dominants
  pattern([0, 1, 4, 7, 10], '7(b9)', 100),
  pattern([0, 3, 4, 7, 10], '7(#9)', 100),
  pattern([0, 4, 6, 7, 10], '7(#11)', 96),
  pattern([0, 1, 4, 10], '7b9(no5)', 78),
  pattern([0, 3, 4, 10], '7#9(no5)', 78),
  pattern([0, 4, 9, 10], '7(13 no5)', 78),
  pattern([0, 1, 3, 4, 7, 10], '7(b9#9)', 90),
  pattern([0, 3, 4, 6, 7, 10], '7(#9#11)', 88),
  pattern([0, 1, 4, 6, 7, 10], '7(b9#11)', 88),
  pattern([0, 1, 3, 4, 6, 7, 10], '7(b9#9#11)', 82),
  pattern([0, 3, 4, 8, 10], '7(#9#5)', 86),
  pattern([0, 1, 4, 8, 10], '7(b9#5)', 86),
  pattern([0, 3, 4, 6, 10], '7(#9b5)', 84),
  pattern([0, 1, 4, 6, 10], '7(b9b5)', 84),
  pattern([0, 1, 4, 6, 8, 10], '7alt', 94),
  pattern([0, 1, 3, 4, 6, 8, 10], '7alt(add5)', 74),

  // Major extensions
  pattern([0, 4, 6, 7, 11], 'maj7(#11)', 98),
  pattern([0, 4, 6, 11], 'maj7b5', 90),
  pattern([0, 4, 8, 11], 'maj7#5', 90),
  pattern([0, 2, 4, 6, 7], 'add2(#11)', 84),
  pattern([0, 2, 4, 6, 7, 11], 'maj9(#11)', 96),
  pattern([0, 2, 4, 7, 9, 11], 'maj9(13)', 90),
  pattern([0, 2, 4, 6, 7, 9, 11], 'maj13(#11)', 84),

  // Minor and diminished extensions
  pattern([0, 2, 3, 7, 11], 'm(maj9)', 86),
  pattern([0, 2, 3, 7, 9, 11], 'm(maj9/13)', 78),
  pattern([0, 3, 6, 10, 2], 'm7b5(9)', 82),
  pattern([0, 3, 6, 10, 5], 'm7b5(11)', 82),
  pattern([0, 1, 3, 6, 8, 10], 'm7b5(b9b13)', 70),
  pattern([0, 3, 6, 11], 'dim(maj7)', 82),
  pattern([0, 2, 3, 6, 9], 'dim7(9)', 76),
  pattern([0, 3, 5, 6, 9], 'dim7(11)', 74),
  pattern([0, 2, 3, 5, 6, 9], 'dim7(9/11)', 68),

  // 13ths and sus extensions
  pattern([0, 4, 7, 9, 10], '13', 94),
  pattern([0, 1, 4, 7, 9, 10], '13(b9)', 84),
  pattern([0, 3, 4, 7, 9, 10], '13(#9)', 84),
  pattern([0, 4, 6, 7, 9, 10], '13#11', 82),
  pattern([0, 2, 5, 7, 10], '13sus', 84),
  pattern([0, 2, 5, 7, 9, 10], '13sus', 82),
  pattern([0, 1, 5, 7, 10], '13sus(b9)', 78),
  pattern([0, 2, 4, 5, 7, 10], '13sus4(add3)', 74),

  // Scale-like Chordie names, deliberately low priority.
  pattern([0, 2, 4, 5, 7, 9], 'Ionian(Sus4)', 20),
  pattern([0, 2, 3, 5, 7, 9], 'Melodic Minor', 18),
  pattern([0, 2, 3, 5, 7, 8], 'Harmonic Minor', 18)
]

function intervalsFrom(root: number, notes: number[]): number[] {
  return normalized(notes.map((n) => n - root))
}

function inversionFor(rootPc: number, intervals: number[], lowestPc: number): number {
  const chordPcs = intervals.map((i) => pc(rootPc + i))
  return Math.max(0, chordPcs.indexOf(lowestPc))
}

function resultName(root: string, quality: string): string {
  return quality ? `${root}${quality}` : root
}

function score(pattern: ChordPattern, sourceIndex: number, rootPc: number, lowestPc: number, pitchClasses: number[]): number {
  let value = pattern.priority + pattern.intervals.length * 2 - sourceIndex / 1000
  if (rootPc === lowestPc) value += 18
  const rootOrder = pitchClasses.indexOf(rootPc)
  if (rootOrder >= 0) value -= rootOrder * 0.25
  return value
}

function stripCandidate(candidate: ChordCandidate): ChordResult {
  const { score: _score, sourceIndex: _sourceIndex, ...result } = candidate
  return result
}

function intervalFallback(midiNotes: number[], pitchClasses: number[]): ChordResult | null {
  if (pitchClasses.length !== 2) return null
  const sorted = [...midiNotes].sort((a, b) => a - b)
  const rootPc = pc(sorted[0])
  const interval = pc(pc(sorted[sorted.length - 1]) - rootPc)
  if (interval === 0) return null
  const root = NOTE_NAMES[rootPc]
  const quality = INTERVAL_NAMES[interval]
  return {
    name: `${root} ${quality}`,
    root,
    quality,
    qualityKey: quality,
    inversion: 0,
    notes: pitchClasses.map((n) => NOTE_NAMES[n]),
    bass: root,
    intervals: [0, interval]
  }
}

export function recognizeChordCandidates(midiNotes: number[]): ChordResult[] {
  if (midiNotes.length < 2) return []
  const pitchClasses = normalized(midiNotes)
  if (pitchClasses.length < 2) return []

  const lowestPc = pc(Math.min(...midiNotes))
  const candidates: ChordCandidate[] = []

  pitchClasses.forEach((rootPc) => {
    const intervals = intervalsFrom(rootPc, pitchClasses)
    CHORD_PATTERNS.forEach((candidatePattern, sourceIndex) => {
      if (!sameSet(intervals, candidatePattern.intervals)) return
      const root = NOTE_NAMES[rootPc]
      const bass = NOTE_NAMES[lowestPc]
      candidates.push({
        name: resultName(root, candidatePattern.quality),
        root,
        quality: candidatePattern.quality,
        qualityKey: candidatePattern.qualityKey,
        inversion: inversionFor(rootPc, candidatePattern.intervals, lowestPc),
        notes: pitchClasses.map((n) => NOTE_NAMES[n]),
        bass,
        intervals: candidatePattern.intervals,
        score: score(candidatePattern, sourceIndex, rootPc, lowestPc, pitchClasses),
        sourceIndex
      })
    })
  })

  const byName = new Map<string, ChordCandidate>()
  candidates.forEach((candidate) => {
    const key = `${candidate.name}/${candidate.bass ?? ''}`
    const previous = byName.get(key)
    if (!previous || candidate.score > previous.score) byName.set(key, candidate)
  })

  const sorted = [...byName.values()].sort((a, b) => b.score - a.score)
  if (sorted.length > 0) return sorted.map(stripCandidate)

  const interval = intervalFallback(midiNotes, pitchClasses)
  return interval ? [interval] : []
}

export function recognizeChord(midiNotes: number[]): ChordResult | null {
  const candidates = recognizeChordCandidates(midiNotes)
  if (candidates.length === 0) return null
  return { ...candidates[0], alternates: candidates.slice(1, 8) }
}

export function inversionKey(inversion: number): string {
  switch (inversion) {
    case 0: return 'chord.rootPosition'
    case 1: return 'chord.first'
    case 2: return 'chord.second'
    case 3: return 'chord.third'
    case 4: return 'chord.fourth'
    case 5: return 'chord.fifth'
    case 6: return 'chord.sixth'
    default: return ''
  }
}
