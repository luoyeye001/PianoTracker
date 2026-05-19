import { Classic } from '@theme-toggles/react'
import { useTranslation } from 'react-i18next'
import '@theme-toggles/react/css/Classic.css'
import './Sidebar.css'

export type Page = 'practice' | 'stats' | 'songs' | 'calendar' | 'obs' | 'settings'

const NAV_ITEMS: { id: Page; labelKey: string }[] = [
  { id: 'practice', labelKey: 'practice' },
  { id: 'stats',    labelKey: 'stats' },
  { id: 'songs',    labelKey: 'songs' },
  { id: 'calendar', labelKey: 'calendar' },
  { id: 'obs',      labelKey: 'obs' },
  { id: 'settings', labelKey: 'settings' }
]

interface Props {
  current: Page
  onChange: (page: Page) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function Sidebar({ current, onChange, theme, onToggleTheme }: Props): JSX.Element {
  const { t } = useTranslation()

  return (
    <nav className="sidebar">
      <div className={`sidebar-logo sidebar-logo--${theme}`}>
        <span className="sidebar-logo-main">PT</span>
        <Classic
          className="sidebar-logo-toggle"
          toggled={theme === 'dark'}
          onToggle={onToggleTheme}
          duration={550}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        />
      </div>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`sidebar-item ${current === item.id ? 'sidebar-item--active' : ''}`}
          onClick={() => onChange(item.id)}
          title={t(item.labelKey)}
        >
          <span className="sidebar-label">{t(item.labelKey)}</span>
        </button>
      ))}
    </nav>
  )
}
