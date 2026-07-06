import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { saveRecordingMeta, getRecordingsMeta, deleteRecordingMeta, getUserMinutes } from '../services/firestoreService'
import { saveRecording, isAudioTypeAllowed, getLocalAudioIds, deleteRecording } from '../services/storageService'
import RecordSheet from '../components/RecordSheet'

function tsToDate(ts) {
  if (!ts) return new Date()
  if (ts.toDate) return ts.toDate()
  return new Date(ts)
}
function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
function formatDate(ts) {
  if (!ts) return '—'
  return tsToDate(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(displayName, email) {
  if (displayName) return displayName.split(' ')[0]
  if (email) return email.split('@')[0]
  return 'there'
}

/* Animated waveform icon */
function WaveIcon({ active }) {
  const bars = [3, 7, 12, 16, 12, 8, 4]
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
      {bars.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{
            height: h,
            transformOrigin: 'bottom center',
            background: active ? 'linear-gradient(180deg,#A78BFA,#6C63FF)' : (document.documentElement.classList.contains('dark') ? '#3A3760' : '#D1D5DB'),
            animation: active
              ? `wave-bar ${0.4 + (i % 4) * 0.12}s ease-in-out ${i * 0.07}s infinite alternate`
              : 'none',
          }} />
      ))}
    </div>
  )
}

/* Pulsing orb for header background */
function HeaderOrbs() {
  return (
    <>
      <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle,#8B85FF,transparent 70%)', animation: 'orb-float 6s ease-in-out infinite' }} />
      <div className="absolute -bottom-4 -left-8 w-36 h-36 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle,#4F8AFF,transparent 70%)', animation: 'orb-float 8s ease-in-out 1s infinite reverse' }} />
      <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle,#C084FC,transparent 70%)', animation: 'orb-float 5s ease-in-out 2s infinite' }} />
    </>
  )
}

