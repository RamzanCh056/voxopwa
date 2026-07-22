import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function BulkProgressPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { darkMode } = useTheme()
  const files = state?.files || []

  const [statuses, setStatuses] = useState(files.map(() => 'pending'))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [cancelled, setCancelled] = useState(false)

  const doneCount = statuses.filter(s => s === 'done').length
  const allDone = doneCount === files.length && files.length > 0

  useEffect(() => {
    if (cancelled || files.length === 0) return
    if (currentIdx >= files.length) return

    setStatuses(prev => { const n = [...prev]; n[currentIdx] = 'processing'; return n })

    const delay = 2000 + Math.random() * 2000
    const timer = setTimeout(() => {
      if (cancelled) return
      setStatuses(prev => { const n = [...prev]; n[currentIdx] = 'done'; return n })
      setCurrentIdx(i => i + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [currentIdx, cancelled, files.length])

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => navigate('/reports'), 1800)
      return () => clearTimeout(t)
    }
  }, [allDone, navigate])

  function handleCancel() {
    setCancelled(true)
    setStatuses(prev => prev.map(s => s === 'pending' ? 'cancelled' : s))
  }

  function handleRetry(i) {
    setStatuses(prev => { const n = [...prev]; n[i] = 'pending'; return n })
    setCurrentIdx(i)
    setCancelled(false)
  }

  const STATUS_CONFIG = {
    pending:    { color: '#D1D5DB', icon: null },
    processing: { color: '#6C63FF', icon: 'spin' },
    done:       { color: '#22C55E', icon: 'check' },
    failed:     { color: '#EF4444', icon: 'x' },
    cancelled:  { color: '#9CA3AF', icon: null },
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Header */}
      <div className="px-5 pt-12 pb-6 md:pt-8"
        style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {allDone ? '✅ All done!' : `Analyzing ${doneCount} of ${files.length}`}
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              {allDone ? 'Redirecting to recordings…' : 'Processing one at a time'}
            </p>
          </div>
          {!allDone && !cancelled && (
            <button onClick={handleCancel}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
              Cancel
            </button>
          )}
        </div>

        {/* Overall progress bar */}
        <div className="mt-4 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${files.length > 0 ? (doneCount / files.length) * 100 : 0}%`, background: '#6C63FF' }} />
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 md:max-w-2xl md:mx-auto md:w-full flex flex-col gap-3">
        {files.map((f, i) => {
          const status = statuses[i] || 'pending'
          const cfg = STATUS_CONFIG[status]
          return (
            <div key={i} className="bg-white dark:bg-[#1E1B4B] rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
              {/* Status icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: `${cfg.color}18`, border: `2px solid ${cfg.color}` }}>
                {cfg.icon === 'spin' && (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke={cfg.color} strokeOpacity="0.25" strokeWidth="4"/>
                    <path fill={cfg.color} d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
                  </svg>
                )}
                {cfg.icon === 'check' && (
                  <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4">
                    <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {cfg.icon === 'x' && (
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{f.name}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: cfg.color }}>
                  {status === 'processing' ? 'Analyzing…' : status === 'done' ? 'Complete' : status === 'cancelled' ? 'Cancelled' : status}
                </p>
              </div>

              {status === 'failed' && (
                <button onClick={() => handleRetry(i)}
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                  Retry
                </button>
              )}
            </div>
          )
        })}

        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16">
            <span className="text-4xl">📭</span>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No files to process.</p>
            <button onClick={() => navigate('/bulk-import')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#6C63FF' }}>
              Go to Bulk Import
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
