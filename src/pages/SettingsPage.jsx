import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { logOut } from '../services/authService'

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
              <LinkRow label="Subscription" right="Free Plan" />
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
