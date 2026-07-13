import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DailySummary } from '../types/api'
import { addLocalDays, fromLocalDateString, toLocalDateString } from '../utils/date'
import './PracticeHeatmap.css'

interface Props {
  dailySummary: DailySummary[]
  onSelectDate?: (date: string) => void
  selectedDate?: string
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function minutesToLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0
  if (minutes < 10)  return 1
  if (minutes < 20)  return 2
  if (minutes < 40)  return 3
  return 4
}

export function PracticeHeatmap({ dailySummary, onSelectDate, selectedDate }: Props): JSX.Element {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language

  const { weeks, months } = useMemo(() => {
    const summaryMap = new Map(dailySummary.map((d) => [d.date, d]))

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDay = addDays(today, -(52 * 7 - 1))
    const startSunday = addDays(startDay, -startDay.getDay())

    const weeks: { date: string; level: 0|1|2|3|4; minutes: number }[][] = []
    let current = new Date(startSunday)

    while (current <= today) {
      const week: typeof weeks[0] = []
      for (let d = 0; d < 7; d++) {
        const dateStr = toLocalDateString(current)
        const summary = summaryMap.get(dateStr)
        const minutes = summary ? Math.round(summary.total_s / 60) : 0
        const isFuture = current > today
        week.push({
          date: dateStr,
          level: isFuture ? 0 : minutesToLevel(minutes),
          minutes
        })
        current = addDays(current, 1)
      }
      weeks.push(week)
    }

    const months: { label: string; col: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, col) => {
      const firstDate = fromLocalDateString(week[0].date)
      const month = firstDate.getMonth()
      if (month !== lastMonth) {
        months.push({
          label: firstDate.toLocaleDateString(locale, { month: 'short' }),
          col
        })
        lastMonth = month
      }
    })

    return { weeks, months }
  }, [dailySummary, locale])

  const totalDays = dailySummary.length
  const streak = useMemo(() => {
    if (dailySummary.length === 0) return 0
    const sorted = [...dailySummary].sort((a, b) => b.date.localeCompare(a.date))
    const today = toLocalDateString()
    let count = 0
    let expected = today
    for (const d of sorted) {
      if (d.date === expected) {
        count++
        expected = addLocalDays(expected, -1)
      } else break
    }
    return count
  }, [dailySummary])

  const days = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 7 + index).toLocaleDateString(locale, { weekday: 'short' })
  )

  return (
    <div className="practice-heatmap">
      <div className="heatmap-stats">
        <span>{t('calendarView.totalDays', { count: totalDays })}</span>
        <span className="heatmap-streak">
          {t('calendarView.streak', { count: streak })}
        </span>
      </div>

      <div className="heatmap-grid-wrap">
        {/* 月份标签 */}
        <div className="heatmap-months">
          {months.map((m) => (
            <div key={m.col} className="heatmap-month-label" style={{ gridColumn: m.col + 1 }}>
              {m.label}
            </div>
          ))}
        </div>

        <div className="heatmap-body">
          {/* 星期标签 */}
          <div className="heatmap-days">
            {days.map((day, index) => (
              <div key={index} className="heatmap-day-label">{index % 2 === 1 ? day : ''}</div>
            ))}
          </div>

          {/* 格子 */}
          <div className="heatmap-cells">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    className={[
                      'heatmap-cell',
                      `heatmap-cell--l${cell.level}`,
                      selectedDate === cell.date ? 'heatmap-cell--selected' : '',
                      onSelectDate ? 'heatmap-cell--clickable' : ''
                    ].join(' ')}
                    title={cell.minutes > 0 ? `${cell.date}：${cell.minutes} 分钟` : cell.date}
                    onClick={() => onSelectDate?.(cell.date)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-legend">
        <span>{t('calendarView.less')}</span>
        {[0,1,2,3,4].map((l) => (
          <div key={l} className={`heatmap-cell heatmap-cell--l${l}`} />
        ))}
        <span>{t('calendarView.more')}</span>
      </div>
    </div>
  )
}
