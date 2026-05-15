import './PianoHeatmap.css'

// MIDI 音符 21 (A0) 到 108 (C8) = 88 键
const FIRST_NOTE = 21
const LAST_NOTE = 108

// 判断是否为黑键（升号）
const BLACK_KEY_OFFSETS = new Set([1, 3, 6, 8, 10]) // 在八度中的位置

function isBlackKey(note: number): boolean {
  return BLACK_KEY_OFFSETS.has(note % 12)
}

// 把按键次数映射为颜色透明度
function countToOpacity(count: number, max: number): number {
  if (count === 0 || max === 0) return 0
  return Math.min(0.15 + (count / max) * 0.85, 1)
}

interface Props {
  activeNotes: Set<number>
  notePressCount: Record<number, number>
}

export function PianoHeatmap({ activeNotes, notePressCount }: Props): JSX.Element {
  const notes = Array.from({ length: LAST_NOTE - FIRST_NOTE + 1 }, (_, i) => i + FIRST_NOTE)
  const maxCount = Math.max(0, ...Object.values(notePressCount))

  return (
    <div className="piano-heatmap">
      <div className="piano-keys">
        {notes.map((note) => {
          const black = isBlackKey(note)
          const active = activeNotes.has(note)
          const count = notePressCount[note] ?? 0
          const opacity = countToOpacity(count, maxCount)

          return (
            <div
              key={note}
              className={[
                'piano-key',
                black ? 'piano-key--black' : 'piano-key--white',
                active ? 'piano-key--active' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                count > 0 && !active
                  ? { '--heat-opacity': opacity } as React.CSSProperties
                  : undefined
              }
              title={`MIDI ${note} | 按下 ${count} 次`}
            />
          )
        })}
      </div>
      {maxCount > 0 && (
        <div className="piano-legend">
          <span>按键次数热力图</span>
          <div className="piano-legend-bar" />
          <span>{maxCount} 次</span>
        </div>
      )}
    </div>
  )
}
