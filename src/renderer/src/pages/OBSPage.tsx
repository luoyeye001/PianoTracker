import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RgbaColorPicker } from 'react-colorful'
import type { RgbaColor } from 'react-colorful'
import type { UseSettingsReturn, ObsConfig, Settings } from '../hooks/useSettings'
import './OBSPage.css'
import './SettingsPage.css'

interface Props {
  settings: UseSettingsReturn
}

// rgba 解析/序列化
function parseRgba(str: string): RgbaColor {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/)
  if (!m) return { r: 66, g: 153, b: 225, a: 1 }
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 }
}
function toRgbaStr(c: RgbaColor): string {
  return `rgba(${c.r},${c.g},${c.b},${Math.round(c.a * 100) / 100})`
}

// 开关行
function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <div className="obs-row">
      <div className="obs-row-info">
        <span className="obs-row-label">{label}</span>
        {desc && <span className="obs-row-desc">{desc}</span>}
      </div>
      <button
        className={`obs-toggle ${checked ? 'obs-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="obs-toggle-knob" />
      </button>
    </div>
  )
}

// 色盘色块（复用 SettingsPage 逻辑，但针对 ObsConfig 的键）
function ObsColorSwatch({ label, colorKey, value, onUpdate }: {
  label: string
  colorKey: keyof ObsConfig
  value: string
  onUpdate: (key: keyof ObsConfig, val: string) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="obs-color-swatch-wrap" ref={ref}>
      <button
        className="color-swatch-btn"
        style={{ background: value }}
        onClick={() => setOpen((o) => !o)}
        title={label}
      />
      {open && (
        <div className="color-picker-popover obs-color-popover">
          <RgbaColorPicker
            color={parseRgba(value)}
            onChange={(c) => onUpdate(colorKey, toRgbaStr(c))}
          />
          <div className="color-picker-value">{value}</div>
        </div>
      )}
    </div>
  )
}

export function OBSPage({ settings: { settings, update, updateObs } }: Props): JSX.Element {
  const { t } = useTranslation()
  const obs = settings.obs

  const url = 'http://localhost:7890/overlay'

  // 从练习设置同步键色到 OBS 独立键色
  const syncFromSettings = (): void => {
    updateObs('pianoWhitePressed',   settings.whiteKeyPressedColor   as ObsConfig[keyof ObsConfig] as string)
    updateObs('pianoBlackPressed',   settings.blackKeyPressedColor   as ObsConfig[keyof ObsConfig] as string)
    updateObs('pianoWhiteSustained', settings.whiteKeySustainedColor as ObsConfig[keyof ObsConfig] as string)
    updateObs('pianoBlackSustained', settings.blackKeySustainedColor as ObsConfig[keyof ObsConfig] as string)
  }

  return (
    <div className="obs-page">
      <div className="obs-inner">
        <h2 className="obs-title">OBS {t('obsView.title')}</h2>

        {/* URL */}
        <div className="obs-url-section">
          <div className="obs-url-label">{t('obsView.browserSourceUrl')}</div>
          <div className="obs-url-row">
            <code className="obs-url">{url}</code>
            <button className="obs-copy-btn" onClick={() => navigator.clipboard.writeText(url)}>
              {t('obsView.copy')}
            </button>
          </div>
          <div className="obs-url-hint">{t('obsView.urlHint')}</div>
        </div>

        {/* 显示元素 */}
        <section className="obs-section">
          <div className="obs-section-title">{t('obsView.displayElements')}</div>
          <ToggleRow label={t('obsView.showPiano')} desc={t('obsView.showPianoDesc')} checked={obs.showPiano} onChange={(v) => updateObs('showPiano', v)} />
          <ToggleRow label={t('obsView.showChord')} desc={t('obsView.showChordDesc')} checked={obs.showChord} onChange={(v) => updateObs('showChord', v)} />
          <ToggleRow label={t('obsView.showLastChord')} checked={obs.showLastChord} onChange={(v) => updateObs('showLastChord', v)} />
          <ToggleRow label={t('obsView.showTimer')} checked={obs.showTimer} onChange={(v) => updateObs('showTimer', v)} />
          <ToggleRow label={t('obsView.showStreak')} desc={t('obsView.showStreakDesc')} checked={obs.showStreak} onChange={(v) => updateObs('showStreak', v)} />
          <ToggleRow label={t('obsView.showTodayMin')} checked={obs.showTodayMin} onChange={(v) => updateObs('showTodayMin', v)} />
          <ToggleRow label={t('obsView.showDot')} desc={t('obsView.showDotDesc')} checked={obs.showDot} onChange={(v) => updateObs('showDot', v)} />
        </section>

        {/* 钢琴键色 */}
        <section className="obs-section">
          <div className="obs-section-title">{t('obsView.pianoColorSection')}</div>

          <div className="obs-row">
            <div className="obs-row-info">
              <span className="obs-row-label">{t('settingsView.keyPressedColor')}</span>
            </div>
            <div className="obs-color-group">
              <div className="obs-color-item">
                <span className="obs-color-label">{t('settingsView.whiteKey')}</span>
                <ObsColorSwatch colorKey="pianoWhitePressed" value={obs.pianoWhitePressed} label={t('settingsView.whiteKey')} onUpdate={updateObs} />
              </div>
              <div className="obs-color-item">
                <span className="obs-color-label">{t('settingsView.blackKey')}</span>
                <ObsColorSwatch colorKey="pianoBlackPressed" value={obs.pianoBlackPressed} label={t('settingsView.blackKey')} onUpdate={updateObs} />
              </div>
            </div>
          </div>

          <div className="obs-row">
            <div className="obs-row-info">
              <span className="obs-row-label">{t('settingsView.keySustainedColor')}</span>
            </div>
            <div className="obs-color-group">
              <div className="obs-color-item">
                <span className="obs-color-label">{t('settingsView.whiteKey')}</span>
                <ObsColorSwatch colorKey="pianoWhiteSustained" value={obs.pianoWhiteSustained} label={t('settingsView.whiteKey')} onUpdate={updateObs} />
              </div>
              <div className="obs-color-item">
                <span className="obs-color-label">{t('settingsView.blackKey')}</span>
                <ObsColorSwatch colorKey="pianoBlackSustained" value={obs.pianoBlackSustained} label={t('settingsView.blackKey')} onUpdate={updateObs} />
              </div>
            </div>
          </div>

          <button className="obs-sync-btn" onClick={syncFromSettings}>
            {t('obsView.syncFromSettings')}
          </button>
        </section>

        {/* 样式 */}
        <section className="obs-section">
          <div className="obs-section-title">{t('obsView.styleSection')}</div>

          <div className="obs-row">
            <div className="obs-row-info"><span className="obs-row-label">{t('obsView.theme')}</span></div>
            <div className="obs-segment">
              {(['dark', 'light', 'minimal'] as ObsConfig['theme'][]).map((th) => (
                <button key={th} className={`obs-segment-btn ${obs.theme === th ? 'obs-segment-btn--active' : ''}`} onClick={() => updateObs('theme', th)}>
                  {t(`obsView.theme_${th}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="obs-row">
            <div className="obs-row-info"><span className="obs-row-label">{t('obsView.position')}</span></div>
            <div className="obs-segment">
              {(['bottom-left', 'bottom-right', 'top-left', 'top-right'] as ObsConfig['position'][]).map((pos) => (
                <button key={pos} className={`obs-segment-btn ${obs.position === pos ? 'obs-segment-btn--active' : ''}`} onClick={() => updateObs('position', pos)}>
                  {t(`obsView.pos_${pos.replace('-', '_')}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="obs-row">
            <div className="obs-row-info"><span className="obs-row-label">{t('obsView.fontSize')}</span></div>
            <div className="obs-slider-row">
              <input type="range" min={20} max={72} step={2} value={obs.fontSize} onChange={(e) => updateObs('fontSize', Number(e.target.value))} className="obs-slider" />
              <span className="obs-slider-val">{obs.fontSize}px</span>
            </div>
          </div>

          <div className="obs-row">
            <div className="obs-row-info"><span className="obs-row-label">{t('obsView.bgOpacity')}</span></div>
            <div className="obs-slider-row">
              <input type="range" min={0} max={100} step={5} value={obs.bgOpacity} onChange={(e) => updateObs('bgOpacity', Number(e.target.value))} className="obs-slider" />
              <span className="obs-slider-val">{obs.bgOpacity}%</span>
            </div>
          </div>
        </section>

        <div className="obs-preview-hint">{t('obsView.previewHint')}</div>
      </div>
    </div>
  )
}
