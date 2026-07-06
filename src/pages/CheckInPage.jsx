import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const CATEGORIES = [
  { id: 'Business Call', emoji: '💼', color: '#6C63FF' },
  { id: 'Interview',     emoji: '🎯', color: '#4F8AFF' },
  { id: 'Relationship',  emoji: '💬', color: '#A855F7' },
  { id: 'Conflict',      emoji: '⚡', color: '#F59E0B' },
]

const OPENAI_API_CHAT = 'https://api.openai.com/v1/chat/completions'

async function getCoachingTip(transcription, category) {
  if (!transcription.trim()) return null
  const res = await fetch(OPENAI_API_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o', max_tokens: 200, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `You are a real-time communication coach. Context: ${category} conversation.\nGive ONE short, specific coaching tip based on exactly what was said (max 18 words).\nDo NOT mention voice, tone, pitch, or acoustic properties.\nReturn JSON only: { "feedback": string, "mood": string, "emoji": string }\nSpeech: "${transcription}"` }],
    }),
  })
  if (!res.ok) return null
  try { return JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}') } catch { return null }
}

async function generateSessionReport(transcript, tips, category) {
  if (!transcript.trim()) return null
  const res = await fetch(OPENAI_API_CHAT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o', max_tokens: 500, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `You are a communication coach. The user just finished a ${category} session.\nBased ONLY on what was actually said, generate an honest session report.\nDo NOT mention voice, tone, pitch, or acoustic properties.\nTranscript: "${transcript}"\nTips: ${tips.map((t,i)=>`${i+1}. [${t.mood}] ${t.feedback}`).join('\n')||'None'}\nReturn JSON: { "overallMood": string, "overallMoodEmoji": string, "score": number, "summary": string, "strengths": [string,string], "improvements": [string,string], "keyPhrase": string }` }],
    }),
  })
  if (!res.ok) return null
  try { return JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}') } catch { return null }
}

