import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DailySummary } from '../types/api'
import './PracticeHeatmap.css'

interface Props {
  dailySummary: DailySummary[]
  onSelectDate?: (date: string) => void
  selectedDate?: string
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
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
  const { t } = useTranslation()

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
        const dateStr = toDateStr(current)
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
      const month = new Date(week[0].date).getMonth()
      if (month !== lastMonth) {
        months.push({
          label: new Date(week[0].date).toLocaleDateString(undefined, { month: 'short' }),
          col
        })
        lastMonth = month
      }
    })

    return { weeks, months }
  }, [dailySummary])

  const totalDays = dailySummary.length
  const streak = useMemo(() => {
    if (dailySummary.length === 0) return 0
    const sorted = [...dailySummary].sort((a, b) => b.date.localeCompare(a.date))
    const today = toDateStr(new Date())
    let count = 0
    let expected = today
    for (const d of sorted) {
      if (d.date === expected) {
        count++
        expected = toDateStr(addDays(new Date(expected), -1))
      } else break
    }
    return count
  }, [dailySummary])

  const DAYS = ['日', '一', '二', '三', '四', '五', '六']

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
            {DAYS.map((d, i) => (
              <div key={i} className="heatmap-day-label">{i % 2 === 1 ? d : ''}</div>
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
