import { useState, useRef, useCallback } from 'react'

const CATEGORIES = ['Business Call', 'Interview', 'Relationship', 'Conflict']

const TIPS = {
  'Business Call': [
    'Speak at a steady, measured pace',
    'Use confident, declarative sentences',
    'Pause before answering complex questions',
  ],
  Interview: [
    'Maintain even vocal tone throughout',
    'Avoid filler words like "um" and "uh"',
    'Show enthusiasm without sounding rehearsed',
  ],
  Relationship: [
    "Mirror the other person's emotional pace",
    'Keep an open, warm tone',
    'Listen actively — silence is okay',
  ],
  Conflict: [
    'Lower your vocal pitch to signal calm',
    'Breathe before responding',
    'Use "I" statements, not "you" accusations',
  ],
}

const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

async function getCoachingTip(transcription, category) {
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `You are a real-time communication coach. Context: ${category}.
Analyze this speech snippet and give ONE short coaching tip (max 15 words).
Return JSON only: { "feedback": string, "mood": string, "emoji": string, "tone": string }
Speech: "${transcription || '(silence detected)'}"`,
      }],
    }),
  })
  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || '{}'
  return JSON.parse(text)
}

export default function CheckInPage() {
  const [activeCategory, setActiveCategory] = useState('Business Call')
  const [isRecording, setIsRecording] = useState(false)
  const [feedbackList, setFeedbackList] = useState([])
  const [loading, setLoading] = useState(false)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunkIntervalRef = useRef(null)
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')

  const startCoaching = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.onresult = e => {
          let t = ''
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) t += e.results[i][0].transcript + ' '
          }
          transcriptRef.current = t.trim()
        }
        recognition.start()
        recognitionRef.current = recognition
      }

      setIsRecording(true)
      transcriptRef.current = ''

      chunkIntervalRef.current = setInterval(async () => {
        const transcript = transcriptRef.current
        transcriptRef.current = ''
        setLoading(true)
        try {
          const tip = await getCoachingTip(transcript, activeCategory)
          setFeedbackList(prev => [tip, ...prev].slice(0, 5))
        } catch {
          // silently skip on API error
        } finally {
          setLoading(false)
        }
      }, 4000)
    } catch (err) {
      console.error('Mic error:', err)
    }
  }, [activeCategory])

  const stopCoaching = useCallback(() => {
    clearInterval(chunkIntervalRef.current)
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }, [])

  function toggleListening() {
    if (isRecording) stopCoaching()
    else startCoaching()
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      <div className="px-5 pt-12 pb-5 md:hidden"
        style={{ background: '#1E1B4B', borderRadius: '0 0 28px 28px' }}>
        <h1 className="text-xl font-bold text-white">Live Coach</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Real-time voice feedback during your conversation
        </p>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all"
              style={
                activeCategory === cat
                  ? { background: '#6C63FF', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
              }>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:block bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Live Coach</h1>
            <p className="text-sm text-gray-400 mt-0.5">Real-time voice feedback during your conversation</p>
          </div>
        </div>
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
              style={
                activeCategory === cat
                  ? { background: '#6C63FF', color: '#fff' }
                  : { background: '#F0F2F7', color: '#6B7280', border: '1px solid #E5E7EB' }
              }>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-24 md:pb-8 md:px-8 flex flex-col gap-4 md:max-w-5xl md:w-full md:mx-auto">

        <div className="md:grid md:grid-cols-2 md:gap-4 flex flex-col gap-4">

          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4">
            {!isRecording ? (
              <p className="text-sm text-gray-400 font-medium">Tap to start coaching</p>
            ) : (
              <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                {loading ? 'Analyzing…' : 'Listening…'}
              </p>
            )}

            <div className="relative flex items-center justify-center">
              {isRecording && (
                <>
                  <span className="absolute w-28 h-28 rounded-full animate-ping"
                    style={{ background: 'rgba(239,68,68,0.08)', animationDuration: '1.5s' }} />
                  <span className="absolute w-24 h-24 rounded-full animate-ping"
                    style={{ background: 'rgba(239,68,68,0.08)', animationDuration: '1.5s', animationDelay: '0.4s' }} />
                </>
              )}
              <button
                onClick={toggleListening}
                className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: isRecording
                    ? 'linear-gradient(135deg,#EF4444,#F87171)'
                    : '#E8EAF0',
                  boxShadow: isRecording
                    ? '0 6px 28px rgba(239,68,68,0.45)'
                    : '0 2px 12px rgba(0,0,0,0.08)',
                }}
                aria-label={isRecording ? 'Stop coaching' : 'Start coaching'}
              >
                <svg viewBox="0 0 24 24" fill={isRecording ? 'white' : '#9CA3AF'} className="w-8 h-8">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"
                    stroke={isRecording ? 'white' : '#9CA3AF'} strokeWidth="2"
                    fill="none" strokeLinecap="round" />
                  <line x1="12" y1="19" x2="12" y2="22"
                    stroke={isRecording ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" />
                  <line x1="9" y1="22" x2="15" y2="22"
                    stroke={isRecording ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {isRecording && (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="rounded-full"
                    style={{
                      width: 4, height: 4 + (i % 3) * 8, background: '#EF4444',
                      opacity: 0.4 + (i % 3) * 0.2,
                      animation: `bar-bounce 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                    }} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex flex-col gap-3 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full"
                style={{ background: isRecording ? '#22C55E' : '#D1D5DB' }} />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Live Feedback</p>
            </div>

            {feedbackList.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-3">
                {isRecording ? 'Waiting for speech…' : 'Start coaching to see live feedback here'}
              </p>
            ) : (
              feedbackList.map((tip, i) => (
                <div key={i} className="rounded-xl p-3 transition-all"
                  style={{ background: i === 0 ? 'rgba(108,99,255,0.06)' : '#F8F9FF', opacity: 1 - i * 0.15 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{tip.emoji}</span>
                    <span className="text-xs font-semibold text-gray-700">{tip.mood}</span>
                    {tip.tone && (
                      <span className="text-xs text-gray-400">· {tip.tone}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">{tip.feedback}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <svg viewBox="0 0 24 24" fill="#F59E0B" className="w-4 h-4">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.55-1.37 4.78-3.4 6.01L15 17H9l-.6-1.99A7.001 7.001 0 0 1 12 2zm0 18a1 1 0 0 1-1-1h2a1 1 0 0 1-1 1zm-1-3h2v-1h-2v1z" />
            </svg>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tips for {activeCategory}
            </p>
          </div>
          <ul className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3">
            {TIPS[activeCategory].map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                  {i + 1}
                </span>
                <p className="text-sm text-gray-600 leading-snug">{tip}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes bar-bounce { from { transform: scaleY(0.5); } to { transform: scaleY(1.4); } }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>
    </div>
  )
}
