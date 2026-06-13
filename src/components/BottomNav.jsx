import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const TABS = [
  {
    to: '/', end: true, label: 'Import',
    icon: active => (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        stroke={active ? '#6C63FF' : '#9CA3AF'} className="w-5 h-5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    to: '/reports', end: false, label: 'Recordings',
    icon: active => (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        stroke={active ? '#6C63FF' : '#9CA3AF'} className="w-5 h-5">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  { to: '/checkin', end: false, label: 'Live Coach', center: true },
  {
    to: '/people', end: false, label: 'People',
    icon: active => (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        stroke={active ? '#6C63FF' : '#9CA3AF'} className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/settings', end: false, label: 'Settings',
    icon: active => (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        stroke={active ? '#6C63FF' : '#9CA3AF'} className="w-5 h-5">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

const tabPct = 100 / TABS.length

export default function BottomNav() {
  const { darkMode }   = useTheme()
  const { pathname }   = useLocation()

  const activeIdx = (() => {
    if (pathname === '/') return 0
    return TABS.findIndex(({ to }, i) => i > 0 && (pathname === to || pathname.startsWith(to + '/')))
  })()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Glass blur backdrop */}
      <div className="mx-auto relative overflow-hidden"
        style={{
          maxWidth: 430,
          background: darkMode
            ? 'rgba(26,23,64,0.92)'
            : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${darkMode ? 'rgba(108,99,255,0.15)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: darkMode
            ? '0 -4px 32px rgba(0,0,0,0.4)'
            : '0 -4px 32px rgba(0,0,0,0.07)',
        }}>

        {/* Sliding gradient indicator */}
        <div className="absolute top-0 h-[2.5px] rounded-b-full transition-all duration-350 ease-out"
          style={{
            width: `${tabPct}%`,
            left: `${activeIdx >= 0 ? activeIdx * tabPct : 0}%`,
            background: 'linear-gradient(90deg, #6C63FF, #8B85FF)',
            boxShadow: '0 0 8px rgba(108,99,255,0.6)',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />

        <div className="flex items-end">
          {TABS.map(({ to, end, label, icon, center }) => (
            <NavLink key={to} to={to} end={end}
              className="flex flex-1 flex-col items-center select-none"
              style={{ paddingBottom: 10 }}>
              {({ isActive }) =>
                center ? (
                  <div className="flex flex-col items-center" style={{ marginTop: -22 }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        background: isActive
                          ? 'linear-gradient(145deg, #5A52E0, #6C63FF)'
                          : 'linear-gradient(145deg, #6C63FF, #8B85FF)',
                        boxShadow: isActive
                          ? '0 4px 24px rgba(108,99,255,0.6), 0 0 0 3px rgba(108,99,255,0.15)'
                          : '0 4px 20px rgba(108,99,255,0.45)',
                        transform: isActive ? 'scale(1.08)' : 'scale(1)',
                      }}>
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="9"  y1="22" x2="15" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="mt-1 font-semibold transition-colors"
                      style={{ fontSize: 10, color: isActive ? '#6C63FF' : '#9CA3AF' }}>
                      {label}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-0.5 pt-2">
                    <div className="transition-transform duration-200"
                      style={{ transform: isActive ? 'translateY(-1px) scale(1.1)' : 'scale(1)' }}>
                      {icon(isActive)}
                    </div>
                    <span className="font-semibold transition-colors"
                      style={{ fontSize: 10, color: isActive ? '#6C63FF' : '#9CA3AF' }}>
                      {label}
                    </span>
                  </div>
                )
              }
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
