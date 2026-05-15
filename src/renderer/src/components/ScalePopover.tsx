import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScaleMatch } from '../utils/scaleRecognition'
import './ScalePopover.css'

interface Props {
  matches: ScaleMatch[]
  pitchCount: number
}

export function ScalePopover({ matches, pitchCount }: Props): JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const topMatch = matches[0]

  return (
    <div className="scale-popover-wrap" ref={ref}>
      <button
        className={`scale-trigger ${open ? 'scale-trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={t('scale.title')}
      >
        <span className="scale-trigger-label">{t('scale.title')}</span>
        {topMatch ? (
          <span className="scale-trigger-value">
            {topMatch.root} {t(topMatch.scaleKey)}
          </span>
        ) : (
          <span className="scale-trigger-value scale-trigger-value--empty">—</span>
        )}
        <span className="scale-trigger-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="scale-popover">
          <div className="scale-popover-title">{t('scale.title')}</div>

          {pitchCount < 3 ? (
            <div className="scale-popover-hint">
              {t('scale.needMore', { need: 3 - pitchCount })}
            </div>
          ) : matches.length === 0 ? (
            <div className="scale-popover-hint">{t('scale.noMatch')}</div>
          ) : (
            <div className="scale-list">
              {matches.map((m, i) => (
                <div
                  key={`${m.root}-${m.scaleKey}`}
                  className={`scale-item ${i === 0 ? 'scale-item--primary' : 'scale-item--secondary'}`}
                >
                  <span className="scale-name">{m.root} {t(m.scaleKey)}</span>
                  <span className="scale-cover">{Math.round(m.coverPct * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