export default function HomePage() {
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { darkMode } = useTheme()
  const fileRef      = useRef(null)

  const [selected,         setSelected]         = useState(null)
  const [recordings,       setRecordings]       = useState([])
  const [localIds,         setLocalIds]         = useState(new Set())
  const [uploading,        setUploading]        = useState(false)
  const [fileError,        setFileError]        = useState('')
  const [showRecordSheet,  setShowRecordSheet]  = useState(false)
  const [reuploadFor,      setReuploadFor]      = useState(null)
  const [minutesRemaining, setMinutesRemaining] = useState(null)
  const [minutesIncluded,  setMinutesIncluded]  = useState(0)
  const [loaded,           setLoaded]           = useState(false)

  const loadRecordings = useCallback(async (selectId = null) => {
    if (!user) return
    const [recs, ids, mins] = await Promise.all([
      getRecordingsMeta(user.uid),
      getLocalAudioIds(),
      getUserMinutes(user.uid),
    ])
    setRecordings(recs)
    setLocalIds(ids)
    setMinutesRemaining(mins.remaining)
    setMinutesIncluded(mins.minutesIncluded)
    setLoaded(true)
    if (selectId) {
      setSelected(selectId)
    } else if (recs.length > 0 && !selected) {
      setSelected(recs[0].id)
    }
  }, [user, selected])

  useEffect(() => { loadRecordings() }, [user])

  function getAudioDuration(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
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
      setFileError('Unsupported file type. Please use an audio file.')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      if (reuploadFor) {
        const duration = await getAudioDuration(file)
        await saveRecording({ id: reuploadFor, filename: file.name, audioBlob: file, duration, analysisStatus: 'pending', analysis: null })
        setReuploadFor(null)
        await loadRecordings(reuploadFor)
      } else {
        const duration    = await getAudioDuration(file)
        const meta        = { filename: file.name, duration, date: new Date().toISOString(), analysisStatus: 'pending', analysis: null }
        const firestoreId = await saveRecordingMeta(user.uid, meta)
        await saveRecording({ id: firestoreId, ...meta, audioBlob: file })
        await loadRecordings(firestoreId)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDeleteMissing(id) {
    await Promise.all([deleteRecording(id).catch(() => {}), deleteRecordingMeta(user.uid, id)])
    await loadRecordings()
  }

  const analyzedCount    = recordings.filter(r => r.analysis).length
  const selectedHasBlob  = selected ? localIds.has(selected) : false
  const noMinutes        = minutesRemaining !== null && minutesRemaining <= 0
  const minutesPct       = minutesIncluded > 0 ? Math.min(100, Math.round(((minutesIncluded - (minutesRemaining || 0)) / minutesIncluded) * 100)) : 0

  /* ── Analyze button ── */
  const analyzeBtn = selectedHasBlob || !selected ? (
    <button
      onClick={() => {
        if (noMinutes) { navigate('/billing'); return }
        selected && navigate(`/recording-details/${selected}`)
      }}
      disabled={!selected || uploading}
      className="relative w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2.5 overflow-hidden transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: noMinutes
          ? 'linear-gradient(135deg,#EF4444,#F87171)'
          : 'linear-gradient(135deg,#6C63FF 0%,#8B85FF 45%,#4F8AFF 100%)',
        backgroundSize: '200% 200%',
        animation: selected && !uploading && !noMinutes ? 'gradient-pan 4s ease infinite' : 'none',
        boxShadow: selected && !uploading
          ? noMinutes ? '0 6px 28px rgba(239,68,68,0.4)' : '0 6px 28px rgba(108,99,255,0.5)'
          : 'none',
      }}>
      {/* shimmer */}
      {selected && !uploading && !noMinutes && (
        <span className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%)', animation: 'shimmer-sweep 2.5s ease-in-out infinite' }} />
      )}
      {uploading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
          </svg>
          Saving…
        </>
      ) : noMinutes ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          0 Minutes Left — Top Up
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/>
          </svg>
          Analyze Recording
        </>
      )}
    </button>
  ) : (
    <button
      onClick={() => { setReuploadFor(selected); fileRef.current?.click() }}
      className="relative w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 border-2"
      style={{ borderColor: '#F59E0B', color: '#F59E0B', background: darkMode ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Re-upload Audio to Analyze
    </button>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0A0820] transition-colors duration-300">

      <input ref={fileRef} type="file"
        accept=".mp3,.m4a,.wav,.webm,.ogg,.opus,.aac,.flac,.wma,.3gp,.amr"
        className="hidden" onChange={handleFileSelect} />

      {/* ══════════ MOBILE HEADER ══════════ */}
      <div className="md:hidden relative overflow-hidden px-5 pt-14 pb-7"
        style={{ background: 'linear-gradient(145deg, #0D0B2B 0%, #1A1060 50%, #0D1A3A 100%)' }}>
        <HeaderOrbs />

        {/* top row: greeting + avatar */}
        <div className="relative z-10 flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(167,139,250,0.8)' }}>
              {getGreeting()},
            </p>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {getFirstName(user?.displayName, user?.email)} 👋
            </h1>
          </div>
          <button onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>

        {/* Stats chips row */}
        <div className="relative z-10 flex gap-2.5">
          {/* Minutes chip */}
          <div className="flex-1 rounded-2xl px-3.5 py-2.5"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(167,139,250,0.7)' }}>
              Minutes left
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-white leading-none">
                {minutesRemaining !== null ? minutesRemaining : '—'}
              </span>
              {minutesIncluded > 0 && (
                <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${100 - minutesPct}%`,
                      background: minutesPct > 80 ? '#EF4444' : minutesPct > 50 ? '#F59E0B' : 'linear-gradient(90deg,#6C63FF,#8B85FF)',
                    }} />
                </div>
              )}
            </div>
          </div>
          {/* Recordings chip */}
          <div className="flex-1 rounded-2xl px-3.5 py-2.5"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(167,139,250,0.7)' }}>
              Analyzed
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black text-white leading-none">{analyzedCount}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>/ {recordings.length}</span>
            </div>
          </div>
        </div>

        {/* Bottom curved mask */}
        <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
          style={{ background: darkMode ? '#0A0820' : '#F0F2F7', borderRadius: '24px 24px 0 0' }} />
      </div>

      {/* ══════════ DESKTOP HEADER ══════════ */}
      <div className="hidden md:block mx-8 md:mx-auto md:max-w-5xl mt-6 px-8 py-6 rounded-[20px]"
        style={{ background: '#0F1729' }}>
        <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 mb-2">
          <span className="text-purple-300 text-xs">✨</span>
          <span className="text-gray-300 text-xs font-medium">AI voice insights</span>
        </div>
        <h1 className="text-white text-2xl font-bold mb-1">Voxofied</h1>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Understand mood, stress &amp; intent using AI</p>
      </div>

      {/* ══════════ ADD AUDIO CARD — MOBILE ══════════ */}
      <div className="md:hidden mx-4 -mt-0.5 rounded-3xl shadow-xl overflow-hidden"
        style={{
          background: darkMode ? '#16123A' : '#FFFFFF',
          boxShadow: darkMode
            ? '0 4px 40px rgba(0,0,0,0.4)'
            : '0 4px 40px rgba(108,99,255,0.12)',
        }}>
        <div className="px-5 pt-5 pb-1">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-black text-gray-900 dark:text-white">Add audio to analyze</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
              2 ways
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Upload a file or record live</p>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-5">
          {/* Upload */}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="relative rounded-2xl p-4 text-left active:scale-95 transition-all duration-200 overflow-hidden group"
            style={{ background: darkMode ? 'rgba(108,99,255,0.08)' : '#F4F3FF', border: '1px solid rgba(108,99,255,0.12)' }}>
            <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity"
              style={{ background: 'radial-gradient(circle at 50% 50%,rgba(108,99,255,0.15),transparent 70%)' }} />
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)', boxShadow: '0 4px 16px rgba(108,99,255,0.35)' }}>
              {uploading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Upload</p>
            <p className="text-[11px] text-gray-400 mt-0.5">MP3 · M4A · WAV</p>
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(108,99,255,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
              </svg>
            </div>
          </button>
          {/* Record */}
          <button onClick={() => setShowRecordSheet(true)}
            className="relative rounded-2xl p-4 text-left active:scale-95 transition-all duration-200 overflow-hidden group"
            style={{ background: darkMode ? 'rgba(239,68,68,0.08)' : '#FFF1F0', border: '1px solid rgba(239,68,68,0.12)' }}>
            <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity"
              style={{ background: 'radial-gradient(circle at 50% 50%,rgba(239,68,68,0.15),transparent 70%)' }} />
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg,#EF4444,#F87171)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="9"  y1="22" x2="15" y2="22"/>
              </svg>
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Record</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Call or in person</p>
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
              </svg>
            </div>
          </button>
        </div>
        {fileError && (
          <p className="text-xs text-red-500 px-5 pb-4 text-center">{fileError}</p>
        )}
      </div>

      {/* ══════════ DESKTOP ADD AUDIO ══════════ */}
      <div className="hidden md:block mx-8 md:mx-auto md:max-w-5xl mt-4 bg-white dark:bg-[#1A1740] rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add audio to analyze</h2>
          <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs font-semibold px-2.5 py-1 rounded-full">2 ways</span>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Upload a file or record live</p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-2xl p-5 text-left relative active:scale-95 transition-transform disabled:opacity-60">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#6C63FF' }}>
              {uploading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </div>
            <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-gray-500">
                <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
              </svg>
            </span>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Upload file</p>
            <p className="text-xs text-gray-500 mt-0.5">MP3 · M4A · WAV · WebM</p>
          </button>
          <button onClick={() => setShowRecordSheet(true)}
            className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-2xl p-5 text-left relative active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="9"  y1="22" x2="15" y2="22"/>
              </svg>
            </div>
            <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-gray-500">
                <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
              </svg>
            </span>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Record live</p>
            <p className="text-xs text-gray-500 mt-0.5">Call or in person</p>
          </button>
        </div>
        {fileError && <p className="text-xs text-red-500 mt-3">{fileError}</p>}
      </div>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="flex-1 px-4 pt-5 pb-44 md:pb-8 md:px-8 flex flex-col gap-3 md:max-w-5xl md:w-full md:mx-auto">

        {/* Recordings header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="font-black text-gray-900 dark:text-white text-sm">Your recordings</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {recordings.length === 0 ? 'No files yet' : `${recordings.length} file${recordings.length !== 1 ? 's' : ''} · ${analyzedCount} analyzed`}
            </p>
          </div>
          {recordings.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg,#6C63FF,#4F8AFF)' }}>
                {recordings.length}
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {recordings.length === 0 && loaded ? (
          <div className="rounded-3xl flex flex-col items-center gap-5 py-10 px-6 text-center"
            style={{
              background: darkMode ? '#16123A' : '#FFFFFF',
              border: `1.5px dashed ${darkMode ? 'rgba(108,99,255,0.2)' : '#E0DFFE'}`,
            }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(108,99,255,0.12),rgba(79,138,255,0.08))', animation: 'float 4s ease-in-out infinite' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div>
              <p className="font-black text-gray-800 dark:text-white text-base">No recordings yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed max-w-[220px]">
                Import an audio file to unlock AI-powered insights
              </p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => fileRef.current?.click()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)', boxShadow: '0 4px 16px rgba(108,99,255,0.4)' }}>
                Upload File
              </button>
              <button onClick={() => setShowRecordSheet(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold border-2"
                style={{ borderColor: '#6C63FF', color: '#6C63FF' }}>
                Record
              </button>
            </div>
          </div>
        ) : (
          /* Recording list */
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3">
            {recordings.map((rec, index) => {
              const isSelected  = selected === rec.id
              const hasBlob     = localIds.has(rec.id)
              const isAnalyzed  = !!rec.analysis

              return (
                <div key={rec.id} onClick={() => setSelected(rec.id)}
                  role="button" tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelected(rec.id)}
                  className="relative w-full rounded-2xl flex items-center gap-3.5 text-left active:scale-[0.97] transition-all duration-200 cursor-pointer overflow-hidden"
                  style={{
                    padding: '14px 16px',
                    background: isSelected
                      ? (darkMode ? 'rgba(108,99,255,0.15)' : 'rgba(108,99,255,0.06)')
                      : (darkMode ? '#16123A' : '#FFFFFF'),
                    border: `1.5px solid ${isSelected
                      ? 'rgba(108,99,255,0.4)'
                      : (darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')}`,
                    boxShadow: isSelected
                      ? '0 4px 24px rgba(108,99,255,0.2)'
                      : darkMode ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
                    animation: `slide-up 0.5s cubic-bezier(0.34,1.2,0.64,1) both`,
                    animationDelay: `${index * 0.05}s`,
                  }}>

                  {/* left accent bar */}
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300"
                    style={{
                      background: isSelected ? 'linear-gradient(180deg,#6C63FF,#4F8AFF)' : 'transparent',
                      opacity: isSelected ? 1 : 0,
                    }} />

                  {/* icon */}
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg,rgba(108,99,255,0.2),rgba(79,138,255,0.15))'
                        : (darkMode ? 'rgba(255,255,255,0.05)' : '#F4F3FF'),
                      boxShadow: isSelected ? '0 0 0 2px rgba(108,99,255,0.3)' : 'none',
                    }}>
                    <WaveIcon active={isSelected} />
                  </div>

                  {/* text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-bold text-gray-800 dark:text-white text-sm truncate leading-tight">{rec.filename}</p>
                      {!hasBlob && (
                        <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                          missing
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDuration(rec.duration)}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDate(rec.createdAt)}</span>
                      {isAnalyzed && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                            Analyzed
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* right side: delete or radio */}
                  {!hasBlob && isSelected ? (
                    <button onClick={e => { e.stopPropagation(); handleDeleteMissing(rec.id) }}
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.1)' }}
                      title="Remove entry">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  ) : (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-250"
                      style={{
                        background: isSelected ? 'linear-gradient(135deg,#6C63FF,#8B85FF)' : 'transparent',
                        border: `2px solid ${isSelected ? 'transparent' : (darkMode ? '#3A3760' : '#D1D5DB')}`,
                        boxShadow: isSelected ? '0 0 0 3px rgba(108,99,255,0.2)' : 'none',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      }}>
                      {isSelected && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Desktop analyze button */}
        <div className="hidden md:block mt-2">{analyzeBtn}</div>
      </div>

      {/* ══════════ MOBILE FLOATING ANALYZE BUTTON ══════════ */}
      <div className="fixed left-4 right-4 z-40 md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 90px)' }}>
        {analyzeBtn}
      </div>

      {/* Record sheet */}
      {showRecordSheet && (
        <RecordSheet user={user} onClose={() => setShowRecordSheet(false)}
          onSaved={(newId) => { setShowRecordSheet(false); loadRecordings(newId) }} />
      )}

      <style>{`
        @keyframes orb-float {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(8px,-12px) scale(1.05); }
          66% { transform: translate(-6px,8px) scale(0.97); }
        }
        @keyframes slide-up {
          from { opacity:0; transform:translateY(18px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes float {
          0%,100% { transform:translateY(0); }
          50% { transform:translateY(-8px); }
        }
        @keyframes gradient-pan {
          0%,100% { background-position:0% 50%; }
          50% { background-position:100% 50%; }
        }
        @keyframes shimmer-sweep {
          0%   { transform:translateX(-100%); }
          100% { transform:translateX(200%); }
        }
        @keyframes wave-bar {
          from { transform:scaleY(0.4); }
          to   { transform:scaleY(1.3); }
        }
      `}</style>
    </div>
  )
}
