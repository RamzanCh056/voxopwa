import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecordingMeta } from '../services/firestoreService'

const W = 300
const H = 80

function buildPath(points, close = false) {
  const step = W / Math.max(points.length - 1, 1)
  const coords = points.map((p, i) => [i * step, H - (p / 5) * H])
  let d = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  if (close && coords.length > 1) {
    d += ` L${W},${H} L0,${H} Z`
  }
  return d
}

function AreaChart({ timeline }) {
  const points = timeline.map(t => t.intensity || 1)
  if (points.length < 2) return null
  const linePath = buildPath(points, false)
  const areaPath = buildPath(points, true)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#area-grad)" />
      <path d={linePath} fill="none" stroke="#22C55E" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const x = (i / (points.length - 1)) * W
        const y = H - (p / 5) * H
        return <circle key={i} cx={x} cy={y} r="3" fill="#22C55E" />
      })}
    </svg>
  )
}

function reliabilityStyle(label) {
  if (!label) return { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' }
  const l = label.toLowerCase()
  if (l === 'high') return { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', border: 'rgba(34,197,94,0.25)' }
  if (l === 'low') return { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' }
  return { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' }
}

export default function ReliabilityInsightsPage() {
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

  const a = analysis || {}
  const timeline = a.moodTimeline || []
  const insights = a.insights || []
  const style = reliabilityStyle(a.reliability)

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      <div className="px-5 pt-12 pb-5 md:hidden"
        style={{ background: '#1E1B4B', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Reliability Insights</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{recording?.filename || '—'}</p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2B5B] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"
            strokeLinecap="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Reliability Insights</h1>
          <p className="text-xs text-gray-400">{recording?.filename || '—'}</p>
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 pb-24 md:pb-8 md:px-8 flex flex-col gap-4 md:max-w-4xl md:w-full md:mx-auto">

        {!analysis ? (
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-8 shadow-sm text-center">
            <p className="text-gray-400 text-sm">No analysis available yet.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl px-4 py-4 flex items-center gap-4"
              style={{
                background: `linear-gradient(135deg,${style.bg},transparent)`,
                border: `1px solid ${style.border}`,
              }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: style.bg }}>
                <svg viewBox="0 0 24 24" fill={style.color} className="w-7 h-7">
                  <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">{a.reliability || '—'} Reliability</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Overall score of <strong>{a.reliabilityScore ?? 0}/100</strong>. {a.honestyLabel || ''}
                </p>
              </div>
            </div>

            {timeline.length >= 2 && (
              <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">Reliability Over Time</p>
                  <span className="text-xs font-bold" style={{ color: '#22C55E' }}>
                    Score {a.reliabilityScore ?? 0}%
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex flex-col justify-between h-20 text-right flex-shrink-0" style={{ width: 28 }}>
                    {['5', '3', '1'].map(l => (
                      <span key={l} className="text-xs text-gray-300 leading-none">{l}</span>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    <AreaChart timeline={timeline} />
                  </div>
                </div>
                <div className="flex justify-between mt-1 pl-9">
                  {[0, Math.floor(timeline.length / 4), Math.floor(timeline.length / 2), Math.floor(timeline.length * 3 / 4), timeline.length - 1]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map(i => (
                      <span key={i} className="text-xs text-gray-300">{timeline[i]?.time || ''}</span>
                    ))}
                </div>
              </div>
            )}

            {insights.length > 0 && (
              <div>
                <p className="font-semibold text-gray-800 dark:text-white text-sm mb-3">Key Insights</p>
                <div className="flex flex-col gap-3 md:grid md:grid-cols-3">
                  {insights.map((ins, i) => (
                    <div key={i} className="bg-white dark:bg-[#1E1B4B] rounded-2xl px-4 py-3.5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                          style={{ background: '#F59E0B' }} />
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{ins}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
