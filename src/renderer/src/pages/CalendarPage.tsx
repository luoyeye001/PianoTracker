import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePracticeHistory } from '../hooks/usePracticeHistory'
import type { PracticePlan, DailySummary } from '../types/api'
import { fromLocalDateString, toLocalDateString } from '../utils/date'
import './CalendarPage.css'

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

interface DayInfo {
  dateStr: string
  day: number
  isToday: boolean
  isCurrentMonth: boolean
  practiceMin: number
  plan: PracticePlan | null
}

interface ContextMenu {
  x: number
  y: number
  dateStr: string
  plan: PracticePlan | null
}

interface EditModal {
  dateStr: string
  plan: PracticePlan | null
}


export function CalendarPage(): JSX.Element {
  const { t, i18n } = useTranslation()
  const { dailySummary } = usePracticeHistory()

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [plans, setPlans] = useState<Record<string, PracticePlan>>({})
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [editModal, setEditModal] = useState<EditModal | null>(null)
  const [editGoal, setEditGoal] = useState('')
  const [editNote, setEditNote] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const summaryMap: Record<string, DailySummary> = {}
  dailySummary.forEach((d) => { summaryMap[d.date] = d })

  const loadPlans = useCallback(async () => {
    const all = await window.api?.plans.all()
    if (all) {
      const map: Record<string, PracticePlan> = {}
      all.forEach((p) => { map[p.date] = p })
      setPlans(map)
    }
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])

  // 点击外部关闭右键菜单
  useEffect(() => {
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const openEdit = (dateStr: string, plan: PracticePlan | null) => {
    setEditModal({ dateStr, plan })
    setEditGoal(plan ? String(plan.goal_min || '') : '')
    setEditNote(plan ? plan.note : '')
    setContextMenu(null)
  }

  const handleSave = async (): Promise<void> => {
    if (!editModal) return
    const parsedGoal = Number.parseInt(editGoal, 10)
    const goal = Number.isFinite(parsedGoal) ? Math.min(300, Math.max(0, parsedGoal)) : 0
    if (goal === 0 && editNote.trim() === '') {
      await window.api?.plans.delete(editModal.dateStr)
    } else {
      await window.api?.plans.set(editModal.dateStr, goal, editNote.trim())
    }
    await loadPlans()
    setEditModal(null)
  }

  const handleDelete = async (dateStr: string): Promise<void> => {
    await window.api?.plans.delete(dateStr)
    await loadPlans()
    setContextMenu(null)
  }

  const buildGrid = (): DayInfo[] => {
    const todayStr = toLocalDateString(today)
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDow = getFirstDayOfWeek(viewYear, viewMonth)
    const cells: DayInfo[] = []

    const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1)
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const pm = viewMonth === 0 ? 11 : viewMonth - 1
      const py = viewMonth === 0 ? viewYear - 1 : viewYear
      const dateStr = toDateStr(py, pm, d)
      cells.push({ dateStr, day: d, isToday: false, isCurrentMonth: false,
        practiceMin: summaryMap[dateStr] ? Math.round(summaryMap[dateStr].total_s / 60) : 0,
        plan: plans[dateStr] ?? null })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(viewYear, viewMonth, d)
      cells.push({ dateStr, day: d, isToday: dateStr === todayStr, isCurrentMonth: true,
        practiceMin: summaryMap[dateStr] ? Math.round(summaryMap[dateStr].total_s / 60) : 0,
        plan: plans[dateStr] ?? null })
    }

    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      const nm = viewMonth === 11 ? 0 : viewMonth + 1
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear
      const dateStr = toDateStr(ny, nm, d)
      cells.push({ dateStr, day: d, isToday: false, isCurrentMonth: false,
        practiceMin: summaryMap[dateStr] ? Math.round(summaryMap[dateStr].total_s / 60) : 0,
        plan: plans[dateStr] ?? null })
    }

    return cells
  }

  const grid = buildGrid()

  const locale = i18n.resolvedLanguage || i18n.language
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, {
    year: 'numeric', month: 'long'
  })

  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 7 + index).toLocaleDateString(locale, { weekday: 'short' })
  )

  const practiceClass = (min: number): string => {
    if (min === 0) return ''
    if (min < 10) return 'cal-day--practice-l1'
    if (min < 20) return 'cal-day--practice-l2'
    if (min < 40) return 'cal-day--practice-l3'
    return 'cal-day--practice-l4'
  }

  const goalReached = (cell: DayInfo): boolean =>
    Boolean(cell.plan && cell.plan.goal_min > 0 && cell.practiceMin >= cell.plan.goal_min)

  const rainbowVars = (dateStr: string): React.CSSProperties => {
    const seed = dateStr.split('-').reduce((sum, part) => sum + Number(part), 0)
    return {
      '--rainbow-shift-x': `${18 + (seed % 17)}%`,
      '--rainbow-shift-y': `${22 + ((seed * 7) % 19)}%`,
      '--rainbow-shift-z': `${28 + ((seed * 11) % 21)}%`,
      '--rainbow-speed': `${9 + (seed % 5)}s`
    } as React.CSSProperties
  }

  const handleContextMenu = (e: React.MouseEvent, cell: DayInfo) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, dateStr: cell.dateStr, plan: cell.plan })
  }

  const formatDate = (ds: string): string =>
    fromLocalDateString(ds).toLocaleDateString(locale, {
      month: 'long', day: 'numeric', weekday: 'short'
    })

  return (
    <div className="calendar-page">
      {/* 月份导航 */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={() => {
          if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
          else setViewMonth(m => m - 1)
        }}>‹</button>
        <span className="cal-nav-label">{monthLabel}</span>
        <button className="cal-nav-btn" onClick={() => {
          if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
          else setViewMonth(m => m + 1)
        }}>›</button>
        <button className="cal-nav-today" onClick={() => {
          setViewYear(today.getFullYear())
          setViewMonth(today.getMonth())
        }}>{t('calendarView.today')}</button>
      </div>

      {/* 星期头 */}
      <div className="cal-weekdays">
        {weekdays.map((day, index) => <div key={index} className="cal-weekday">{day}</div>)}
      </div>

      {/* 月历格子 */}
      <div className="cal-grid">
        {grid.map((cell) => (
          <div
            key={cell.dateStr}
            className={[
              'cal-day',
              !cell.isCurrentMonth ? 'cal-day--other' : '',
              cell.isToday ? 'cal-day--today' : '',
              cell.plan ? 'cal-day--has-plan' : '',
              practiceClass(cell.practiceMin),
              goalReached(cell) ? 'cal-day--goal-reached' : ''
            ].join(' ')}
            onContextMenu={(e) => handleContextMenu(e, cell)}
            style={goalReached(cell) ? rainbowVars(cell.dateStr) : undefined}
          >
            <span className="cal-day-num">{cell.day}</span>
            {cell.plan && (
              <div className="cal-day-plan-content">
                {cell.plan.goal_min > 0 && (
                  <span className="cal-day-goal">{cell.plan.goal_min}m</span>
                )}
                {cell.plan.note && (
                  <span className="cal-day-note-text">{cell.plan.note}</span>
                )}
              </div>
            )}
            {cell.practiceMin > 0 && (
              <span className="cal-day-practiced">
                {cell.practiceMin}m
              </span>
            )}
            {goalReached(cell) && (<>
                <span className="cal-day-frost" />
                <span className="cal-day-complete">✓</span>
              </>)}
          </div>
        ))}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="cal-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cal-context-date">{formatDate(contextMenu.dateStr)}</div>
          <button className="cal-context-item" onClick={() => openEdit(contextMenu.dateStr, contextMenu.plan)}>
            {contextMenu.plan ? t('calendarView.editPlan') : t('calendarView.addPlan')}
          </button>
          {contextMenu.plan && (
            <button className="cal-context-item cal-context-item--danger" onClick={() => handleDelete(contextMenu.dateStr)}>
              {t('calendarView.deletePlan')}
            </button>
          )}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editModal && (
        <div className="cal-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal-title">
              {formatDate(editModal.dateStr)}
            </div>
            <div className="cal-modal-row">
              <label className="cal-modal-label">{t('calendarView.goalMin')}</label>
              <input
                className="cal-modal-input cal-modal-input--short"
                type="number"
                min={0}
                max={300}
                placeholder="0"
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                autoFocus
              />
              <span className="cal-modal-unit">{t('calendarView.minutes')}</span>
            </div>
            <div className="cal-modal-row cal-modal-row--col">
              <label className="cal-modal-label">{t('calendarView.planNote')}</label>
              <textarea
                className="cal-modal-input cal-modal-textarea"
                placeholder={t('calendarView.planNotePlaceholder')}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={4}
              />
            </div>
            <div className="cal-modal-actions">
              <button className="cal-btn cal-btn--primary" onClick={handleSave}>
                {t('calendarView.save')}
              </button>
              <button className="cal-btn" onClick={() => setEditModal(null)}>
                {t('calendarView.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
