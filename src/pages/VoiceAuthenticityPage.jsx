import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecordingMeta } from '../services/firestoreService'

function segTime(sec) {
  if (sec == null) return ''
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

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

  const transcription = analysis?.transcription || ''
  const segments = analysis?.transcriptionSegments || []
  const style = analysis?.communicationStyle
  const sentimentFlow = analysis?.sentimentFlow
  const clarityScore = analysis?.clarityScore ?? null

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
          <h1 className="text-lg font-bold text-white">Transcript</h1>
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
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Transcript</h1>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 flex flex-col gap-4 md:max-w-3xl md:w-full md:mx-auto">

        {!analysis ? (
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-8 shadow-sm text-center">
            <p className="text-gray-400 text-sm">No analysis available yet.</p>
          </div>
        ) : (
          <>
            {/* Communication style badges */}
            {(style || sentimentFlow || clarityScore != null) && (
              <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Communication Analysis
                </p>
                <div className="flex flex-wrap gap-2">
                  {style && (
                    <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                      {style} style
                    </span>
                  )}
                  {sentimentFlow && (
                    <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{ background: 'rgba(79,138,255,0.1)', color: '#4F8AFF' }}>
                      {sentimentFlow} sentiment
                    </span>
                  )}
                  {clarityScore != null && (
                    <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{
                        background: clarityScore >= 70
                          ? 'rgba(34,197,94,0.12)' : clarityScore >= 40
                          ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                        color: clarityScore >= 70 ? '#22C55E' : clarityScore >= 40 ? '#F59E0B' : '#EF4444',
                      }}>
                      {clarityScore}% clarity
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Full transcript */}
            {transcription ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Full Transcript
                </p>
                <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {transcription}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-5 shadow-sm text-center">
                <p className="text-sm text-gray-400">Transcription not available for this recording.</p>
              </div>
            )}

            {/* Timed segments */}
            {segments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Timed Segments
                </p>
                <div className="flex flex-col gap-2">
                  {segments.map((seg, i) => (
                    <div key={i} className="bg-white dark:bg-[#1E1B4B] rounded-xl px-4 py-3 shadow-sm flex items-start gap-3">
                      <span className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF', minWidth: 40, textAlign: 'center' }}>
                        {segTime(seg.start)}
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{seg.text?.trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back button */}
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
