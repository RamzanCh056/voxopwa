import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRecording, friendlyFileType, deleteRecording } from '../services/storageService'
import { getRecordingMeta, deleteRecordingMeta, getUserMinutes } from '../services/firestoreService'
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
  const [minutesRemaining, setMinutesRemaining] = useState(null)
  const [recordingType, setRecordingType] = useState('general')

  useEffect(() => {
    if (!id) return
    getRecording(id).then(rec => setRecording(rec))
    if (user) {
      getRecordingMeta(user.uid, id).then(m => {
        setMeta(m)
        if (m?.recordingType) setRecordingType(m.recordingType)
      })
      getUserMinutes(user.uid).then(m => setMinutesRemaining(m.remaining))
    }
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
              <p className="text-xs text-gray-400 mb-1">Style</p>
              <p className="text-xl mb-0.5">🎯</p>
              <p className="font-bold text-gray-800 dark:text-white text-sm">{analysis.communicationStyle || '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: '#22C55E' }}>{analysis.clarityScore ?? 0}/100</p>
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

        {/* Pre-analysis state */}
        {!analysis && (
          <>
            {/* CTA banner */}
            <div className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: 'linear-gradient(135deg,#6C63FF 0%,#4F8AFF 100%)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-white text-sm">Ready to analyze</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Tap "Get Started" to transcribe &amp; coach this recording with AI
                </p>
              </div>
            </div>

            {/* What the report includes */}
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">
                Your report will include
              </p>
              {[
                { emoji: '😌', label: 'Mood & Emotion', desc: 'Primary mood and emotion breakdown from what was said' },
                { emoji: '🎯', label: 'Communication Style', desc: 'Direct, Diplomatic, Assertive — how you come across' },
                { emoji: '📈', label: 'Sentiment Flow', desc: 'How your tone shifted throughout the conversation' },
                { emoji: '✨', label: 'AI Coaching', desc: 'What went well, what to improve, suggested phrases' },
                { emoji: '📝', label: 'Full Transcript', desc: 'Every word with accurate timestamps from Whisper AI' },
              ].map((item, i, arr) => (
                <div key={item.label}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
                    strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              ))}
            </div>

            {/* Duration estimate */}
            <div className="flex items-center gap-2 px-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Analysis takes 15–30 seconds · uses {Math.max(1, Math.ceil((duration || 60) / 60))} minute{Math.ceil((duration || 60) / 60) > 1 ? 's' : ''} from your plan
              </p>
            </div>
          </>
        )}

        {/* Recording type selector */}
        {!analysis && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Recording Type</p>
            <div className="flex gap-2 flex-wrap">
              {['general', 'sales', 'interview', 'meeting'].map(t => (
                <button key={t} onClick={() => setRecordingType(t)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
                  style={recordingType === t
                    ? { background: '#6C63FF', color: '#fff' }
                    : { background: 'rgba(108,99,255,0.08)', color: '#6C63FF', border: '1px solid rgba(108,99,255,0.2)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-auto pt-2">
          {minutesRemaining === 0 ? (
            <div className="flex flex-col gap-2">
              <div className="w-full py-3.5 rounded-2xl text-center text-sm font-semibold"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                0 minutes remaining
              </div>
              <button onClick={() => navigate('/billing')}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                Top Up Minutes →
              </button>
            </div>
          ) : (
            <button
              onClick={() => id && navigate(`/progress/${id}`, { state: { recordingType } })}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all"
              style={{ background: analysis ? 'transparent' : 'linear-gradient(135deg,#6C63FF,#4F8AFF)', border: analysis ? '2px solid #6C63FF' : 'none', color: analysis ? '#6C63FF' : 'white', boxShadow: analysis ? 'none' : '0 6px 24px rgba(108,99,255,0.4)' }}>
              {analysis ? 'Re-Analyze' : 'Get Started →'}
            </button>
          )}

          {analysis && (
            <button
              onClick={() => navigate(`/summary/${id}`)}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#4F8AFF,#6C63FF)', boxShadow: '0 6px 24px rgba(79,138,255,0.35)' }}>
              View Full Report
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
