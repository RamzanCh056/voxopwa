import { useState, useRef, useCallback, useEffect } from 'react'

const CATEGORIES = ['Business Call', 'Interview', 'Relationship', 'Conflict']

const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

async function getCoachingTip(transcription, category) {
  if (!transcription.trim()) return null
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `You are a real-time communication coach. Context: ${category} conversation.
Analyze this speech snippet and give ONE short, specific coaching tip based on exactly what was said (max 18 words).
Only comment on what was actually spoken — do NOT mention voice, tone, pitch, or acoustic properties.
Return JSON only: { "feedback": string, "mood": string, "emoji": string }
Speech: "${transcription}"`,
      }],
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || '{}'
  try { return JSON.parse(text) } catch { return null }
}

export default function CheckInPage() {
  const [activeCategory, setActiveCategory] = useState('Business Call')
  const [isRecording, setIsRecording]       = useState(false)
  const [feedbackList, setFeedbackList]     = useState([])
  const [loading, setLoading]               = useState(false)
  const [finalTranscript, setFinalTranscript] = useState('')
  const [interimText, setInterimText]       = useState('')

  const streamRef        = useRef(null)
  const chunkIntervalRef = useRef(null)
  const recognitionRef   = useRef(null)
  const pendingChunkRef  = useRef('')  // accumulates text since last API call

  const startCoaching = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      if (!SpeechRecognition) {
        alert('Live transcription is not supported in this browser. Try Chrome.')
        stream.getTracks().forEach(t => t.stop())
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous      = true
      recognition.interimResults  = true
      recognition.lang            = 'en-US'

      recognition.onresult = e => {
        let interim = ''
        let newFinal = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const txt = e.results[i][0].transcript
          if (e.results[i].isFinal) {
            newFinal += txt + ' '
          } else {
            interim += txt
          }
        }
        if (newFinal) {
          setFinalTranscript(prev => prev + newFinal)
          pendingChunkRef.current += newFinal
        }
        setInterimText(interim)
      }

      recognition.onerror = () => { setInterimText('') }
      recognition.onend   = () => { setInterimText('') }

      recognition.start()
      recognitionRef.current = recognition

      setIsRecording(true)
      setFinalTranscript('')
      setInterimText('')
      setFeedbackList([])
      pendingChunkRef.current = ''

      // Send accumulated chunk to GPT every 6 seconds
      chunkIntervalRef.current = setInterval(async () => {
        const chunk = pendingChunkRef.current.trim()
        if (!chunk) return
        pendingChunkRef.current = ''
        setLoading(true)
        try {
          const tip = await getCoachingTip(chunk, activeCategory)
          if (tip) setFeedbackList(prev => [{ ...tip, snippet: chunk }, ...prev].slice(0, 6))
        } catch { /* skip */ }
        finally { setLoading(false) }
      }, 6000)

    } catch (err) {
      console.error('Mic error:', err)
      alert('Microphone access denied. Please allow microphone access to use Live Coach.')
    }
  }, [activeCategory])

  const stopCoaching = useCallback(() => {
    clearInterval(chunkIntervalRef.current)
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setIsRecording(false)
    setInterimText('')
  }, [])

  function toggleListening() {
    if (isRecording) stopCoaching()
    else startCoaching()
  }

  // Stop when category changes mid-session
  useEffect(() => {
    if (isRecording) stopCoaching()
  }, [activeCategory])

  const displayTranscript = finalTranscript + interimText

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-5 md:hidden"
        style={{ background: '#1E1B4B', borderRadius: '0 0 28px 28px' }}>
        <h1 className="text-xl font-bold text-white">Live Coach</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Real-time coaching based on what you say
        </p>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all"
              style={activeCategory === cat
                ? { background: '#6C63FF', color: '#fff' }
                : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:block bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Live Coach</h1>
            <p className="text-sm text-gray-400 mt-0.5">Real-time coaching based on what you say</p>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#EF4444' }}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {loading ? 'Analyzing…' : 'Listening…'}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
              style={activeCategory === cat
                ? { background: '#6C63FF', color: '#fff' }
                : { background: '#F0F2F7', color: '#6B7280', border: '1px solid #E5E7EB' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-24 md:pb-8 md:px-8 flex flex-col gap-4 md:max-w-5xl md:w-full md:mx-auto">

        {/* Mic button */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4">
          {!isRecording
            ? <p className="text-sm text-gray-400 font-medium">Tap to start — speak naturally</p>
            : <p className="text-sm font-semibold md:hidden" style={{ color: '#EF4444' }}>
                {loading ? 'Analyzing…' : 'Listening…'}
              </p>
          }

          <div className="relative flex items-center justify-center">
            {isRecording && (
              <>
                <span className="absolute w-28 h-28 rounded-full animate-ping"
                  style={{ background: 'rgba(239,68,68,0.08)', animationDuration: '1.5s' }} />
                <span className="absolute w-24 h-24 rounded-full animate-ping"
                  style={{ background: 'rgba(239,68,68,0.08)', animationDuration: '1.5s', animationDelay: '0.4s' }} />
              </>
            )}
            <button onClick={toggleListening}
              className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: isRecording ? 'linear-gradient(135deg,#EF4444,#F87171)' : '#E8EAF0',
                boxShadow: isRecording ? '0 6px 28px rgba(239,68,68,0.45)' : '0 2px 12px rgba(0,0,0,0.08)',
              }}>
              {isRecording ? (
                <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="#9CA3AF" className="w-8 h-8">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="9" y1="22" x2="15" y2="22" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>

          {isRecording && (
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5,6,7,8].map(i => (
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

        {/* Live transcript */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex flex-col gap-2" style={{ minHeight: 120 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full"
              style={{ background: isRecording ? '#22C55E' : '#D1D5DB' }} />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Live Transcript
            </p>
            {finalTranscript && (
              <button
                onClick={() => { setFinalTranscript(''); setInterimText('') }}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600">
                Clear
              </button>
            )}
          </div>

          {!displayTranscript ? (
            <p className="text-sm text-gray-300 dark:text-gray-600 italic">
              {isRecording ? 'Start speaking — your words will appear here…' : 'Start the mic to see your transcript'}
            </p>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {finalTranscript}
              {interimText && (
                <span className="text-gray-400 dark:text-gray-500 italic">{interimText}</span>
              )}
            </p>
          )}
        </div>

        {/* AI coaching feedback */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex flex-col gap-3" style={{ minHeight: 140 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">✨</span>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              AI Coaching
            </p>
            {loading && (
              <svg className="animate-spin w-3.5 h-3.5 ml-auto" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#6C63FF" strokeWidth="4"/>
                <path className="opacity-75" fill="#6C63FF" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
              </svg>
            )}
          </div>

          {feedbackList.length === 0 ? (
            <p className="text-sm text-gray-300 dark:text-gray-600 italic">
              {isRecording
                ? 'Coaching tips will appear every few seconds as you speak…'
                : 'Start speaking to get real-time coaching'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {feedbackList.map((tip, i) => (
                <div key={i}
                  className="rounded-xl p-3 transition-all"
                  style={{
                    background: i === 0 ? 'rgba(108,99,255,0.06)' : (i === 1 ? '#FAFAFA' : '#F8F9FF'),
                    opacity: 1 - i * 0.12,
                    border: i === 0 ? '1px solid rgba(108,99,255,0.15)' : 'none',
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{tip.emoji}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{tip.mood}</span>
                    {i === 0 && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{tip.feedback}</p>
                  {tip.snippet && (
                    <p className="text-xs text-gray-400 mt-1.5 italic leading-snug">
                      "{tip.snippet.slice(0, 80)}{tip.snippet.length > 80 ? '…' : ''}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
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
