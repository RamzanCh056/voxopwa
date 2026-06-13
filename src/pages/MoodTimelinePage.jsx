import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecordingMeta } from '../services/firestoreService'

const MOOD_COLORS = {
  Stressed: '#EF4444', Angry: '#DC2626', Sad: '#3B82F6',
  Anxious: '#A855F7', Happy: '#FBBF24', Excited: '#F97316',
  Calm: '#10B981', Neutral: '#6B7280',
}
const MOOD_EMOJIS = {
  Stressed: '😰', Angry: '😠', Sad: '😢', Anxious: '😟',
  Happy: '😊', Excited: '🤩', Calm: '😌', Neutral: '😐',
}

function moodColor(mood) { return MOOD_COLORS[mood] || '#6B7280' }
function moodEmoji(mood) { return MOOD_EMOJIS[mood] || '😐' }

// Intensity → Y label mapping for area chart
const Y_LABELS = [
  { intensity: 4.5, label: 'Stressed' },
  { intensity: 2.5, label: 'Neutral' },
  { intensity: 0.5, label: 'Calm' },
]

export default function MoodTimelinePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [recording, setRecording] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [areaView, setAreaView] = useState(false)

  useEffect(() => {
    if (id && user) {
      getRecordingMeta(user.uid, id).then(rec => {
        setRecording(rec)
        setTimeline(rec?.analysis?.moodTimeline || [])
      })
    }
  }, [id, user])

  const maxIntensity = Math.max(...timeline.map(t => t.intensity || 1), 1)

  // Build SVG area/line path
  const svgH = 100
  const svgPadT = 10, svgPadB = 20
  const innerH = svgH - svgPadT - svgPadB

  function buildAreaPath(pts, width) {
    if (pts.length < 2) return { area: '', line: '' }
    const coords = pts.map((pt, i) => {
      const x = (i / (pts.length - 1)) * width
      const y = svgPadT + innerH - ((pt.intensity || 1) / 5) * innerH
      return { x, y }
    })
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
    const area = `${line} L${width},${svgH - svgPadB} L0,${svgH - svgPadB} Z`
    return { area, line, coords }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
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
            <h1 className="text-lg font-bold text-white">Mood Timeline</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{recording?.filename || '—'}</p>
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2B5B] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"
            strokeLinecap="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Mood Timeline</h1>
          <p className="text-xs text-gray-400">{recording?.filename || '—'}</p>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-6 md:pb-8 md:px-8 flex flex-col gap-4 md:max-w-4xl md:w-full md:mx-auto">

        {timeline.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-8 shadow-sm text-center">
            <p className="text-gray-400 text-sm">No timeline data available.</p>
          </div>
        ) : (
          <>
            {/* Chart card — tap to toggle */}
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm cursor-pointer select-none"
              onClick={() => setAreaView(v => !v)}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Mood Over Time</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded-full overflow-hidden border border-gray-200">
                    <span className="text-xs px-2.5 py-1 font-medium transition-colors"
                      style={{ background: !areaView ? '#6C63FF' : 'transparent', color: !areaView ? 'white' : '#6B7280' }}>
                      Bar
                    </span>
                    <span className="text-xs px-2.5 py-1 font-medium transition-colors"
                      style={{ background: areaView ? '#6C63FF' : 'transparent', color: areaView ? 'white' : '#6B7280' }}>
                      Line
                    </span>
                  </div>
                </div>
              </div>

              {!areaView ? (
                /* BAR VIEW: pill-shaped colored bars with emoji on top */
                <div className="flex items-end gap-1.5" style={{ height: 130 }}>
                  {timeline.map((seg, i) => {
                    const pct = ((seg.intensity || 1) / maxIntensity) * 100
                    const color = moodColor(seg.mood)
                    const barH = Math.max(pct * 0.9, 12)
                    return (
                      <div key={i} className="flex flex-col items-center flex-1" style={{ height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 12, lineHeight: 1, marginBottom: 4 }}>{moodEmoji(seg.mood)}</span>
                        <div className="w-full transition-all duration-500"
                          style={{
                            height: `${barH}%`,
                            background: color,
                            borderRadius: '10px 10px 6px 6px',
                            opacity: 0.85,
                            minHeight: 12,
                          }} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* LINE/AREA VIEW: smooth SVG with Y-labels, dots colored by mood */
                <div className="relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pb-5 pointer-events-none"
                    style={{ width: 48 }}>
                    {Y_LABELS.map(yl => (
                      <span key={yl.label} className="text-xs text-gray-300 text-right pr-1">{yl.label}</span>
                    ))}
                  </div>
                  <div style={{ marginLeft: 48 }}>
                    <svg viewBox={`0 0 300 ${svgH}`} className="w-full" style={{ height: svgH }}
                      preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F8AFF" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#4F8AFF" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const { area, line, coords = [] } = buildAreaPath(timeline, 300)
                        return (
                          <>
                            <path d={area} fill="url(#area-grad)" />
                            <path d={line} fill="none" stroke="#4F8AFF" strokeWidth="2.5"
                              strokeLinejoin="round" strokeLinecap="round" />
                            {coords.map((c, i) => (
                              <circle key={i} cx={c.x} cy={c.y} r="4"
                                fill={moodColor(timeline[i]?.mood)}
                                stroke="white" strokeWidth="1.5" />
                            ))}
                          </>
                        )
                      })()}
                    </svg>
                    {/* X-axis labels */}
                    <div className="flex justify-between mt-1 px-0.5">
                      {timeline.map((seg, i) => (
                        (i === 0 || i === Math.floor(timeline.length / 2) || i === timeline.length - 1) ? (
                          <span key={i} className="text-xs text-gray-300">{seg.time}</span>
                        ) : <span key={i} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom time labels for bar view */}
              {!areaView && (
                <div className="flex gap-1.5 mt-2">
                  {timeline.map((seg, i) => (
                    <div key={i} className="flex-1 text-center">
                      <span className="text-gray-300" style={{ fontSize: 8 }}>{seg.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time segment cards */}
            <div>
              <p className="font-semibold text-gray-800 dark:text-white text-sm mb-3">Time Segments</p>
              <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3">
                {timeline.map((seg, i) => {
                  const color = moodColor(seg.mood)
                  return (
                    <div key={i} className="bg-white dark:bg-[#1E1B4B] rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3"
                      style={{ borderLeft: `4px solid ${color}` }}>
                      <span className="text-2xl flex-shrink-0">{moodEmoji(seg.mood)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{seg.time}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: `${color}18`, color }}>
                            {seg.mood}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: 5 }).map((_, dot) => (
                            <div key={dot} className="w-1.5 h-1.5 rounded-full transition-colors"
                              style={{ background: dot < (seg.intensity || 1) ? color : '#E5E7EB' }} />
                          ))}
                          <span className="text-xs text-gray-400 ml-0.5">intensity {seg.intensity}/5</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Back to summary */}
            <button onClick={() => navigate(`/summary/${id}`)}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white mt-2"
              style={{ background: 'linear-gradient(135deg,#4F8AFF,#6C63FF)' }}>
              Back to Summary
            </button>
          </>
        )}
      </div>
    </div>
  )
}
