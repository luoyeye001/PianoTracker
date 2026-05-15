import { useTranslation } from 'react-i18next'
import type { ScaleMatch } from '../utils/scaleRecognition'
import './ScalePanel.css'

interface Props {
  matches: ScaleMatch[]
  pitchCount: number   // 已分析的音级数量
  compact?: boolean    // 紧凑模式（练习页用）
}

export function ScalePanel({ matches, pitchCount, compact = false }: Props): JSX.Element {
  const { t } = useTranslation()

  if (pitchCount < 3) {
    return (
      <div className={`scale-panel ${compact ? 'scale-panel--compact' : ''}`}>
        <div className="scale-panel-label">{t('scale.title')}</div>
        <div className="scale-panel-hint">
          {t('scale.needMore', { need: 3 - pitchCount })}
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className={`scale-panel ${compact ? 'scale-panel--compact' : ''}`}>
        <div className="scale-panel-label">{t('scale.title')}</div>
        <div className="scale-panel-hint">{t('scale.noMatch')}</div>
      </div>
    )
  }

  return (
    <div className={`scale-panel ${compact ? 'scale-panel--compact' : ''}`}>
      <div className="scale-panel-label">{t('scale.title')}</div>
      <div className="scale-list">
        {matches.map((m, i) => (
          <div
            key={`${m.root}-${m.scaleKey}`}
            className={`scale-item ${i === 0 ? 'scale-item--primary' : 'scale-item--secondary'}`}
          >
            <span className="scale-name">
              {m.root} {t(m.scaleKey)}
            </span>
            <span className="scale-cover">
              {Math.round(m.coverPct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