export default function CheckInPage() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()
  const [activeCategory, setActiveCategory]   = useState('Business Call')
  const [isRecording, setIsRecording]         = useState(false)
  const [feedbackList, setFeedbackList]       = useState([])
  const [loading, setLoading]                 = useState(false)
  const [finalTranscript, setFinalTranscript] = useState('')
  const [interimText, setInterimText]         = useState('')
  const [reportLoading, setReportLoading]     = useState(false)
  const [sessionTime, setSessionTime]         = useState(0)
  const [tipCount, setTipCount]               = useState(0)

  const streamRef        = useRef(null)
  const chunkIntervalRef = useRef(null)
  const timerRef         = useRef(null)
  const recognitionRef   = useRef(null)
  const pendingChunkRef  = useRef('')
  const feedbackListRef  = useRef([])
  useEffect(() => { feedbackListRef.current = feedbackList }, [feedbackList])

  useEffect(() => {
    if (isRecording) {
      setSessionTime(0)
      timerRef.current = setInterval(() => setSessionTime(s => s + 1), 1000)
    } else { clearInterval(timerRef.current) }
    return () => clearInterval(timerRef.current)
  }, [isRecording])

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const activeCat = CATEGORIES.find(c => c.id === activeCategory)

  const startCoaching = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const SR = window.webkitSpeechRecognition || window.SpeechRecognition
      if (!SR) { alert('Live transcription requires Chrome.'); stream.getTracks().forEach(t=>t.stop()); return }
      const rec = new SR()
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
      rec.onresult = e => {
        let interim = '', newFinal = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) newFinal += t + ' '; else interim += t
        }
        if (newFinal) { setFinalTranscript(p => p + newFinal); pendingChunkRef.current += newFinal }
        setInterimText(interim)
      }
      rec.onerror = () => setInterimText('')
      rec.onend   = () => setInterimText('')
      rec.start()
      recognitionRef.current = rec
      setIsRecording(true); setFinalTranscript(''); setInterimText(''); setFeedbackList([]); setTipCount(0); pendingChunkRef.current = ''
      chunkIntervalRef.current = setInterval(async () => {
        const chunk = pendingChunkRef.current.trim()
        if (!chunk) return
        pendingChunkRef.current = ''
        setLoading(true)
        try {
          const tip = await getCoachingTip(chunk, activeCategory)
          if (tip) { setFeedbackList(p => [{ ...tip, snippet: chunk, ts: Date.now() }, ...p].slice(0,6)); setTipCount(c=>c+1) }
        } catch {} finally { setLoading(false) }
      }, 6000)
    } catch { alert('Microphone access denied.') }
  }, [activeCategory])

  const stopCoaching = useCallback(() => {
    clearInterval(chunkIntervalRef.current)
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach(t=>t.stop())
    setIsRecording(false); setInterimText('')
    setTimeout(() => {
      setFinalTranscript(prev => {
        const transcript = prev.trim()
        if (transcript.length > 20) {
          const tips = feedbackListRef.current
          setReportLoading(true)
          generateSessionReport(transcript, tips, activeCategory)
            .then(r => { if (r) navigate('/coach-report', { state: { report: r, transcript, tips, category: activeCategory, date: new Date().toISOString() } }) })
            .catch(console.error)
            .finally(() => setReportLoading(false))
        }
        return prev
      })
    }, 300)
  }, [activeCategory, navigate])

  function toggle() { if (isRecording) stopCoaching(); else startCoaching() }
  useEffect(() => { if (isRecording) stopCoaching() }, [activeCategory])

  const displayTranscript = finalTranscript + interimText

  return (
    <div className="flex flex-col min-h-screen overflow-hidden transition-colors duration-300"
      style={{ background: darkMode
        ? 'linear-gradient(160deg,#0D0B2E 0%,#130F3E 40%,#0A1628 70%,#0D0B2E 100%)'
        : 'linear-gradient(160deg,#F4F2FF 0%,#EEF2FF 40%,#F0F6FF 70%,#F4F2FF 100%)' }}>

      {/* ── Background decorative orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle,#6C63FF,transparent 65%)', opacity: darkMode ? 0.07 : 0.08, animation: 'ci-orb1 12s ease-in-out infinite' }} />
        <div className="absolute bottom-1/3 -right-16 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle,#4F8AFF,transparent 65%)', opacity: darkMode ? 0.06 : 0.07, animation: 'ci-orb2 9s ease-in-out 2s infinite' }} />
        {isRecording && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle,#EF4444,transparent 55%)', opacity: darkMode ? 0.12 : 0.07, animation: 'ci-glow 2.5s ease-in-out infinite alternate', transition: 'opacity 1s ease' }} />
        )}
      </div>

      {/* ══ HEADER ══ */}
      <div className="relative z-10 px-5 pt-14 pb-5 md:hidden">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isRecording
                ? <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ animation: 'ci-blink 1s infinite' }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400">Recording</span>
                  </div>
                : <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: '#6C63FF' }}>Live Coach</span>
              }
            </div>
            <h1 className="text-[28px] font-black leading-tight tracking-tight"
              style={{ color: darkMode ? '#FFFFFF' : '#111827' }}>
              {isRecording ? 'Listening…' : 'AI Coach'}
            </h1>
          </div>
          {isRecording && (
            <div className="text-right" style={{ animation: 'ci-fadein 0.4s ease' }}>
              <p className="text-2xl font-black tabular-nums" style={{ color: darkMode ? '#FFFFFF' : '#111827' }}>{fmt(sessionTime)}</p>
              <p className="text-[10px] font-bold" style={{ color: '#6C63FF' }}>
                {tipCount} tip{tipCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 active:scale-95"
                style={active
                  ? { background: cat.color, color: '#fff', boxShadow: `0 4px 20px ${cat.color}55` }
                  : darkMode
                    ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
                    : { background: 'rgba(108,99,255,0.07)', color: '#6B7280', border: '1px solid rgba(108,99,255,0.12)' }}>
                <span className="text-sm">{cat.emoji}</span>
                <span>{cat.id}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center relative z-10 px-8 py-4 border-b"
        style={{
          borderColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(108,99,255,0.1)',
          background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
        }}>
        {/* Left: title */}
        <div className="w-48 flex-shrink-0">
          <h1 className="text-xl font-bold" style={{ color: darkMode ? '#fff' : '#111827' }}>Live Coach</h1>
          <p className="text-sm mt-0.5" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#6B7280' }}>Real-time AI coaching</p>
        </div>
        {/* Center: category pills */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={activeCategory === cat.id
                ? { background: cat.color, color: '#fff', boxShadow: `0 4px 16px ${cat.color}44` }
                : darkMode
                  ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }
                  : { background: 'rgba(108,99,255,0.07)', color: '#374151', border: '1px solid rgba(108,99,255,0.15)' }}>
              {cat.emoji} {cat.id}
            </button>
          ))}
        </div>
        {/* Right: timer */}
        <div className="w-48 flex-shrink-0 flex justify-end">
          {isRecording && <span className="text-sm font-bold text-red-400">{fmt(sessionTime)}</span>}
        </div>
      </div>

      {/* ══ SCROLLABLE CONTENT ══ */}
      <div className="relative z-10 flex-1 flex flex-col px-4 pt-2 pb-36 md:pb-8 md:px-8 gap-4 md:max-w-2xl md:mx-auto md:w-full overflow-y-auto">

        {/* ── BIG MIC CARD ── */}
        <div className="relative rounded-[28px] overflow-hidden flex flex-col items-center justify-center py-10 px-6 gap-6"
          style={{
            background: darkMode
              ? (isRecording ? 'linear-gradient(145deg,rgba(60,10,10,0.95),rgba(40,10,60,0.95))' : 'linear-gradient(145deg,rgba(30,27,75,0.9),rgba(20,16,50,0.9))')
              : (isRecording ? 'linear-gradient(145deg,#FFF1F0,#FDF2FF)' : 'linear-gradient(145deg,#F0EFFE,#EEF2FF)'),
            border: `1.5px solid ${isRecording ? (darkMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)') : (darkMode ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.15)')}`,
            backdropFilter: 'blur(40px)',
            transition: 'all 0.6s ease',
            boxShadow: isRecording
              ? '0 20px 80px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.4)'
              : '0 20px 80px rgba(108,99,255,0.1), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}>

          {/* decorative grid lines */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: `linear-gradient(${darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(108,99,255,0.04)'} 1px,transparent 1px),linear-gradient(90deg,${darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(108,99,255,0.04)'} 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />

          {/* status label */}
          <div className="flex items-center gap-2">
            {isRecording ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ animation: 'ci-blink 1s infinite' }} />
                <span className="text-xs font-bold text-red-300 uppercase tracking-widest">
                  {loading ? 'Analyzing…' : 'Live'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: `${activeCat?.color}18`, border: `1px solid ${activeCat?.color}30` }}>
                <span className="text-sm">{activeCat?.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: activeCat?.color }}>
                  {activeCategory}
                </span>
              </div>
            )}
          </div>

          {/* Mic button with ripple rings */}
          <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
            {isRecording && [0, 0.7, 1.4].map((delay, i) => (
              <span key={i} className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -((i + 1) * 22),
                  border: `${2 - i * 0.5}px solid rgba(239,68,68,${0.5 - i * 0.14})`,
                  animation: `ci-ring 2.2s ease-out ${delay}s infinite`,
                }} />
            ))}
            <button onClick={toggle}
              className="relative z-10 flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 select-none"
              style={{
                width: 120, height: 120,
                background: isRecording
                  ? 'linear-gradient(145deg,#C41E1E,#EF4444,#F87171)'
                  : 'linear-gradient(145deg,#4A40B0,#6C63FF,#8B85FF)',
                boxShadow: isRecording
                  ? '0 0 0 6px rgba(239,68,68,0.15), 0 12px 50px rgba(239,68,68,0.5)'
                  : '0 0 0 6px rgba(108,99,255,0.15), 0 12px 50px rgba(108,99,255,0.45)',
              }}>
              {isRecording ? (
                <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
                  <rect x="6" y="6" width="12" height="12" rx="3"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                  <line x1="9"  y1="22" x2="15" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>

          {/* label */}
          <div className="text-center">
            <p className="text-base font-black" style={{ color: darkMode ? '#fff' : '#111827' }}>
              {isRecording ? 'Tap to stop' : 'Tap to start'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: darkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>
              {isRecording ? 'Report generates when you stop' : 'Speak naturally — coach responds live'}
            </p>
          </div>

          {/* Waveform */}
          <div className="flex items-center gap-[3px]" style={{ height: 36 }}>
            {Array.from({ length: 24 }, (_, i) => {
              const h = [5,8,14,20,16,12,8,6,10,18,24,20,14,10,16,20,14,10,6,8,12,16,10,6][i]
              return (
                <div key={i} className="rounded-full"
                  style={{
                    width: 3,
                    height: isRecording ? h : 3,
                    background: isRecording
                      ? `rgba(248,113,113,${0.5 + (i % 3) * 0.2})`
                      : (darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(108,99,255,0.15)'),
                    transition: 'height 0.4s ease',
                    animation: isRecording
                      ? `ci-wave ${0.4 + (i % 6) * 0.08}s ease-in-out ${i * 0.035}s infinite alternate`
                      : 'none',
                  }} />
              )
            })}
          </div>
        </div>

        {/* ── GENERATING REPORT ── */}
        {reportLoading && (
          <div className="rounded-2xl px-4 py-4 flex items-center gap-3"
            style={{ background: darkMode ? 'rgba(108,99,255,0.12)' : 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.25)', backdropFilter: 'blur(20px)', animation: 'ci-fadein 0.4s ease' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(108,99,255,0.2)' }}>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(108,99,255,0.3)" strokeWidth="4"/>
                <path fill="#8B85FF" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: darkMode ? '#fff' : '#1F2937' }}>Generating your report…</p>
              <p className="text-xs mt-0.5" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#6B7280' }}>AI is analysing what you said</p>
            </div>
          </div>
        )}

        {/* ── LIVE TRANSCRIPT ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(108,99,255,0.12)',
            backdropFilter: 'blur(30px)',
            boxShadow: darkMode ? 'none' : '0 4px 24px rgba(108,99,255,0.06)',
          }}>
          <div className="flex items-center gap-2.5 px-4 py-3.5"
            style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(108,99,255,0.08)' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: isRecording ? '#4ADE80' : (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(108,99,255,0.25)'),
                boxShadow: isRecording ? '0 0 10px rgba(74,222,128,0.7)' : 'none',
                animation: isRecording ? 'ci-blink 1.5s infinite' : 'none',
              }} />
            <p className="text-[10px] font-black uppercase tracking-[0.15em] flex-1"
              style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#6B7280' }}>
              Live Transcript
            </p>
            {finalTranscript && (
              <button onClick={() => { setFinalTranscript(''); setInterimText('') }}
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(108,99,255,0.08)',
                  color: darkMode ? 'rgba(255,255,255,0.4)' : '#6B7280',
                }}>
                Clear
              </button>
            )}
          </div>
          <div className="px-4 py-4" style={{ minHeight: 72 }}>
            {!displayTranscript ? (
              <p className="text-sm italic" style={{ color: darkMode ? 'rgba(255,255,255,0.2)' : '#9CA3AF' }}>
                {isRecording ? 'Start speaking — words appear here…' : 'Start the mic to begin'}
              </p>
            ) : (
              <p className="text-sm leading-relaxed font-medium" style={{ color: darkMode ? 'rgba(255,255,255,0.85)' : '#1F2937' }}>
                {finalTranscript}
                {interimText && <span className="italic" style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>{interimText}</span>}
                {isRecording && <span className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full bg-green-400" style={{ animation: 'ci-cursor 1s ease-in-out infinite' }} />}
              </p>
            )}
          </div>
        </div>

        {/* ── AI COACHING TIPS ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(108,99,255,0.12)',
            backdropFilter: 'blur(30px)',
            boxShadow: darkMode ? 'none' : '0 4px 24px rgba(108,99,255,0.06)',
          }}>
          <div className="flex items-center gap-2.5 px-4 py-3.5"
            style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(108,99,255,0.08)' }}>
            <span className="text-base">✨</span>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] flex-1"
              style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#6B7280' }}>
              AI Coaching
            </p>
            {loading && (
              <div className="flex items-center gap-1.5">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(139,133,255,0.3)" strokeWidth="4"/>
                  <path fill="#8B85FF" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
                </svg>
                <span className="text-[10px] font-bold" style={{ color: '#8B85FF' }}>Thinking…</span>
              </div>
            )}
            {tipCount > 0 && !loading && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(108,99,255,0.15)', color: '#6C63FF' }}>
                {tipCount}
              </span>
            )}
          </div>

          <div className="p-3" style={{ minHeight: 100 }}>
            {feedbackList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="text-3xl opacity-30">💡</div>
                <p className="text-xs text-center" style={{ color: darkMode ? 'rgba(255,255,255,0.2)' : '#9CA3AF' }}>
                  {isRecording ? 'Tips arrive every few seconds as you speak…' : 'Start speaking to get real-time coaching'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {feedbackList.map((tip, i) => (
                  <div key={tip.ts || i}
                    className="rounded-2xl p-3.5"
                    style={{
                      background: i === 0
                        ? (darkMode ? 'linear-gradient(135deg,rgba(108,99,255,0.18),rgba(79,138,255,0.1))' : 'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(79,138,255,0.05))')
                        : (darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.03)'),
                      border: i === 0
                        ? '1px solid rgba(108,99,255,0.3)'
                        : (darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(108,99,255,0.1)'),
                      opacity: 1 - i * 0.1,
                      transform: `scale(${1 - i * 0.012})`,
                      animation: i === 0 ? 'ci-tip 0.45s cubic-bezier(0.34,1.3,0.64,1) both' : 'none',
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{tip.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: darkMode ? '#fff' : '#1F2937' }}>{tip.mood}</span>
                      {i === 0 && (
                        <span className="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest"
                          style={{ background: 'linear-gradient(135deg,#6C63FF,#4F8AFF)', color: 'white' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug" style={{ color: darkMode ? 'rgba(255,255,255,0.9)' : '#1F2937' }}>
                      {tip.feedback}
                    </p>
                    {tip.snippet && (
                      <p className="text-[11px] mt-2 italic px-2 py-1.5 rounded-lg leading-snug"
                        style={{
                          color: darkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF',
                          background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.04)',
                          border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(108,99,255,0.08)',
                        }}>
                        "{tip.snippet.slice(0,90)}{tip.snippet.length > 90 ? '…' : ''}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes ci-ring  { 0%{transform:scale(0.4);opacity:0.8} 100%{transform:scale(1.6);opacity:0} }
        @keyframes ci-wave  { from{transform:scaleY(0.25)} to{transform:scaleY(1)} }
        @keyframes ci-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ci-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes ci-glow  { from{opacity:0.08} to{opacity:0.18} }
        @keyframes ci-orb1  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-30px)} }
        @keyframes ci-orb2  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-15px,20px)} }
        @keyframes ci-fadein{ from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes ci-tip   { from{opacity:0;transform:translateY(16px) scale(0.95)} to{opacity:1;transform:none} }
        @keyframes ci-cursor{ 0%,100%{opacity:1} 50%{opacity:0} }
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
  )
}
