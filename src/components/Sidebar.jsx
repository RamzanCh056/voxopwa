import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getIdTokenResult } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase/config'

const NAV = [
  {
    to: '/', end: true, label: 'Import Audio',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#6C63FF' : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    to: '/reports', end: false, label: 'Recordings',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#6C63FF' : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    to: '/checkin', end: false, label: 'Live Coach',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#6C63FF' : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="9" y1="22" x2="15" y2="22" />
      </svg>
    ),
  },
  {
    to: '/people', end: false, label: 'People',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#6C63FF' : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/settings', end: false, label: 'Settings',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={a ? '#6C63FF' : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

function navCls(isActive) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
    isActive
      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
      : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-300'
  }`
}

export default function Sidebar() {
  const { user } = useAuth()
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [billing,  setBilling]  = useState(null)  // { minutesUsed, minutesIncluded, status }

  useEffect(() => {
    if (!user) return
    getIdTokenResult(user).then(r => setIsAdmin(!!r.claims.admin))
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) {
        const d = snap.data()
        setBilling({
          minutesUsed:     d.minutesUsed     || 0,
          minutesIncluded: d.minutesIncluded || 0,
          status:          d.subscriptionStatus || null,
        })
      }
    })
    return unsub
  }, [user])

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User'
  const email       = user?.email || ''
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const minutesLeft = billing
    ? Math.max(0, billing.minutesIncluded - billing.minutesUsed)
    : null
  const pct = billing?.minutesIncluded > 0
    ? Math.min(100, Math.round((billing.minutesUsed / billing.minutesIncluded) * 100))
    : 0
  const lowMinutes = minutesLeft !== null && minutesLeft < 30

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-white dark:bg-[#1A1740] border-r border-gray-200 dark:border-[#2E2B5B] z-30 p-4 transition-colors duration-300">

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-6 px-1 pt-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-base leading-tight" style={{ color: '#6C63FF' }}>Voxofied</p>
          <p className="text-[11px] leading-tight text-gray-400 dark:text-gray-500">AI Voice Analysis</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map(({ to, end, label, icon }) => (
          <NavLink key={to} to={to} end={end}>
            {({ isActive }) => (
              <div className={navCls(isActive)}>
                {icon(isActive)}
                {label}
              </div>
            )}
          </NavLink>
        ))}

        {/* Billing */}
        <NavLink to="/billing" end={false}>
          {({ isActive }) => (
            <div className={navCls(isActive)}>
              <svg viewBox="0 0 24 24" fill="none" stroke={isActive ? '#6C63FF' : 'currentColor'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Billing
              {lowMinutes && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  Low
                </span>
              )}
            </div>
          )}
        </NavLink>

        {/* Admin — only when admin claim */}
        {isAdmin && (
          <NavLink to="/admin" end={false}>
            {({ isActive }) => (
              <div className={navCls(isActive)}>
                <svg viewBox="0 0 24 24" fill="none" stroke={isActive ? '#6C63FF' : 'currentColor'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Admin
              </div>
            )}
          </NavLink>
        )}
      </nav>

      {/* Minutes pill */}
      {billing && billing.minutesIncluded > 0 && (
        <NavLink to="/billing" className="mt-3 block">
          <div className={`rounded-xl px-3 py-2.5 transition-colors ${
            lowMinutes
              ? 'bg-red-50 dark:bg-red-900/20'
              : 'bg-gray-50 dark:bg-[#2E2B5B]'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Minutes left</span>
              <span className="text-xs font-bold" style={{ color: lowMinutes ? '#ef4444' : '#6C63FF' }}>
                {minutesLeft?.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-[#1A1740] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#6C63FF' }} />
            </div>
          </div>
        </NavLink>
      )}

      {/* No plan state */}
      {billing && billing.minutesIncluded === 0 && (
        <NavLink to="/billing"
          className="mt-3 block px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-center">
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            No active plan → Subscribe
          </span>
        </NavLink>
      )}

      {/* User */}
      <div className="pt-4 border-t border-gray-100 dark:border-[#2E2B5B] mt-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
            <span className="text-white font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
