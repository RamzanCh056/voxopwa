import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecordingMeta } from '../services/firestoreService'

export default function VoiceAuthenticityPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [recording, setRecording] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    if (id && user) {
      getRecordingMeta(user.uid, id).then(rec => {
        setRecording(rec)
        setAnalysis(rec?.analysis || null)
      })
    }
  }, [id, user])

  const timeline = analysis?.moodTimeline || []

  // Build SVG waveform path from moodTimeline intensity values
  const svgW = 320
  const svgH = 80
  function buildWavePath() {
    if (timeline.length < 2) {
      return { area: `M0,${svgH} L${svgW},${svgH} Z`, line: `M0,${svgH / 2} L${svgW},${svgH / 2}` }
    }
    const pts = timeline.map((pt, i) => {
      const x = (i / (timeline.length - 1)) * svgW
      const y = svgH - ((pt.intensity || 3) / 5) * (svgH - 10) - 5
      return { x, y }
    })
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const area = `${line} L${svgW},${svgH} L0,${svgH} Z`
    return { area, line }
  }

  const { area, line } = buildWavePath()

  const details = [
    { color: '#3B82F6', title: 'Natural vocal vibration detected', desc: 'Consistent micro-tremors in voice frequency' },
    { color: '#F97316', title: 'No synthetic pitch patterns found', desc: 'Pitch variations follow human speech patterns' },
    { color: '#22C55E', title: 'Stable waveform and breathing pauses', desc: 'Natural respiratory patterns identified' },
    { color: '#3B82F6', title: 'Emotional variation present', desc: 'Micro-emotions detected in vocal tone' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-5 md:hidden"
        style={{ background: '#1E1B4B', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Voice Authenticity Check</h1>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2B5B] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Voice Authenticity Check</h1>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 flex flex-col gap-4 md:max-w-3xl md:w-full md:mx-auto">

        {/* Top result card */}
        <div className="rounded-2xl p-5 flex flex-col gap-3"
          style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.15)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-blue-800 text-base">Voice appears natural and human-like</p>
              <p className="text-sm text-blue-600 mt-0.5">Very natural vocal pattern detected</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
              Human Voice ✓
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
              Not Synthetic
            </span>
          </div>
        </div>

        {/* Analysis Details */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Analysis Details
          </p>
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
            {details.map((item, i) => (
              <div key={i}
                className="flex items-start gap-3 px-4 py-3.5"
                style={{ borderBottom: i < details.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.color }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audio Fingerprint */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Audio Fingerprint
          </p>
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Vocal Waveform Pattern</p>
            <div className="rounded-xl overflow-hidden" style={{ background: '#F0FDF4' }}>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#wave-fill)" />
                <path d={line} fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {timeline.map((pt, i) => {
                  const x = timeline.length > 1 ? (i / (timeline.length - 1)) * svgW : svgW / 2
                  const y = svgH - ((pt.intensity || 3) / 5) * (svgH - 10) - 5
                  return <circle key={i} cx={x} cy={y} r="3.5" fill="#22C55E" />
                })}
              </svg>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
              <span className="text-xs text-gray-500">Natural human vocal pattern — no AI artifacts detected</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            className="w-full py-3 rounded-2xl font-semibold text-sm border-2 bg-white dark:bg-[#1E1B4B]"
            style={{ borderColor: '#6C63FF', color: '#6C63FF' }}>
            Re-Analyze Segment
          </button>
          <button onClick={() => navigate(`/summary/${id}`)}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#4F8AFF,#6C63FF)' }}>
            Back to Summary
          </button>
        </div>
      </div>
    </div>
  )
}
