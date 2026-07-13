import { CHORDIE_CHORDS, type ChordieChordDefinition } from './chordieChordCatalog'

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
  chordieIndex?: number
}

interface ProcessedNotes {
  midiNotes: number[]
  intervals: number[]
  lowestMidi: number
  lowestAIndex: number
}

interface DefinitionMatch {
  definition: ChordieChordDefinition
  definitionIndex: number
  inversion: number
}

interface InternalChordMatch {
  chordIndex: number
  rootAIndex: number
  qualityClass: number
  alternateRoot: boolean
}

interface InternalChordPair {
  primary: InternalChordMatch
  bass: InternalChordMatch
}

interface InternalVoicingPair {
  upper: InternalChordPair
  lower: InternalChordPair
  sourceNotes: number[]
}

export type ChordieKeyCenter = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15

export const CHORDIE_KEY_CENTERS: ReadonlyArray<{ value: ChordieKeyCenter; label: string }> = [
  { value: 0, label: 'No Key' },
  { value: 1, label: 'C#' },
  { value: 2, label: 'F#' },
  { value: 3, label: 'B' },
  { value: 4, label: 'E' },
  { value: 5, label: 'A' },
  { value: 6, label: 'D' },
  { value: 7, label: 'G' },
  { value: 8, label: 'C' },
  { value: 9, label: 'F' },
  { value: 10, label: 'Bb' },
  { value: 11, label: 'Eb' },
  { value: 12, label: 'Ab' },
  { value: 13, label: 'Db' },
  { value: 14, label: 'Gb' },
  { value: 15, label: 'Cb' }
]

