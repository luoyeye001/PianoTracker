import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RgbaColorPicker } from 'react-colorful'
import type { RgbaColor } from 'react-colorful'
import type { UseSettingsReturn, Settings } from '../hooks/useSettings'
import { CHORDIE_KEY_CENTERS, type ChordieKeyCenter } from '../utils/chordRecognition'
import './SettingsPage.css'

interface Props {
  settings: UseSettingsReturn
}

// 解析 "rgba(r,g,b,a)" → RgbaColor
function parseRgba(str: string): RgbaColor {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/)
  if (!m) return { r: 66, g: 153, b: 225, a: 1 }
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 }
}

// RgbaColor → "rgba(r,g,b,a)" 字符串
function toRgbaStr(c: RgbaColor): string {
  return `rgba(${c.r},${c.g},${c.b},${Math.round(c.a * 100) / 100})`
}

// 调色盘弹窗组件
function ColorSwatch({
  label,
  desc,
  colorKey,
  value,
  onUpdate
}: {
  label: string
  desc?: string
  colorKey: keyof Settings
  value: string
  onUpdate: (key: keyof Settings, val: string) => void
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

  const rgba = parseRgba(value)

  return (
    <div className="color-swatch-row">
      <div className="color-swatch-info">
        <span className="color-swatch-label">{label}</span>
        {desc && <span className="color-swatch-desc">{desc}</span>}
      </div>
      <div className="color-swatch-wrap" ref={ref}>
        <button
          className="color-swatch-btn"
          style={{ background: value }}
          onClick={() => setOpen((o) => !o)}
          title={label}
        />
        {open && (
          <div className="color-picker-popover">
            <RgbaColorPicker
              color={rgba}
              onChange={(c) => onUpdate(colorKey, toRgbaStr(c))}
            />
            <div className="color-picker-value">{value}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SettingsPage({ settings: { settings, update, reset } }: Props): JSX.Element {
  const { t } = useTranslation()
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    let cancelled = false

    window.api.app.getVersion()
      .then((version) => {
        if (!cancelled) setAppVersion(version)
      })
      .catch((error) => {
        console.error('Failed to get app version:', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="settings-page">
      <div className="settings-inner">
      <h2 className="settings-title">{t('settings')}</h2>

      {/* 和弦识别 */}
      <section className="settings-section">
        <div className="settings-section-title">{t('settingsView.chordSection')}</div>

        <div className="settings-row">
          <div className="settings-info">
            <div className="settings-label">{t('settingsView.minHoldLabel')}</div>
            <div className="settings-desc">{t('settingsView.minHoldDesc')}</div>
          </div>
          <div className="settings-control">
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={settings.minHoldMs}
              onChange={(e) => update('minHoldMs', Number(e.target.value))}
              className="settings-slider"
            />
            <span className="settings-value">{settings.minHoldMs} ms</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <div className="settings-label">{t('settingsView.keyCenterLabel')}</div>
            <div className="settings-desc">{t('settingsView.keyCenterDesc')}</div>
          </div>
          <div className="settings-control">
            <select
              className="settings-select"
              value={settings.chordKeyCenter}
              onChange={(e) => update('chordKeyCenter', Number(e.target.value) as ChordieKeyCenter)}
            >
              {CHORDIE_KEY_CENTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === 0 ? t('settingsView.noKey') : option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-hint">
          {settings.minHoldMs <= 150 && t('settingsView.hintSensitive')}
          {settings.minHoldMs >= 600 && t('settingsView.hintStrict')}
        </div>
      </section>

      {/* 琴键颜色 */}
      <section className="settings-section">
        <div className="settings-section-title">{t('settingsView.keyColorSection')}</div>
        <div className="settings-color-hint">{t('settingsView.keyColorHint')}</div>

        <div className="settings-color-group">
          <div className="settings-color-group-title">{t('settingsView.keyPressedColor')}</div>
          <ColorSwatch
            label={t('settingsView.whiteKey')}
            colorKey="whiteKeyPressedColor"
            value={settings.whiteKeyPressedColor}
            onUpdate={update}
          />
          <ColorSwatch
            label={t('settingsView.blackKey')}
            colorKey="blackKeyPressedColor"
            value={settings.blackKeyPressedColor}
            onUpdate={update}
          />
        </div>

        <div className="settings-color-group">
          <div className="settings-color-group-title">{t('settingsView.keySustainedColor')}</div>
          <ColorSwatch
            label={t('settingsView.whiteKey')}
            desc={t('settingsView.sustainedDesc')}
            colorKey="whiteKeySustainedColor"
            value={settings.whiteKeySustainedColor}
            onUpdate={update}
          />
          <ColorSwatch
            label={t('settingsView.blackKey')}
            colorKey="blackKeySustainedColor"
            value={settings.blackKeySustainedColor}
            onUpdate={update}
          />
        </div>
      </section>

      <button className="settings-reset" onClick={reset}>
        {t('settingsView.reset')}
      </button>

      {/* 关于 */}
      <section className="settings-section about-section">
        <div className="settings-section-title">{t('settingsView.aboutSection')}</div>
        <div className="about-row">
          <span className="about-app-name">PianoTracker</span>
          <span className="about-version">{appVersion ? `v${appVersion}` : '—'}</span>
        </div>
        <div className="about-row">
          <span className="about-label">{t('settingsView.aboutAuthor')}</span>
          <span className="about-value">桃玖</span>
        </div>
        <div className="about-row">
          <span className="about-label">{t('settingsView.aboutLicense')}</span>
          <span className="about-value">MIT</span>
        </div>
        <div className="about-row">
          <span className="about-label">GitHub</span>
          <a
            className="about-link"
            href="https://github.com/luoyeye001/PianoTracker"
            target="_blank"
            rel="noreferrer"
          >
            luoyeye001/PianoTracker
          </a>
        </div>
      </section>
      </div>
    </div>
  )
}
