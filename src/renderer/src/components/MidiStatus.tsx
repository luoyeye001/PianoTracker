import { useTranslation } from 'react-i18next'
import type { MidiDevice } from '../hooks/useMidi'
import './MidiStatus.css'

interface Props {
  isSupported: boolean
  isConnected: boolean
  devices: MidiDevice[]
  permissionState: string
  onRetry: () => void
}

export function MidiStatus({ isSupported, isConnected, devices, permissionState, onRetry }: Props): JSX.Element {
  const { t } = useTranslation()

  if (!isSupported) {
    return (
      <div className="midi-status midi-status--error">
        <span className="midi-dot" />
        {t('midi.notSupported')}
      </div>
    )
  }

  if (permissionState === 'denied') {
    return (
      <div className="midi-status midi-status--error">
        <span className="midi-dot" />
        {t('midi.denied')}
        <button onClick={onRetry}>{t('midi.retry')}</button>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="midi-status midi-status--waiting">
        <span className="midi-dot midi-dot--pulse" />
        {t('midi.waiting')}
      </div>
    )
  }

  return (
    <div className="midi-status midi-status--connected">
      <span className="midi-dot midi-dot--on" />
      {devices[0].name}
    </div>
  )
}
