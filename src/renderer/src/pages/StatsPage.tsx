import { useTranslation } from 'react-i18next'
import { PianoHeatmap } from '../components/PianoHeatmap'
import { ScalePanel } from '../components/ScalePanel'
import { usePracticeHistory } from '../hooks/usePracticeHistory'
import type { UseMidiReturn } from '../hooks/useMidi'
import type { UseScaleAnalysisReturn } from '../hooks/useScaleAnalysis'
import './StatsPage.css'

interface Props {
  midi: UseMidiReturn
  scaleAnalysis: UseScaleAnalysisReturn
}

export function StatsPage({ midi, scaleAnalysis }: Props): JSX.Element {
  const { t } = useTranslation()
  const { notePressCount, isConnected } = midi
  const { dailySummary } = usePracticeHistory()

  const totalPresses = Object.values(notePressCount).reduce((a, b) => a + b, 0)
  const uniqueNotes = Object.keys(notePressCount).length
  const todayMinutes = (() => {
    const today = new Date().toISOString().slice(0, 10)
    const entry = dailySummary.find((d) => d.date === today)
    return entry ? Math.round(entry.total_s / 60) : 0
  })()

  return (
    <div className="stats-page">
      <h2 className="stats-title">{t('statsView.title')}</h2>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{totalPresses}</div>
          <div className="stat-label">{t('statsView.totalPresses')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{uniqueNotes}</div>
          <div className="stat-label">{t('statsView.uniqueNotes')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todayMinutes > 0 ? `${todayMinutes}m` : '—'}</div>
          <div className="stat-label">{t('statsView.duration')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dailySummary.length}</div>
          <div className="stat-label">{t('statsView.practiceDays')}</div>
        </div>
      </div>

      {/* 调式分析 */}
      <div className="stats-section">
        <ScalePanel
          matches={scaleAnalysis.scaleMatches}
          pitchCount={scaleAnalysis.recentPitchClasses.length}
        />
      </div>

      {/* 88键热力图 */}
      <div className="stats-section">
        <div className="stats-section-title">{t('statsView.heatmapTitle')}</div>
        {isConnected ? (
          <PianoHeatmap activeNotes={midi.activeNotes} notePressCount={notePressCount} />
        ) : (
          <div className="heatmap-empty">{t('statsView.connectToStart')}</div>
        )}
      </div>
    </div>
  )
}
