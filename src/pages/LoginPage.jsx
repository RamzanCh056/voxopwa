import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, resetPassword } from '../services/authService'
import { useTheme } from '../context/ThemeContext'

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email.'
    case 'auth/wrong-password': return 'Incorrect password. Try again.'
    case 'auth/invalid-email': return 'Invalid email address.'
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.'
    case 'auth/invalid-credential': return 'Invalid email or password.'
    default: return 'Sign in failed. Please try again.'
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await signIn(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!form.email) { setError('Enter your email first to reset password'); return }
    try {
      await resetPassword(form.email)
      setResetSent(true)
      setError('')
    } catch {
      setError('Could not send reset email. Check the address and try again.')
    }
  }

  function fieldStyle(name) {
    const focused = focusedField === name
    return {
      background: darkMode ? 'rgba(255,255,255,0.04)' : '#F8F9FF',
      border: `1.5px solid ${focused ? '#6C63FF' : darkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
      color: darkMode ? '#ffffff' : '#1F2937',
      transition: 'border-color 200ms, box-shadow 200ms',
      boxShadow: focused ? '0 0 0 3px rgba(108,99,255,0.15)' : 'none',
    }
  }

  const labelColor = darkMode ? 'rgba(255,255,255,0.5)' : '#6B7280'
  const cardStyle = darkMode
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }
    : { background: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #E8EAF0' }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-5 transition-colors duration-300 overflow-x-hidden relative"
      style={{ background: darkMode ? '#0F0C29' : '#F0F2F7' }}>

      {/* Ambient orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: darkMode ? 'radial-gradient(circle, rgba(108,99,255,0.14) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'orb-drift-a 12s ease-in-out infinite' }}
        aria-hidden />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: darkMode ? 'radial-gradient(circle, rgba(79,138,255,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(79,138,255,0.07) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'orb-drift-b 15s ease-in-out infinite' }}
        aria-hidden />

      <div className="w-full max-w-sm relative" style={{ animation: 'fade-up 0.6s ease both' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2" style={{ animation: 'scale-in 0.5s ease both 0.1s' }}>
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #9B8FFF)', boxShadow: '0 8px 24px rgba(108,99,255,0.4)', animation: 'float 4s ease-in-out infinite' }}>
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="2" stroke="white" fill="none" strokeLinecap="round" />
                <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold tracking-tight" style={{ color: darkMode ? '#ffffff' : '#1F2937' }}>
              Voxofied
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', animation: 'fade-up 0.5s ease both 0.2s' }}>
            AI-powered voice intelligence
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ ...cardStyle, animation: 'fade-up 0.55s ease both 0.15s' }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: darkMode ? '#ffffff' : '#1F2937' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-6" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#6B7280' }}>
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: labelColor }}>Email address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                placeholder="you@example.com" autoComplete="email" required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={fieldStyle('email')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: labelColor }}>Password</label>
                <button type="button" onClick={handleForgotPassword}
                  className="text-xs font-medium" style={{ color: '#6C63FF' }}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password}
                  onChange={handleChange} onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)} placeholder="••••••••"
                  autoComplete="current-password" required
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none"
                  style={fieldStyle('password')} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: darkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-3 py-2.5 text-sm font-medium"
                style={{ background: 'rgba(239,68,68,0.12)', color: darkMode ? '#FCA5A5' : '#DC2626' }}>
                {error}
              </div>
            )}
            {resetSent && (
              <div className="rounded-xl px-3 py-2.5 text-sm font-medium"
                style={{ background: 'rgba(34,197,94,0.12)', color: darkMode ? '#86EFAC' : '#16A34A' }}>
                Reset email sent! Check your inbox.
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: isLoading ? 'rgba(108,99,255,0.5)' : 'linear-gradient(135deg, #6C63FF, #8B85FF)',
                boxShadow: isLoading ? 'none' : '0 4px 24px rgba(108,99,255,0.35)',
              }}>
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: darkMode ? 'rgba(255,255,255,0.07)' : '#E5E7EB' }} />
            <span className="text-xs" style={{ color: darkMode ? 'rgba(255,255,255,0.25)' : '#9CA3AF' }}>or</span>
            <div className="flex-1 h-px" style={{ background: darkMode ? 'rgba(255,255,255,0.07)' : '#E5E7EB' }} />
          </div>

          <Link to="/signup">
            <button type="button" className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ border: '1.5px solid rgba(108,99,255,0.6)', color: '#8B85FF', background: 'transparent' }}>
              Create account
            </button>
          </Link>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: darkMode ? 'rgba(255,255,255,0.35)' : '#6B7280' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold" style={{ color: '#6C63FF' }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
