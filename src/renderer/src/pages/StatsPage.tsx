import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PianoHeatmap } from '../components/PianoHeatmap'
import { ScalePanel } from '../components/ScalePanel'
import type { UseMidiReturn } from '../hooks/useMidi'
import type { UseScaleAnalysisReturn } from '../hooks/useScaleAnalysis'
import type { DailySummary } from '../types/api'
import { toLocalDateString } from '../utils/date'
import './StatsPage.css'

interface Props {
  midi: UseMidiReturn
  scaleAnalysis: UseScaleAnalysisReturn
  dailySummary: DailySummary[]
}

type StatsRange = 'today' | 'week' | 'total'

function startOfWeek(d: Date): Date {
  const next = new Date(d)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function summarize(entries: DailySummary[]) {
  return entries.reduce((acc, entry) => ({
    presses: acc.presses + entry.total_presses,
    uniqueNotes: acc.uniqueNotes + entry.total_unique_notes,
    minutes: acc.minutes + Math.round(entry.total_s / 60),
    chords: acc.chords + entry.total_chords_recognized,
    days: acc.days + 1
  }), { presses: 0, uniqueNotes: 0, minutes: 0, chords: 0, days: 0 })
}

export function StatsPage({ midi, scaleAnalysis, dailySummary }: Props): JSX.Element {
  const { t } = useTranslation()
  const { notePressCount, isConnected } = midi
  const [range, setRange] = useState<StatsRange>('today')

  const summary = useMemo(() => {
    const now = new Date()
    const today = toLocalDateString(now)
    const weekStart = toLocalDateString(startOfWeek(now))

    const entries = range === 'today'
      ? dailySummary.filter((d) => d.date === today)
      : range === 'week'
        ? dailySummary.filter((d) => d.date >= weekStart && d.date <= today)
        : dailySummary

    return summarize(entries)
  }, [dailySummary, range])

  const rangeLabels: Record<StatsRange, string> = {
    today: t('statsView.today'),
    week: t('statsView.week'),
    total: t('statsView.total')
  }

  const durationLabel: Record<StatsRange, string> = {
    today: t('statsView.durationToday'),
    week: t('statsView.durationWeek'),
    total: t('statsView.durationTotal')
  }

  return (
    <div className="stats-page">
      <div className="stats-header-row">
        <h2 className="stats-title">{t('statsView.title')}</h2>
        <div className="stats-range-switcher">
          {(Object.keys(rangeLabels) as StatsRange[]).map((key) => (
            <button
              key={key}
              className={`stats-range-btn ${range === key ? 'stats-range-btn--active' : ''}`}
              onClick={() => setRange(key)}
            >
              {rangeLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{summary.presses}</div>
          <div className="stat-label">{t('statsView.totalPresses')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.uniqueNotes}</div>
          <div className="stat-label">{t('statsView.uniqueNotes')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.minutes > 0 ? `${summary.minutes}m` : '—'}</div>
          <div className="stat-label">{durationLabel[range]}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.chords}</div>
          <div className="stat-label">{t('statsView.chordsRecognized')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.days}</div>
          <div className="stat-label">{t('statsView.practiceDays')}</div>
        </div>
      </div>

      <div className="stats-section">
        <ScalePanel
          matches={scaleAnalysis.scaleMatches}
          pitchCount={scaleAnalysis.recentPitchClasses.length}
        />
      </div>

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
