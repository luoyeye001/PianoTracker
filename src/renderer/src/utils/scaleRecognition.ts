// 音阶/调式识别工具
// 输入：一组音级（pitch class，0-11）
// 输出：匹配的调式列表，按匹配度排序

export interface ScaleMatch {
  root: string        // 根音，如 "D"
  scaleKey: string    // i18n key，如 "scale.dorian"
  nameEn: string      // 英文名，如 "Dorian"
  matchPct: number    // 弹过的音有多少比例在这个音阶里（0-1）
  coverPct: number    // 这个音阶有多少比例被覆盖（0-1）
  score: number       // 综合得分
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// [音阶名英文, i18n key, 音程模式（从根音开始的半音集合）]
const SCALE_PATTERNS: [string, string, number[]][] = [
  ['Major',            'scale.major',        [0, 2, 4, 5, 7, 9, 11]],
  ['Natural Minor',    'scale.minor',        [0, 2, 3, 5, 7, 8, 10]],
  ['Dorian',           'scale.dorian',       [0, 2, 3, 5, 7, 9, 10]],
  ['Phrygian',         'scale.phrygian',     [0, 1, 3, 5, 7, 8, 10]],
  ['Lydian',           'scale.lydian',       [0, 2, 4, 6, 7, 9, 11]],
  ['Mixolydian',       'scale.mixolydian',   [0, 2, 4, 5, 7, 9, 10]],
  ['Locrian',          'scale.locrian',      [0, 1, 3, 5, 6, 8, 10]],
  ['Major Pentatonic', 'scale.majorPenta',   [0, 2, 4, 7, 9]],
  ['Minor Pentatonic', 'scale.minorPenta',   [0, 3, 5, 7, 10]],
  ['Blues',            'scale.blues',        [0, 3, 5, 6, 7, 10]],
]

export function recognizeScales(
  pitchClasses: number[],   // 要分析的音级集合（0-11，已去重）
  topN = 3
): ScaleMatch[] {
  if (pitchClasses.length < 2) return []

  const played = new Set(pitchClasses)
  const results: ScaleMatch[] = []

  for (const [nameEn, scaleKey, pattern] of SCALE_PATTERNS) {
    for (let root = 0; root < 12; root++) {
      const scalePCs = new Set(pattern.map((i) => (root + i) % 12))

      // 弹过的音里有多少在这个音阶
      const matched = pitchClasses.filter((pc) => scalePCs.has(pc)).length
      const matchPct = matched / played.size

      // 这个音阶有多少被覆盖
      const coverPct = matched / scalePCs.size

      // 综合得分：优先匹配度，其次覆盖度
      // 五声音阶音少，不惩罚覆盖率低
      const score = matchPct * 0.7 + coverPct * 0.3

      if (matchPct === 1) {
        // 所有弹过的音都在这个音阶里才入选
        results.push({
          root: NOTE_NAMES[root],
          scaleKey,
          nameEn,
          matchPct,
          coverPct,
          score
        })
      }
    }
  }

  // 按综合得分排序，分数相同时五声/Blues（音少）排后面
  results.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score
    // 分数相近时，音阶越完整（覆盖率越高）越靠前
    return b.coverPct - a.coverPct
  })

  return results.slice(0, topN)
}
