import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getRecordingsMeta } from '../services/firestoreService'

const FILTERS = ['All', 'High', 'Medium', 'Low']

function WaveBars() {
  const hs = [5, 9, 12, 14, 10, 12, 9, 5]
  return (
    <div className="flex items-center gap-[2px]">
      {hs.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{ height: h, background: '#6C63FF', opacity: 0.4 + (i % 3) * 0.2 }} />
      ))}
    </div>
  )
}

function moodStyle(mood) {
  if (!mood) return { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', emoji: '😐' }
  const m = mood.toLowerCase()
  if (m === 'stressed' || m === 'angry') return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', emoji: '😰' }
  if (m === 'happy' || m === 'excited') return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', emoji: '😊' }
  if (m === 'calm') return { color: '#4F8AFF', bg: 'rgba(79,138,255,0.1)', emoji: '😌' }
  if (m === 'sad') return { color: '#6C63FF', bg: 'rgba(108,99,255,0.1)', emoji: '😢' }
  return { color: '#4F8AFF', bg: 'rgba(79,138,255,0.1)', emoji: '😐' }
}

function tsToDate(ts) {
  if (!ts) return new Date(0)
  if (ts.toDate) return ts.toDate()
  return new Date(ts)
}

function formatDate(ts) {
  const d = tsToDate(ts)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { darkMode } = useTheme()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [recordings, setRecordings] = useState([])

  useEffect(() => {
    if (!user) return
    getRecordingsMeta(user.uid).then(setRecordings)
  }, [user])

  const filtered = recordings.filter(r => {
    const rel = r.analysis?.reliability || ''
    const matchFilter = filter === 'All' || rel === filter
    const matchSearch = r.filename?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      <div className="px-5 pt-12 pb-4 md:hidden bg-white dark:bg-[#1E1B4B] border-b border-gray-100 dark:border-transparent"
        style={{ borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Analyzed Recordings</h1>
            <p className="text-xs mt-0.5 text-gray-400 dark:text-white/45">
              {recordings.length} recordings
            </p>
          </div>
        </div>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none"
            stroke={darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}
            strokeWidth="2" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="search" placeholder="Search recordings..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
              color: darkMode ? 'white' : '#1F2937',
            }} />
        </div>
      </div>

      <div className="hidden md:flex items-center justify-between bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Analyzed Recordings</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{recordings.length} recordings</p>
        </div>
        <div className="relative w-72">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="search" placeholder="Search recordings..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border"
            style={{ background: '#F8F9FF', borderColor: '#E5E7EB', color: '#1F2937' }} />
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 md:px-8 flex flex-col gap-4 md:max-w-5xl md:w-full md:mx-auto">

        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
              style={
                filter === f
                  ? { background: '#6C63FF', color: '#fff' }
                  : { background: 'var(--filter-btn-bg, #fff)', color: '#9CA3AF', border: '1px solid #E5E7EB' }
              }>
              {f}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8 md:col-span-2">No recordings found</p>
          ) : filtered.map(rec => {
            const mood = rec.analysis?.primaryMood
            const ms = moodStyle(mood)
            const rel = rec.analysis?.reliability
            const isAnalyzed = rec.analysisStatus === 'done'
            return (
              <button key={rec.id} onClick={() => navigate(`/summary/${rec.id}`)}
                className="w-full bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <WaveBars />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{rec.filename}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {isAnalyzed && mood && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: ms.bg, color: ms.color }}>
                        {ms.emoji} {mood}
                      </span>
                    )}
                    {isAnalyzed && rel && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>
                        {rel} reliability
                      </span>
                    )}
                    {!isAnalyzed && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                        Not analyzed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDuration(rec.duration)} · {formatDate(rec.createdAt)}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
                  strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
