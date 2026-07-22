import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { logOut } from '../services/authService'

const PLAN_LABEL = { monthly: '30 Days', quarterly: '90 Days', yearly: '1 Year' }

const STATUS_BADGE = {
  active:   { bg: '#DCFCE7', text: '#15803D', label: 'Active'   },
  past_due: { bg: '#FEF9C3', text: '#A16207', label: 'Past Due' },
  canceled: { bg: '#FEE2E2', text: '#B91C1C', label: 'Canceled' },
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts.toMillis ? ts.toMillis() : ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PlanSummaryCard({ billing, onManage }) {
  if (billing === null) {
    return (
      <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm p-5 h-32 animate-pulse" />
    )
  }

  const minutesUsed      = billing.minutesUsed      || 0
  const minutesIncluded  = billing.minutesIncluded  || 0
  const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed)
  const pct              = minutesIncluded > 0 ? Math.min(100, Math.round((minutesUsed / minutesIncluded) * 100)) : 0

  const isPaidPlan  = !!billing.planId
  const isFreeTrial = !isPaidPlan && minutesIncluded > 0
  const hasMinutes  = minutesIncluded > 0

  const badge = isPaidPlan
    ? STATUS_BADGE[billing.status]
    : isFreeTrial
      ? { bg: '#EDE9FE', text: '#6D28D9', label: 'Free Trial' }
      : null

  const planLabel = isPaidPlan
    ? (PLAN_LABEL[billing.planId] || billing.planId)
    : isFreeTrial
      ? 'Free Trial'
      : 'No active plan'

  return (
    <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
            Current Plan
          </p>
          <p className="font-bold text-gray-900 dark:text-white text-base">
            {planLabel}
          </p>
        </div>
        {badge && (
          <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
            style={{ background: badge.bg, color: badge.text }}>
            {badge.label}
          </span>
        )}
      </div>

      {hasMinutes ? (
        <>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {minutesRemaining.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              of {minutesIncluded.toLocaleString()} min left
              {isFreeTrial && ' (free trial)'}
            </span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2E2B5B] mb-3">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width:      `${pct}%`,
                background: pct > 80 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#6C63FF,#8B85FF)',
              }} />
          </div>

          {isPaidPlan ? (
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-4">
              <span>Started {fmtDate(billing.currentPeriodStart)}</span>
              <span>Renews {fmtDate(billing.currentPeriodEnd)}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Upgrade to a paid plan for more minutes and uninterrupted analysis.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          You're out of minutes. Subscribe to a plan to keep analyzing recordings.
        </p>
      )}

      <button onClick={onManage}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
        {isPaidPlan ? 'Manage Billing' : 'View Plans'}
      </button>
    </div>
  )
}

function Toggle({ enabled, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
      style={{ background: enabled ? '#6C63FF' : '#D1D5DB' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
        style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2 mt-1">
      {children}
    </p>
  )
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm font-medium text-gray-800 dark:text-white">{label}</span>
      <Toggle enabled={value} onChange={onChange} />
    </div>
  )
}

function LinkRow({ label, right }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm font-medium text-gray-800 dark:text-white">{label}</span>
      <div className="flex items-center gap-1.5">
        {right && <span className="text-xs text-gray-400">{right}</span>}
        <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
          strokeLinecap="round" className="w-4 h-4">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px mx-4 bg-gray-100 dark:bg-[#2E2B5B]" />
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { darkMode, setDarkMode } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [autoAnalyze, setAutoAnalyze] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [billing, setBilling] = useState(null)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      setBilling(snap.exists() ? snap.data() : {})
    })
    return unsub
  }, [user])

  const displayName = user?.displayName || 'User'
  const email = user?.email || ''
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logOut()
      navigate('/login')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      <div className="px-5 pt-12 pb-5 md:hidden bg-white dark:bg-[#1E1B4B] border-b border-gray-100 dark:border-transparent"
        style={{ borderRadius: '0 0 28px 28px' }}>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h1>
      </div>

      <div className="hidden md:flex items-center bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h1>
      </div>

      <div className="flex-1 px-4 pt-5 pb-24 md:pb-8 md:px-8 flex flex-col gap-4 md:max-w-5xl md:w-full md:mx-auto">

        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
            <span className="text-white font-bold text-lg">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 dark:text-white text-base">{displayName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{email}</p>
          </div>
          <button className="text-sm font-semibold flex-shrink-0" style={{ color: '#6C63FF' }}>
            Edit
          </button>
        </div>

        <PlanSummaryCard billing={billing} onManage={() => navigate('/billing')} />

        <div className="md:grid md:grid-cols-2 md:gap-4 flex flex-col gap-4">

          <div>
            <SectionLabel>Preferences</SectionLabel>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
              <ToggleRow label="Notifications" value={notifications} onChange={setNotifications} />
              <Divider />
              <ToggleRow label="Dark Mode" value={darkMode} onChange={setDarkMode} />
              <Divider />
              <ToggleRow label="Auto-analyze recordings" value={autoAnalyze} onChange={setAutoAnalyze} />
            </div>
          </div>

          <div>
            <SectionLabel>Account</SectionLabel>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => navigate('/billing')} className="w-full">
                <LinkRow label="Billing & Plans" />
              </button>
              <Divider />
              <button onClick={() => navigate('/language')} className="w-full">
                <LinkRow label="Language" right={localStorage.getItem('voxofied_language') || 'English'} />
              </button>
              <Divider />
              <LinkRow label="Privacy Policy" />
              <Divider />
              <LinkRow label="Terms of Service" />
              <Divider />
              <LinkRow label="Help & Support" />
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>Account Actions</SectionLabel>
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                style={{ color: '#EF4444', border: '1.5px solid #EF4444', background: 'transparent' }}>
                {signingOut ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="4" />
                      <path className="opacity-75" fill="#EF4444" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                    </svg>
                    Signing out…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 dark:text-gray-600 mt-2">Voxofied AI v1.0.0</p>
      </div>
    </div>
  )
}
