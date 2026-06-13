import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRecording, friendlyFileType, deleteRecording } from '../services/storageService'
import { getRecordingMeta, deleteRecordingMeta } from '../services/firestoreService'
import { useAuth } from '../context/AuthContext'

function formatDuration(secs) {
  if (!secs && secs !== 0) return 'Calculating...'
  if (!secs) return 'Calculating...'
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')} min`
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : (iso.toDate ? iso.toDate() : new Date(iso))
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const insightDots = [
  { color: '#22C55E', prefix: 'Calm start' },
  { color: '#F97316', prefix: 'Stress spike' },
  { color: '#22C55E', prefix: 'Smooth ending' },
]

export default function RecordingPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [recording, setRecording] = useState(null)
  const [meta, setMeta] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getRecording(id).then(rec => setRecording(rec))
    if (user) getRecordingMeta(user.uid, id).then(m => setMeta(m))
  }, [id, user])

  const analysis = recording?.analysis || meta?.analysis || null
  const filename = recording?.filename || meta?.filename || '—'
  const duration = recording?.duration || meta?.duration || 0
  const date = recording?.date || meta?.createdAt || null
  const fileType = friendlyFileType(filename, recording?.audioBlob?.type)

  async function handleDelete() {
    if (!confirm('Delete this recording? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteRecording(id)
      if (user) await deleteRecordingMeta(user.uid, id)
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  // Build insight descriptions from analysis
  const insights = analysis?.insights || []
  const insightRows = insightDots.map((dot, i) => ({
    color: dot.color,
    text: insights[i] || `${dot.prefix} — voice pattern within normal range`,
  }))

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-5 md:hidden"
        style={{ background: '#1E1B4B', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Recording Details</h1>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2B5B] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"
            strokeLinecap="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Recording Details</h1>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 flex flex-col gap-4 md:max-w-3xl md:w-full md:mx-auto">

        {/* File info card */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#4F8AFF,#6C63FF)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800 dark:text-white text-sm">{filename}</p>
              {fileType === 'WhatsApp Audio' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                  style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
                  WhatsApp
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Duration: {formatDuration(duration)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Analyzed: {formatDate(date)}
              </span>
            </div>
          </div>
        </div>

        {/* Stat cards — only show if analysis exists */}
        {analysis && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">Mood</p>
              <p className="text-xl mb-0.5">{analysis.primaryMoodEmoji || '😐'}</p>
              <p className="font-bold text-gray-800 dark:text-white text-sm">{analysis.primaryMood || '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6C63FF' }}>{analysis.confidence ?? 0}%</p>
            </div>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-400 mb-1">Reliability</p>
              <p className="text-xl mb-0.5">🛡️</p>
              <p className="font-bold text-gray-800 dark:text-white text-sm">{analysis.reliability || '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: '#22C55E' }}>{analysis.reliabilityScore ?? 0}/100</p>
            </div>
          </div>
        )}

        {/* Key insights */}
        {analysis && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
              Key Insights
            </p>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
              {insightRows.map((row, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3.5"
                  style={{ borderBottom: i < insightRows.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: row.color }} />
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{row.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What We'll Detect — shown when no analysis yet */}
        {!analysis && (
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              What We'll Detect
            </p>
            <div className="flex flex-wrap gap-2">
              {['Mood', 'Stress level', 'Intent', 'Confidence', 'Honesty signals', 'Emotional tone'].map(tag => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(108,99,255,0.08)', color: '#6C63FF' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-auto pt-2">
          <button
            onClick={() => id && navigate(`/progress/${id}`)}
            disabled={!recording}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm border-2 disabled:opacity-50 transition-all bg-white dark:bg-[#1E1B4B]"
            style={{ borderColor: '#6C63FF', color: '#6C63FF' }}>
            {analysis ? 'Re-Analyze' : 'Get Started'}
          </button>

          {analysis && (
            <button
              onClick={() => navigate(`/reliability/${id}`)}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#4F8AFF,#6C63FF)', boxShadow: '0 6px 24px rgba(79,138,255,0.35)' }}>
              View Reliability Insights
            </button>
          )}

          <div className="flex items-center justify-between pt-1">
            <button onClick={handleDelete} disabled={deleting}
              className="text-sm font-medium disabled:opacity-50"
              style={{ color: '#EF4444' }}>
              {deleting ? 'Deleting…' : 'Delete Recording'}
            </button>
            {analysis && (
              <button onClick={() => navigate(`/export/${id}`)}
                className="text-sm font-medium"
                style={{ color: '#6C63FF' }}>
                Export Summary PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
