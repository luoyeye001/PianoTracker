import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MidiDevice } from '../hooks/useMidi'
import './MidiStatus.css'

interface Props {
  isSupported: boolean
  isConnected: boolean
  devices: MidiDevice[]
  permissionState: string
  permissionError?: string | null
  onRetry: () => void
}

type StatusTone = 'connected' | 'waiting' | 'error'

export function MidiStatus({ isSupported, isConnected, devices, permissionState, permissionError, onRetry }: Props): JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const status = useMemo((): { tone: StatusTone; label: string; detail: string | null } => {
    if (!isSupported) {
      return { tone: 'error', label: t('midi.notSupportedShort'), detail: t('midi.notSupported') }
    }
    if (permissionState === 'denied') {
      return { tone: 'error', label: t('midi.deniedShort'), detail: permissionError || t('midi.denied') }
    }
    if (!isConnected) {
      return { tone: 'waiting', label: t('midi.waiting'), detail: null }
    }
    return { tone: 'connected', label: t('midi.connectedShort'), detail: devices[0]?.name || t('midi.connectedShort') }
  }, [devices, isConnected, isSupported, permissionError, permissionState, t])

  const activeDevice = devices[0]

  return (
    <div className="midi-status-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`midi-status midi-status--${status.tone}`}
        onClick={() => setOpen((next) => !next)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`midi-dot ${status.tone === 'connected' ? 'midi-dot--on' : ''} ${status.tone === 'waiting' ? 'midi-dot--pulse' : ''}`} />
        <span className="midi-status-label">{status.label}</span>
        {status.detail && <span className="midi-status-device">{status.detail}</span>}
      </button>

      {open && (
        <div className="midi-popover" role="dialog" aria-label={t('midi.detailsTitle')}>
          <div className="midi-popover-header">
            <div>
              <div className="midi-popover-title">{t('midi.detailsTitle')}</div>
              <div className={`midi-popover-state midi-popover-state--${status.tone}`}>{status.detail || status.label}</div>
            </div>
            <button type="button" className="midi-popover-retry" onClick={onRetry}>{t('midi.retry')}</button>
          </div>

          <div className="midi-detail-grid">
            <span>{t('midi.support')}</span>
            <strong>{isSupported ? t('midi.supported') : t('midi.unsupported')}</strong>
            <span>{t('midi.permission')}</span>
            <strong>{t(`midi.permission_${permissionState}`)}</strong>
            <span>{t('midi.deviceCount')}</span>
            <strong>{devices.length}</strong>
            <span>{t('midi.activeDevice')}</span>
            <strong>{activeDevice?.name || t('midi.none')}</strong>
          </div>

          {permissionError && (
            <div className="midi-error-box">
              <span>{t('midi.lastError')}</span>
              <code>{permissionError}</code>
            </div>
          )}

          <div className="midi-device-list">
            <div className="midi-device-list-title">{t('midi.detectedDevices')}</div>
            {devices.length === 0 ? (
              <div className="midi-device-empty">{t('midi.noDevices')}</div>
            ) : devices.map((device) => (
              <div className="midi-device-card" key={device.id}>
                <div className="midi-device-name">{device.name}</div>
                <div className="midi-device-meta">
                  <span>{device.manufacturer || t('midi.unknownManufacturer')}</span>
                  <span>{t('midi.portState')}: {device.state}</span>
                  <span>{t('midi.portConnection')}: {device.connection}</span>
                  {device.version && <span>{t('midi.version')}: {device.version}</span>}
                </div>
                <code className="midi-device-id">{device.id}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
