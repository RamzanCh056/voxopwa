import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { saveRecordingMeta, getRecordingsMeta } from '../services/firestoreService'
import { saveRecording, isAudioTypeAllowed } from '../services/storageService'
import RecordSheet from '../components/RecordSheet'

/* Animated equalizer bars */
function WaveIcon({ active }) {
  const bars = [3, 6, 10, 14, 10, 7, 4, 3]
  return (
    <div className="flex items-end gap-[2.5px]" style={{ height: 18 }}>
      {bars.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{
            height: h,
            transformOrigin: 'bottom center',
            background: active ? 'linear-gradient(180deg,#8B85FF,#6C63FF)' : '#C4C9D4',
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
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
function formatDate(ts) {
  if (!ts) return '—'
  return tsToDate(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* Arrow icon used on both upload cards */
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-gray-500 dark:text-gray-400">
      <line x1="7" y1="17" x2="17" y2="7"/>
      <polyline points="7 7 17 7 17 17"/>
    </svg>
  )
}

export default function HomePage() {
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { darkMode } = useTheme()
  const fileRef      = useRef(null)

  const [selected,        setSelected]        = useState(null)
  const [recordings,      setRecordings]      = useState([])
  const [uploading,       setUploading]       = useState(false)
  const [fileError,       setFileError]       = useState('')
  const [showRecordSheet, setShowRecordSheet] = useState(false)

  const loadRecordings = useCallback(async (selectId = null) => {
    if (!user) return
    const recs = await getRecordingsMeta(user.uid)
    setRecordings(recs)
    if (selectId) {
      setSelected(selectId)
    } else if (recs.length > 0 && !selected) {
      setSelected(recs[0].id)
    }
  }, [user, selected])

  useEffect(() => {
    loadRecordings()
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
      setFileError('Unsupported file type. Please use an audio file.')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const duration    = await getAudioDuration(file)
      const meta        = { filename: file.name, duration, date: new Date().toISOString(), analysisStatus: 'pending', analysis: null }
      const firestoreId = await saveRecordingMeta(user.uid, meta)
      await saveRecording({ id: firestoreId, ...meta, audioBlob: file })
      await loadRecordings(firestoreId)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const analyzedCount = recordings.filter(r => r.analysis).length

  const analyzeBtn = (
    <button
      onClick={() => selected && navigate(`/recording-details/${selected}`)}
      disabled={!selected || uploading}
      className="relative w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg,#6C63FF 0%,#8B85FF 50%,#4F8AFF 100%)',
        backgroundSize: '200% 200%',
        animation: selected && !uploading ? 'gradient-pan 4s ease infinite,glow-breathe 2.5s ease-in-out infinite' : 'none',
        boxShadow: selected && !uploading ? '0 8px 32px rgba(108,99,255,0.45)' : 'none',
      }}>
      {selected && !uploading && (
        <span className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent 20%,rgba(255,255,255,0.18) 50%,transparent 80%)', animation: 'shimmer-sweep 2.4s ease-in-out infinite' }} />
      )}
      {uploading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
          </svg>
          Saving…
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M7 2l10 10L7 22V2z"/></svg>
          Analyze Recording
        </>
      )}
    </button>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Hidden file input — shared by all upload triggers */}
      <input ref={fileRef} type="file"
        accept=".mp3,.m4a,.wav,.webm,.ogg,.opus,.aac,.flac,.wma,.mp4,.3gp,.amr"
        className="hidden"
        onChange={handleFileSelect} />

      {/* ══ Mobile header — full-width, bottom corners rounded ══ */}
      <div className="md:hidden px-5 pt-12 pb-6"
        style={{ background: '#0F1729', borderRadius: '0 0 28px 28px' }}>
        <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 mb-3">
          <span className="text-purple-300 text-xs">✨</span>
          <span className="text-gray-300 text-xs font-medium">AI voice insights</span>
        </div>
        <h1 className="text-white text-3xl font-bold mb-1">Voxofied</h1>
        <p style={{ color: '#9CA3AF' }} className="text-sm">Understand mood, stress &amp; intent using AI</p>
      </div>

      {/* ══ Desktop header — inset rounded card ══ */}
      <div className="hidden md:block mx-8 mt-6 px-8 py-6 rounded-[20px]"
        style={{ background: '#0F1729' }}>
        <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 mb-2">
          <span className="text-purple-300 text-xs">✨</span>
          <span className="text-gray-300 text-xs font-medium">AI voice insights</span>
        </div>
        <h1 className="text-white text-2xl font-bold mb-1">Voxofied</h1>
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Understand mood, stress &amp; intent using AI</p>
      </div>

      {/* ══ Mobile: add-audio card — overlaps header with negative margin ══ */}
      <div className="md:hidden mx-4 -mt-2 bg-white dark:bg-[#1A1740] rounded-3xl shadow-lg p-5 relative z-10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add audio to analyze</h2>
          <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs font-semibold px-2.5 py-1 rounded-full">
            2 ways
          </span>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Upload a file or record live</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Upload */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-2xl p-4 text-left relative active:scale-95 transition-transform disabled:opacity-60">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ background: '#6C63FF' }}>
              {uploading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </div>
            <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
              <ArrowIcon />
            </span>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Upload</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">MP3 · M4A · WAV</p>
          </button>
          {/* Record */}
          <button
            onClick={() => setShowRecordSheet(true)}
            className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-2xl p-4 text-left relative active:scale-95 transition-transform">
            <div className="w-11 h-11 rounded-xl bg-[#EF4444] flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="9"  y1="22" x2="15" y2="22"/>
              </svg>
            </div>
            <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
              <ArrowIcon />
            </span>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Record</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Call or in person</p>
          </button>
        </div>
        {fileError && (
          <p className="text-xs text-red-500 mt-3 text-center">{fileError}</p>
        )}
      </div>

      {/* ══ Desktop: add-audio card — sits below header card ══ */}
      <div className="hidden md:block mx-8 mt-4 max-w-2xl bg-white dark:bg-[#1A1740] rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add audio to analyze</h2>
          <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-xs font-semibold px-2.5 py-1 rounded-full">
            2 ways
          </span>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Upload a file or record live</p>
        <div className="grid grid-cols-2 gap-4">
          {/* Upload */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-2xl p-5 text-left relative active:scale-95 transition-transform disabled:opacity-60">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: '#6C63FF' }}>
              {uploading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </div>
            <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
              <ArrowIcon />
            </span>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Upload file</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">MP3 · M4A · WAV · WebM</p>
          </button>
          {/* Record */}
          <button
            onClick={() => setShowRecordSheet(true)}
            className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-2xl p-5 text-left relative active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="9"  y1="22" x2="15" y2="22"/>
              </svg>
            </div>
            <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center">
              <ArrowIcon />
            </span>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Record live</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Call or in person</p>
          </button>
        </div>
        {fileError && (
          <p className="text-xs text-red-500 mt-3">{fileError}</p>
        )}
      </div>

      {/* ══ Main content ══ */}
      <div className="flex-1 px-4 pt-6 pb-36 md:pb-8 md:px-8 flex flex-col gap-4 md:max-w-5xl md:w-full md:mx-auto">

        {/* ── Recordings section header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-purple-500 dark:text-purple-400">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Your recordings</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {recordings.length} {recordings.length === 1 ? 'file' : 'files'} ready to analyze
              </p>
            </div>
          </div>
          <span className="bg-[#6C63FF] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
            {recordings.length}
          </span>
        </div>

        {/* ── Recording list ── */}
        {recordings.length === 0 ? (
          <div className="rounded-3xl p-8 flex flex-col items-center gap-4 text-center"
            style={{
              background: darkMode ? '#1C1940' : '#ffffff',
              border: `1.5px dashed ${darkMode ? 'rgba(108,99,255,0.25)' : '#E0DFFE'}`,
            }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: darkMode ? 'rgba(108,99,255,0.1)' : '#F0EFFE', animation: 'float 4s ease-in-out infinite' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
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
              style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)', boxShadow: '0 4px 16px rgba(108,99,255,0.35)' }}>
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
                    animationDelay: `${0.07 + index * 0.06}s`,
                  }}>

                  {isSelected && (
                    <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                      style={{ background: 'linear-gradient(180deg,#6C63FF,#4F8AFF)' }} />
                  )}

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{
                      background: isSelected
                        ? 'rgba(108,99,255,0.15)'
                        : (darkMode ? 'rgba(108,99,255,0.08)' : '#F0EFFE'),
                      boxShadow: isSelected ? '0 0 0 2px rgba(108,99,255,0.25)' : 'none',
                    }}>
                    <WaveIcon active={isSelected} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{rec.filename}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatDuration(rec.duration)}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(rec.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg,#6C63FF,#8B85FF)' : 'transparent',
                      border: `2px solid ${isSelected ? 'transparent' : (darkMode ? '#3A3760' : '#D1D5DB')}`,
                      boxShadow: isSelected ? '0 0 0 3px rgba(108,99,255,0.2)' : 'none',
                    }}>
                    {isSelected && (
                      <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="hidden md:block">{analyzeBtn}</div>
      </div>

      {/* Mobile floating analyze button — sits above BottomNav, safe-area-inset-bottom aware */}
      <div className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[390px] z-40 md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
        {analyzeBtn}
      </div>

      {/* Record bottom sheet */}
      {showRecordSheet && (
        <RecordSheet
          user={user}
          onClose={() => setShowRecordSheet(false)}
          onSaved={(newId) => {
            setShowRecordSheet(false)
            loadRecordings(newId)
          }}
        />
      )}
    </div>
  )
}
