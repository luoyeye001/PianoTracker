import { useMemo } from 'react'
import './RealtimePiano.css'

const FIRST_NOTE = 21  // A0
const LAST_NOTE  = 108 // C8

const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11])

interface KeyLayout {
  note: number
  isBlack: boolean
  leftPct: number
  widthPct: number
}

function buildLayout(): KeyLayout[] {
  const whiteIndex = new Map<number, number>()
  let wi = 0
  for (let n = FIRST_NOTE; n <= LAST_NOTE; n++) {
    if (WHITE_PCS.has(n % 12)) { whiteIndex.set(n, wi); wi++ }
  }
  const totalWhite = wi
  const wPct = 100 / totalWhite
  const bPct = wPct * 0.58

  const layout: KeyLayout[] = []
  for (let note = FIRST_NOTE; note <= LAST_NOTE; note++) {
    if (WHITE_PCS.has(note % 12)) {
      const idx = whiteIndex.get(note)!
      layout.push({ note, isBlack: false, leftPct: idx * wPct, widthPct: wPct })
    } else {
      let prev = note - 1
      while (!whiteIndex.has(prev)) prev--
      let next = note + 1
      while (!whiteIndex.has(next)) next++
      const centerPct = ((whiteIndex.get(prev)! + 1 + whiteIndex.get(next)!) / 2) * wPct
      layout.push({ note, isBlack: true, leftPct: centerPct - bPct / 2, widthPct: bPct })
    }
  }
  return layout
}

// 解析 rgba(r,g,b,a) → 根据 velocity 调整亮度
function applyVelocity(color: string, velocity: number): string {
  const t = velocity / 127  // 0=轻 1=重
  // 力度越大颜色越深（亮度缩小），力度越轻颜色越浅
  // 用 CSS color-mix 近似：在颜色和白色之间插值
  // 直接在 rgba 上操作：低力度时混入白色
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/)
  if (!m) return color
  const r = parseInt(m[1])
  const g = parseInt(m[2])
  const b = parseInt(m[3])
  const a = m[4] !== undefined ? parseFloat(m[4]) : 1
  // 低力度：颜色偏浅（向白色靠）
  const blend = 0.35 + t * 0.65  // 0.35=轻弹时只有35%颜色深度
  const nr = Math.round(r * blend + 255 * (1 - blend))
  const ng = Math.round(g * blend + 255 * (1 - blend))
  const nb = Math.round(b * blend + 255 * (1 - blend))
  return `rgba(${nr},${ng},${nb},${a})`
}

interface Props {
  activeNoteVelocities: Map<number, number>
  sustainedNotes: Set<number>
  whiteKeyPressedColor?: string
  blackKeyPressedColor?: string
  whiteKeySustainedColor?: string
  blackKeySustainedColor?: string
}

export function RealtimePiano({
  activeNoteVelocities,
  sustainedNotes,
  whiteKeyPressedColor   = 'rgba(66, 153, 225, 1)',
  blackKeyPressedColor   = 'rgba(49, 103, 170, 1)',
  whiteKeySustainedColor = 'rgba(100, 160, 230, 0.55)',
  blackKeySustainedColor = 'rgba(70, 110, 180, 0.55)',
}: Props): JSX.Element {
  const layout = useMemo(() => buildLayout(), [])

  return (
    <div className="rt-piano">
      <div className="rt-piano-keys">
        {layout.map(({ note, isBlack, leftPct, widthPct }) => {
          const velocity = activeNoteVelocities.get(note)
          const sustained = sustainedNotes.has(note)
          const pressed = velocity !== undefined

          let bg: string | undefined
          if (pressed && !sustained) {
            const base = isBlack ? blackKeyPressedColor : whiteKeyPressedColor
            bg = applyVelocity(base, velocity!)
          } else if (sustained) {
            bg = isBlack ? blackKeySustainedColor : whiteKeySustainedColor
          }

          return (
            <div
              key={note}
              className={`rt-key ${isBlack ? 'rt-key--black' : 'rt-key--white'}`}
              style={{
                left:  `${leftPct}%`,
                width: `${widthPct}%`,
                // backgroundImage 叠加在 CSS background-color 之上，alpha 才能真正透出键的原色
                ...(bg ? { backgroundImage: `linear-gradient(${bg}, ${bg})` } : {})
              }}
              title={`MIDI ${note}${velocity !== undefined ? ` · vel ${velocity}` : ''}`}
            />
          )
        })}
      </div>
    </div>
  )
}
