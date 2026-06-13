import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { saveRecordingMeta, getRecordingsMeta } from '../services/firestoreService'
import { saveRecording, isAudioTypeAllowed } from '../services/storageService'

/* Animated equalizer bars — grows from bottom when active */
function WaveIcon({ active }) {
  const bars = [3, 6, 10, 14, 10, 7, 4, 3]
  return (
    <div className="flex items-end gap-[2.5px]" style={{ height: 18 }}>
      {bars.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{
            height: h,
            transformOrigin: 'bottom center',
            background: active
              ? `linear-gradient(180deg, #8B85FF, #6C63FF)`
              : '#C4C9D4',
            transition: 'background 0.3s',
            animation: active
              ? `wave-bar ${0.38 + (i % 4) * 0.13}s ease-in-out ${i * 0.06}s infinite alternate`
              : 'none',
          }} />
      ))}
    </div>
  )
}

function tsToDate(ts) {
  if (!ts) return new Date()
  if (ts.toDate) return ts.toDate()
  return new Date(ts)
}
function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}
function formatDate(ts) {
  if (!ts) return '—'
  return tsToDate(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function HomePage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { darkMode } = useTheme()
  const fileRef   = useRef(null)
  const [selected,   setSelected]   = useState(null)
  const [recordings, setRecordings] = useState([])
  const [uploading,  setUploading]  = useState(false)
  const [fileError,  setFileError]  = useState('')

  useEffect(() => {
    if (!user) return
    getRecordingsMeta(user.uid).then(recs => {
      setRecordings(recs)
      if (recs.length > 0 && !selected) setSelected(recs[0].id)
    })
  }, [user])

  function getAudioDuration(file) {
    return new Promise(resolve => {
      const url   = URL.createObjectURL(file)
      const audio = new Audio()
      audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(audio.duration)) }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        const reader = new FileReader()
        reader.onload = async e => {
          try {
            const ctx    = new (window.AudioContext || window.webkitAudioContext)()
            const buffer = await ctx.decodeAudioData(e.target.result)
            resolve(Math.round(buffer.duration))
            ctx.close()
          } catch { resolve(null) }
        }
        reader.readAsArrayBuffer(file)
      }
      audio.src = url
    })
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setFileError('')
    if (!isAudioTypeAllowed(file)) {
      setFileError(`Unsupported file type. Please use an audio file.`)
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const duration     = await getAudioDuration(file)
      const meta         = { filename: file.name, duration, date: new Date().toISOString(), analysisStatus: 'pending', analysis: null }
      const firestoreId  = await saveRecordingMeta(user.uid, meta)
      await saveRecording({ id: firestoreId, ...meta, audioBlob: file })
      const recs = await getRecordingsMeta(user.uid)
      setRecordings(recs)
      setSelected(firestoreId)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const analyzedCount = recordings.filter(r => r.analysis).length

  /* ── Analyze button (shared mobile/desktop) ── */
  const analyzeBtn = (
    <button
      onClick={() => selected && navigate(`/recording-details/${selected}`)}
      disabled={!selected || uploading}
      className="relative w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, #6C63FF 0%, #8B85FF 50%, #4F8AFF 100%)',
        backgroundSize: '200% 200%',
        animation: selected && !uploading
          ? 'gradient-pan 4s ease infinite, glow-breathe 2.5s ease-in-out infinite'
          : 'none',
        boxShadow: selected && !uploading ? '0 8px 32px rgba(108,99,255,0.45)' : 'none',
      }}>
      {/* shimmer sweep */}
      {selected && !uploading && (
        <span className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)', animation: 'shimmer-sweep 2.4s ease-in-out infinite' }} />
      )}
      {uploading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
          </svg>
          <span>Saving…</span>
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M7 2l10 10L7 22V2z"/>
          </svg>
          Analyze Recording
        </>
      )}
    </button>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* ══ Mobile header — always branded gradient ══ */}
      <div className="relative overflow-hidden md:hidden" style={{ borderRadius: '0 0 32px 32px' }}>

        {/* Background gradient */}
        <div className="absolute inset-0" style={{
          background: darkMode
            ? 'linear-gradient(135deg, #1E1B4B 0%, #2D2860 60%, #1A1740 100%)'
            : 'linear-gradient(135deg, #6C63FF 0%, #7B74FF 40%, #5B54E8 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-pan 8s ease infinite',
        }} />

        {/* Floating orbs */}
        <div className="absolute top-0 right-0 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%)', animation: 'orb-drift-a 11s ease-in-out infinite' }} />
        <div className="absolute -bottom-12 -left-10 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,133,255,0.18) 0%, transparent 65%)', animation: 'orb-drift-b 14s ease-in-out infinite' }} />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />

        {/* Content */}
        <div className="relative px-5 pt-12 pb-7">

          {/* Top row */}
          <div className="flex items-start justify-between mb-5"
            style={{ animation: 'fade-up 0.55s ease both' }}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                <span className="text-white/50 text-[10px] font-semibold tracking-[0.12em] uppercase">AI Voice Lab</span>
              </div>
              <h1 className="text-white text-[26px] font-extrabold tracking-tight leading-tight">Voxofied</h1>
              <p className="text-white/55 text-sm mt-0.5">Mood · Stress · Intent</p>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm mt-1"
              style={{
                background: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255,255,255,0.22)',
                color: 'white',
                animation: 'scale-in 0.5s ease both 0.1s',
              }}>
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
          </div>

          {/* Stats glass pills */}
          <div className="grid grid-cols-3 gap-2.5" style={{ animation: 'fade-up 0.55s ease both 0.12s' }}>
            {[
              { value: recordings.length, label: 'Recordings' },
              { value: analyzedCount, label: 'Analyzed' },
              { value: recordings.length - analyzedCount, label: 'Pending' },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-2xl py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.16)' }}>
                <p className="text-white font-extrabold text-xl leading-none">{value}</p>
                <p className="text-white/50 text-[10px] mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Desktop header ══ */}
      <div className="hidden md:flex items-center justify-between bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Import Audio</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{recordings.length} recordings · {analyzedCount} analyzed</p>
        </div>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', boxShadow: '0 4px 16px rgba(108,99,255,0.35)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import File
        </button>
      </div>

      {/* ══ Main content ══ */}
      <div className="flex-1 px-4 pt-5 pb-36 md:pb-8 md:px-8 flex flex-col gap-5 md:max-w-5xl md:w-full md:mx-auto">

        {/* Upload card with animated gradient border */}
        <div className="rounded-3xl p-[1.5px] md:max-w-lg md:mx-auto w-full"
          style={{
            animation: 'fade-up 0.55s ease both 0.18s',
            background: 'linear-gradient(135deg, #6C63FF, #B8B4FF, #4F8AFF, #6C63FF)',
            backgroundSize: '300% 300%',
            animationName: 'gradient-pan, fade-up',
            animationDuration: '3.5s, 0.55s',
            animationTimingFunction: 'ease infinite, ease',
            animationDelay: '0s, 0.18s',
            animationFillMode: 'none, both',
          }}>
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-full rounded-[22px] p-6 flex flex-col items-center gap-3 overflow-hidden active:scale-[0.97] transition-transform"
            style={{ background: darkMode ? '#1C1940' : '#ffffff' }}>

            {/* Subtle shimmer on hover */}
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.04), transparent 60%)' }} />

            {/* Floating icon with pulse ring */}
            <div className="relative" style={{ animation: 'float 3.2s ease-in-out infinite' }}>
              <div className="absolute inset-0 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', animation: 'pulse-ring 2s ease-out infinite' }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', boxShadow: '0 8px 28px rgba(108,99,255,0.45)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
            </div>

            <div className="text-center">
              <p className="font-extrabold text-gray-800 dark:text-white text-base">Analyze Voice</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                Understand mood, stress &amp; intent using AI
              </p>
            </div>
            <p className="text-xs text-gray-300 dark:text-gray-600">
              <span className="font-semibold text-gray-400 dark:text-gray-500">.mp3 .m4a .wav .opus .ogg .aac</span> and more
            </p>

            <input ref={fileRef} type="file"
              accept=".mp3,.m4a,.wav,.webm,.ogg,.opus,.aac,.flac,.wma,.mp4,.3gp,.amr"
              className="hidden"
              onChange={handleFileSelect} />
          </button>
        </div>

        {fileError && (
          <p className="text-xs text-red-500 text-center -mt-2 px-4">{fileError}</p>
        )}

        {/* Recordings section */}
        <div style={{ animation: 'fade-up 0.55s ease both 0.26s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 dark:text-white text-sm">Your recordings</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)' }}>
                {recordings.length}
              </span>
            </div>
            {recordings.length > 0 && (
              <button onClick={() => fileRef.current?.click()}
                className="text-xs font-semibold"
                style={{ color: '#6C63FF' }}>
                + Add new
              </button>
            )}
          </div>

          {recordings.length === 0 ? (
            /* Empty state */
            <div className="rounded-3xl p-8 flex flex-col items-center gap-4 text-center"
              style={{
                background: darkMode ? '#1C1940' : '#ffffff',
                border: `1.5px dashed ${darkMode ? 'rgba(108,99,255,0.25)' : '#E0DFFE'}`,
                animation: 'scale-in 0.5s ease both 0.3s',
              }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: darkMode ? 'rgba(108,99,255,0.1)' : '#F0EFFE', animation: 'float 4s ease-in-out infinite' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="1.6" className="w-8 h-8"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">No recordings yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed max-w-[200px]">
                  Import an audio file to unlock AI-powered insights
                </p>
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', boxShadow: '0 4px 16px rgba(108,99,255,0.35)' }}>
                Import Audio File
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3">
              {recordings.map((rec, index) => {
                const isSelected = selected === rec.id
                return (
                  <button key={rec.id} onClick={() => setSelected(rec.id)}
                    className="relative w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.97] transition-all overflow-hidden"
                    style={{
                      background: isSelected
                        ? (darkMode ? 'rgba(108,99,255,0.15)' : 'rgba(108,99,255,0.06)')
                        : (darkMode ? '#1C1940' : '#ffffff'),
                      border: `1.5px solid ${isSelected ? 'rgba(108,99,255,0.4)' : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')}`,
                      boxShadow: isSelected
                        ? '0 4px 24px rgba(108,99,255,0.18)'
                        : darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                      animation: `fade-up 0.45s ease both`,
                      animationDelay: `${0.28 + index * 0.07}s`,
                    }}>

                    {/* Selected left accent bar */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                        style={{ background: 'linear-gradient(180deg, #6C63FF, #4F8AFF)' }} />
                    )}

                    {/* Waveform avatar */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: isSelected
                          ? 'rgba(108,99,255,0.15)'
                          : (darkMode ? 'rgba(108,99,255,0.08)' : '#F0EFFE'),
                        boxShadow: isSelected ? '0 0 0 2px rgba(108,99,255,0.25)' : 'none',
                      }}>
                      <WaveIcon active={isSelected} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{rec.filename}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(rec.duration)}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(rec.createdAt)}</span>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, #6C63FF, #8B85FF)' : 'transparent',
                        border: `2px solid ${isSelected ? 'transparent' : (darkMode ? '#3A3760' : '#D1D5DB')}`,
                        boxShadow: isSelected ? '0 0 0 3px rgba(108,99,255,0.2)' : 'none',
                      }}>
                      {isSelected && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="hidden md:block">{analyzeBtn}</div>
      </div>

      {/* Mobile floating analyze button */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[390px] z-40 md:hidden">
        {analyzeBtn}
      </div>
    </div>
  )
}