// Exact Keys::getPitchesForKey rows, indexed from pitch A. Chordie's internal
// natural-note suffix (for example "Cn") is omitted because printChordInfo
// strips it before returning the displayed chord name.
const KEY_PITCHES = [
  ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'],
  ['A', 'A#', 'B', 'B#', 'C#', 'D', 'D#', 'E', 'E#', 'F#', 'G', 'G#'],
  ['A', 'A#', 'B', 'B#', 'C#', 'D', 'D#', 'E', 'E#', 'F#', 'G', 'G#'],
  ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
  ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
  ['A', 'Bb', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
  ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#'],
  ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'],
  ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'],
  ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'],
  ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'],
  ['A', 'Bb', 'Cb', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'],
  ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'],
  ['A', 'Bb', 'Cb', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'],
  ['A', 'Bb', 'Cb', 'C', 'Db', 'D', 'Eb', 'Fb', 'F', 'Gb', 'G', 'Ab'],
  ['A', 'Bb', 'Cb', 'C', 'Db', 'D', 'Eb', 'Fb', 'F', 'Gb', 'G', 'Ab']
] as const

const CHORDIE_DEFAULT_KEY_CENTER = 0
const CHORDIE_LOWEST_MIDI_NOTE = 21
const CHORDIE_HIGHEST_MIDI_NOTE = 108

function mod12(value: number): number {
  return ((value % 12) + 12) % 12
}

function aIndexForMidi(note: number): number {
  return mod12(note - 21)
}

function normalizeKeyCenter(keyCenter: number): ChordieKeyCenter {
  return Number.isInteger(keyCenter) && keyCenter >= 0 && keyCenter < KEY_PITCHES.length
    ? keyCenter as ChordieKeyCenter
    : CHORDIE_DEFAULT_KEY_CENTER
}

function processNotes(input: number[]): ProcessedNotes | null {
  // Detector::noteOn ignores everything outside Chordie's 88-key piano range.
  const midiNotes = [...new Set(input)]
    .filter((note) => Number.isInteger(note) && note >= CHORDIE_LOWEST_MIDI_NOTE && note <= CHORDIE_HIGHEST_MIDI_NOTE)
    .sort((a, b) => a - b)
  if (midiNotes.length === 0) return null

  const lowestMidi = midiNotes[0]
  const onlyOctaves = midiNotes.length > 1 && midiNotes.slice(1).every((note) => (note - lowestMidi) % 12 === 0)
  const intervals = onlyOctaves
    ? [0, 12]
    : [...new Set(midiNotes.map((note) => Math.abs(note - lowestMidi) % 12))].sort((a, b) => a - b)

  return { midiNotes, intervals, lowestMidi, lowestAIndex: aIndexForMidi(lowestMidi) }
}

function rotateAndShift(intervals: number[]): number[] {
  if (intervals.length === 0) return []
  const [first, ...rest] = intervals
  const rotated = [...rest, first]
  const newLowest = rotated[0]
  return rotated.map((interval) => {
    const shifted = interval - newLowest
    return shifted < 0 ? shifted + 12 : shifted
  })
}

function sameElements(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false
  const a = [...left].sort((x, y) => x - y)
  const b = [...right].sort((x, y) => x - y)
  return a.every((value, index) => value === b[index])
}

function findMatchingDefinition(intervals: number[]): DefinitionMatch | null {
  let rotated = [...intervals]

  for (let inversion = 0; inversion < intervals.length; inversion += 1) {
    for (let index = 0; index < CHORDIE_CHORDS.length; index += 1) {
      const definition = CHORDIE_CHORDS[index]
      if (inversion > 0 && !definition.checkForInversions) continue
      if (!sameElements(rotated, definition.intervals)) continue

      return {
        definition,
        definitionIndex: index,
        inversion: inversion === 0 ? definition.rootPositionOverride : inversion
      }
    }
    rotated = rotateAndShift(rotated)
  }

  return null
}

function qualityKey(definition: ChordieChordDefinition, chordIndex: number): string {
  if (chordIndex <= 0) return definition.name
  if (definition.intervals.length === 2) return definition.name
  switch (definition.qualityClass) {
    case 0: return 'chord.maj'
    case 1: return 'chord.min'
    case 2: return 'chord.dom7'
    case 3: return 'chord.dim'
    case 4: return 'chord.aug'
    default: return definition.name
  }
}

function clearMatch(): InternalChordMatch {
  return { chordIndex: -1, rootAIndex: -1, qualityClass: -1, alternateRoot: false }
}

function clearPair(): InternalChordPair {
  return { primary: clearMatch(), bass: clearMatch() }
}

function isClearPair(pair: InternalChordPair): boolean {
  return pair.primary.chordIndex === -1 && pair.primary.rootAIndex === -1 && pair.primary.qualityClass === -1 &&
    pair.bass.chordIndex === -1 && pair.bass.rootAIndex === -1 && pair.bass.qualityClass === -1
}

function pairFor(processed: ProcessedNotes): InternalChordPair {
  if (processed.intervals.length === 1) {
    return {
      primary: { chordIndex: -1, rootAIndex: processed.lowestAIndex, qualityClass: -1, alternateRoot: false },
      bass: clearMatch()
    }
  }

  const match = findMatchingDefinition(processed.intervals)
  if (!match) {
    return {
      primary: { chordIndex: 0, rootAIndex: processed.lowestAIndex, qualityClass: -1, alternateRoot: false },
      bass: clearMatch()
    }
  }

  const rootOffset = match.inversion > 0 ? (processed.intervals[match.inversion] ?? 0) : 0
  const rootAIndex = mod12(processed.lowestAIndex + rootOffset)
  const alternateRoot = match.inversion > 0

  return {
    primary: {
      chordIndex: match.definitionIndex,
      rootAIndex,
      qualityClass: match.definition.qualityClass,
      alternateRoot
    },
    bass: alternateRoot
      ? { chordIndex: -1, rootAIndex: processed.lowestAIndex, qualityClass: -1, alternateRoot: false }
      : clearMatch()
  }
}

function renderMatch(match: InternalChordMatch, noteCount: number, keyCenter: ChordieKeyCenter): string {
  if (match.rootAIndex < 0) return ''
  const spelling = KEY_PITCHES[keyCenter]
  const root = spelling[mod12(match.rootAIndex)]
  if (match.chordIndex < 0) return root
  const definition = CHORDIE_CHORDS[match.chordIndex]
  // printChordInfo uses an abbreviated alternate label whenever the complete
  // input contains at least three notes. It does not depend on inversion.
  const quality = definition.alternate && noteCount >= 3 ? definition.alternate : definition.name
  return match.chordIndex === 13 || quality === '' ? root : `${root} ${quality}`
}

function renderPair(pair: InternalChordPair, noteCount: number, keyCenter: ChordieKeyCenter): string {
  const primary = renderMatch(pair.primary, noteCount, keyCenter)
  const bass = renderMatch(pair.bass, noteCount, keyCenter)
  if (!primary) return bass
  return bass ? `${primary} / ${bass}` : primary
}

function renderVoicing(voicing: InternalVoicingPair, keyCenter: ChordieKeyCenter): string {
  // ChordNameGenerator stores the size of Detector's generated interval set,
  // rather than the number of physically held keys, in numberOfNotes.
  const noteCount = processNotes(voicing.sourceNotes)?.intervals.length ?? 0
  const upper = renderPair(voicing.upper, noteCount, keyCenter)
  const lower = renderPair(voicing.lower, noteCount, keyCenter)
  if (!upper) return lower
  // In a split voicing Chordie discards the upper group's temporary inversion
  // bass and prints the lower register group after the slash. This is why
  // E-G-A over C is shown as "A 7(no3) / C", not "A 7(no3) / E / C".
  return lower ? `${renderMatch(voicing.upper.primary, noteCount, keyCenter)} / ${lower}` : upper
}

function resultForVoicing(voicing: InternalVoicingPair, keyCenter: ChordieKeyCenter): ChordResult | null {
  const mainPair = !isClearPair(voicing.upper) ? voicing.upper : voicing.lower
  const main = mainPair.primary
  if (main.rootAIndex < 0) return null

  const definition = main.chordIndex >= 0 ? CHORDIE_CHORDS[main.chordIndex] : CHORDIE_CHORDS[0]
  const processed = processNotes(voicing.sourceNotes)
  if (!processed) return null
  const spelling = KEY_PITCHES[keyCenter]
  const root = spelling[mod12(main.rootAIndex)]
  const bass = spelling[processed.lowestAIndex]
  const bassFromRoot = mod12(processed.lowestAIndex - main.rootAIndex)
  const chordTones = [...new Set(definition.intervals.map(mod12))].sort((a, b) => a - b)
  const conventionalInversion = Math.max(0, chordTones.indexOf(bassFromRoot))

  return {
    name: renderVoicing(voicing, keyCenter),
    root,
    quality: definition.name,
    qualityKey: qualityKey(definition, main.chordIndex),
    inversion: conventionalInversion,
    notes: processed.intervals.map((interval) => spelling[mod12(processed.lowestAIndex + interval)]),
    bass,
    intervals: [...processed.intervals],
    chordieIndex: main.chordIndex
  }
}

function singleVoicing(processed: ProcessedNotes): InternalVoicingPair {
  return { upper: pairFor(processed), lower: clearPair(), sourceNotes: processed.midiNotes }
}

function generateVoicings(processed: ProcessedNotes): InternalVoicingPair[] {
  // process() branches on OutputData.intervals.size(). Pitch-class sets of at
  // most three elements are recognized once even when several octaves are
  // physically held.
  if (processed.intervals.length <= 3) return [singleVoicing(processed)]

  // This mirrors ChordNameGenerator::process: pop the highest remaining MIDI
  // note into an upper-note buffer; once the upper buffer has three notes,
  // recognize upper and lower register groups. The final iteration recognizes
  // the complete note set, so full-set matching is intentionally last.
  const lowerNotes = [...processed.midiNotes]
  const upperNotes: number[] = []
  const voicings: InternalVoicingPair[] = [singleVoicing(processed)]

  while (lowerNotes.length > 0) {
    const note = lowerNotes.pop()
    if (note === undefined) break
    upperNotes.push(note)
    if (upperNotes.length <= 2) continue

    const upperProcessed = processNotes(upperNotes)
    if (!upperProcessed) continue
    const upper = pairFor(upperProcessed)

    if (lowerNotes.length === 0) continue

    const lowerProcessed = processNotes(lowerNotes)
    if (!lowerProcessed) continue
    voicings.push({ upper, lower: pairFor(lowerProcessed), sourceNotes: processed.midiNotes })
  }

  return voicings
}

function matchIdentity(match: InternalChordMatch): string {
  return `${mod12(match.rootAIndex)}:${match.qualityClass}`
}

function composedLowerPrimary(voicing: InternalVoicingPair): InternalChordMatch {
  // In Chordie's composed VoicingPair, a root-position lower structure is
  // moved into upper.bass for slash rendering and lower is cleared. An
  // inverted lower structure remains in lower so its own bass can be printed.
  return voicing.lower.primary.alternateRoot ? voicing.lower.primary : clearMatch()
}

function voicingIdentity(voicing: InternalVoicingPair): string {
  return `${matchIdentity(voicing.upper.primary)}|${matchIdentity(composedLowerPrimary(voicing))}`
}

function repeatsSameStructure(voicing: InternalVoicingPair): boolean {
  const lower = composedLowerPrimary(voicing)
  if (lower.rootAIndex < 0) return false
  return matchIdentity(voicing.upper.primary) === matchIdentity(lower)
}

export function recognizeChordCandidates(
  midiNotes: number[],
  requestedKeyCenter: ChordieKeyCenter = CHORDIE_DEFAULT_KEY_CENTER
): ChordResult[] {
  const processed = processNotes(midiNotes)
  if (!processed || processed.intervals.length < 2) return []
  const keyCenter = normalizeKeyCenter(requestedKeyCenter)
  const seen = new Set<string>()
  return generateVoicings(processed).filter((voicing) => {
    if (repeatsSameStructure(voicing)) return false
    const key = voicingIdentity(voicing)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((voicing) => resultForVoicing(voicing, keyCenter))
    .filter((candidate): candidate is ChordResult => candidate !== null)
}

export function recognizeChord(
  midiNotes: number[],
  keyCenter: ChordieKeyCenter = CHORDIE_DEFAULT_KEY_CENTER
): ChordResult | null {
  const candidates = recognizeChordCandidates(midiNotes, keyCenter)
  if (candidates.length === 0) return null
  return { ...candidates[0], alternates: candidates.slice(1) }
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
