import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const TABS = [
  {
    to: '/', end: true, label: 'Home',
    icon: (active) => active ? (
      <svg viewBox="0 0 24 24" fill="#6C63FF" className="w-5 h-5">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    ),
  },
  {
    to: '/reports', end: false, label: 'Recordings',
    icon: (active) => active ? (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        stroke="#6C63FF" className="w-5 h-5">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3" fill="#6C63FF" stroke="none"/>
        <circle cx="18" cy="16" r="3" fill="#6C63FF" stroke="none"/>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        stroke="#9CA3AF" className="w-5 h-5">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  { to: '/checkin', end: false, label: 'Coach', center: true },
  {
    to: '/people', end: false, label: 'People',
    icon: (active) => active ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4" fill="#EEF2FF"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/settings', end: false, label: 'Settings',
    icon: (active) => active ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" fill="#EEF2FF"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const { darkMode } = useTheme()
  const { pathname } = useLocation()

  const activeIdx = (() => {
    if (pathname === '/') return 0
    return TABS.findIndex(({ to }, i) => i > 0 && (pathname === to || pathname.startsWith(to + '/')))
  })()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Floating island pill */}
      <div className="mx-4 mb-3 rounded-[28px] overflow-hidden"
        style={{
          background: darkMode
            ? 'rgba(18,15,50,0.96)'
            : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: darkMode
            ? '0 -2px 0 rgba(108,99,255,0.12) inset, 0 8px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 -2px 0 rgba(108,99,255,0.06) inset, 0 8px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        }}>

        <div className="flex items-center px-2 py-1.5">
          {TABS.map(({ to, end, label, icon, center }, idx) => (
            <NavLink key={to} to={to} end={end} className="flex-1">
              {({ isActive }) =>
                center ? (
                  // Centre mic button — elevated floating bubble
                  <div className="flex flex-col items-center py-1">
                    <div className="relative">
                      {isActive && (
                        <span className="absolute inset-0 rounded-full animate-ping"
                          style={{ background: 'rgba(108,99,255,0.35)', animationDuration: '1.8s' }} />
                      )}
                      <div className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          background: 'linear-gradient(145deg, #6C63FF, #8B85FF)',
                          boxShadow: isActive
                            ? '0 0 0 4px rgba(108,99,255,0.25), 0 6px 24px rgba(108,99,255,0.55)'
                            : '0 4px 18px rgba(108,99,255,0.4)',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                        }}>
                        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="9"  y1="22" x2="15" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                    <span className="mt-0.5 text-[9px] font-bold transition-colors"
                      style={{ color: isActive ? '#6C63FF' : '#9CA3AF', letterSpacing: '0.02em' }}>
                      {label}
                    </span>
                  </div>
                ) : (
                  // Regular tab
                  <div className="flex flex-col items-center py-1.5 relative">
                    {isActive && (
                      <div className="absolute inset-x-1 inset-y-0.5 rounded-2xl transition-all duration-300"
                        style={{
                          background: darkMode
                            ? 'rgba(108,99,255,0.18)'
                            : 'rgba(108,99,255,0.08)',
                        }} />
                    )}
                    <div className="relative z-10 transition-all duration-300"
                      style={{ transform: isActive ? 'translateY(-1px) scale(1.12)' : 'scale(1)' }}>
                      {icon(isActive)}
                    </div>
                    <span className="relative z-10 mt-0.5 text-[9px] font-bold transition-all duration-300"
                      style={{
                        color: isActive ? '#6C63FF' : '#9CA3AF',
                        letterSpacing: '0.02em',
                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      }}>
                      {label}
                    </span>
                  </div>
                )
              }
            </NavLink>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes nav-pop {
          0% { transform: scale(0.8); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
