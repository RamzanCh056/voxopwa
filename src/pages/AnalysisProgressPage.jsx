import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAnalysis } from '../hooks/useAnalysis'
import { useAuth } from '../context/AuthContext'
import { saveAnalysis } from '../services/firestoreService'

const STEPS = [
  { label: 'Transcribing audio', detail: 'Converting speech to text with AI…' },
  { label: 'Analyzing communication', detail: 'Detecting mood, tone & patterns…' },
  { label: 'Generating your report', detail: 'Building personalized insights…' },
]

function CircularProgress({ pct }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#E8EAF0" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none"
          stroke="url(#prog-grad)" strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
        <defs>
          <linearGradient id="prog-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#4F8AFF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-800">{pct}%</span>
        <span className="text-xs text-gray-400">complete</span>
      </div>
    </div>
  )
}

export default function AnalysisProgressPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { progress, stepIndex, currentStep, error, isComplete, result, insufficientMinutes, runAnalysis } = useAnalysis()

  useEffect(() => {
    if (id) runAnalysis(id)
  }, [id, runAnalysis])

  useEffect(() => {
    if (isComplete && result && user && id) {
      saveAnalysis(user.uid, id, result)
        .catch(console.error)
        .finally(() => {
          setTimeout(() => navigate(`/summary/${id}`, { replace: true }), 500)
        })
    }
  }, [isComplete, result, user, id, navigate])

  if (insufficientMinutes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-6 shadow-sm text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(108,99,255,0.12)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2"
              strokeLinecap="round" className="w-7 h-7">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="font-bold text-gray-800 dark:text-white mb-2">Out of Minutes</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            You've used all your analysis minutes. Subscribe or top up to continue.
          </p>
          <button onClick={() => navigate('/billing')}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm mb-2"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
            View Plans
          </button>
          <button onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl text-gray-500 dark:text-gray-400 font-semibold text-sm">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    const isNotFound = error.includes('not found in local storage') || error.includes('re-import')
    return (
      <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="flex items-center gap-3 px-5 pt-12 pb-5 bg-white dark:bg-[#1A1740] border-b border-gray-100 dark:border-[#2E2B5B]">
          <button onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(108,99,255,0.08)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-800 dark:text-white">Analysis Failed</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div className="text-center max-w-sm">
            <p className="font-bold text-gray-800 dark:text-white text-lg mb-2">
              {isNotFound ? 'Audio Not Found' : 'Analysis Failed'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {isNotFound
                ? 'The audio file is no longer in your local storage. Please go back and re-upload the file to analyze it.'
                : error}
            </p>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            {!isNotFound && (
              <button onClick={() => id && runAnalysis(id)}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                Try Again
              </button>
            )}
            <button onClick={() => navigate('/')}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-white dark:bg-[#1E1B4B] border-2"
              style={{ borderColor: '#6C63FF', color: '#6C63FF' }}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen px-5 py-12 bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">
      <div className="w-full max-w-sm md:max-w-md flex flex-col items-center gap-8 pt-8">

        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Analyzing Recording</h1>
          <p className="text-sm text-gray-400 mt-1">This usually takes 15–30 seconds</p>
        </div>

        <CircularProgress pct={progress} />

        <div className="w-full bg-white dark:bg-[#1E1B4B] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          {STEPS.map((step, i) => {
            const done = i < stepIndex
            const active = i === stepIndex

            return (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: done ? '#6C63FF' : active ? 'rgba(108,99,255,0.12)' : '#F0F2F7',
                  }}
                >
                  {done ? (
                    <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : active ? (
                    <span className="w-3 h-3 rounded-full"
                      style={{ background: '#6C63FF', animation: 'pulse-dot 1s ease-in-out infinite' }} />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#D1D5DB' }} />
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium transition-colors"
                    style={{ color: done ? '#6C63FF' : active ? '#1F2937' : '#9CA3AF' }}>
                    {step.label}
                  </p>
                  {active && (
                    <p className="text-xs text-gray-400 mt-0.5">{step.detail}</p>
                  )}
                </div>

                {done && (
                  <span className="text-xs font-medium" style={{ color: '#6C63FF' }}>Done</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{currentStep}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: '#E0E3EB' }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6C63FF,#4F8AFF)' }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-12 h-12 rounded-full flex items-center justify-center mt-8"
        style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
        aria-label="Cancel analysis"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
          strokeLinecap="round" className="w-5 h-5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <style>{`
        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(0.75); }
        }
      `}</style>
    </div>
  )
}
