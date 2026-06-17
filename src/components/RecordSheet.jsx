import { useState } from 'react'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { saveRecordingMeta } from '../services/firestoreService'
import { saveRecording } from '../services/storageService'

function formatTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function RecordSheet({ user, onClose, onSaved }) {
  const { isRecording, duration, waveformData, startRecording, stopRecording } = useVoiceRecorder()
  const [micError, setMicError] = useState('')
  const [saving,   setSaving]   = useState(false)

  async function handleStart() {
    setMicError('')
    // Pre-check: request + immediately release a stream to surface permission errors
    // before handing off to the hook. If already granted, browser reuses permission silently.
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
      probe.getTracks().forEach(t => t.stop())
    } catch {
      setMicError('Microphone access is needed to record. Please allow it in your browser settings.')
      return
    }
    startRecording()
  }

  async function handleStopAndSave() {
    if (saving) return
    setSaving(true)
    try {
      const result = await stopRecording()
      if (!result?.audioBlob) { setSaving(false); return }

      const { audioBlob, duration: dur } = result
      const now      = new Date()
      const filename = `Recording_${now.toISOString().slice(0, 10)}_${now.getTime()}.webm`
      const meta = {
        filename,
        duration: dur || 0,
        date:     now.toISOString(),
        analysisStatus: 'pending',
        analysis: null,
      }
      const firestoreId = await saveRecordingMeta(user.uid, meta)
      await saveRecording({ id: firestoreId, ...meta, audioBlob })
      onSaved(firestoreId)
    } catch (err) {
      console.error('RecordSheet: failed to save', err)
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (isRecording) await stopRecording().catch(() => {}) // stop mic, discard blob
    onClose()
  }

  return (
    <>
      {/* Dark overlay — tap to cancel only when not recording/saving */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={!isRecording && !saving ? handleCancel : undefined}
        style={{ animation: 'fade-in 0.2s ease' }}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[201] bg-white dark:bg-[#1A1740] rounded-t-3xl shadow-2xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'sheet-up 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          maxHeight: '88vh',
          overflowY: 'auto',
        }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <div className="px-6 pt-2 pb-8">

          {/* ── IDLE STATE ─────────────────────────────────────────── */}
          {!isRecording && !saving && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Audio</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Call or in person</p>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3 mb-8"
                style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.18)' }}>
                <span className="text-lg leading-none mt-px flex-shrink-0">📞</span>
                <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                  <strong>On a call?</strong> Turn on speakerphone so both voices are captured.
                  Voxofied can't tap directly into call audio — your phone's mic needs to pick up both sides.
                </p>
              </div>

              {/* Mic error */}
              {micError && (
                <div className="rounded-2xl px-4 py-3 mb-6 flex items-start gap-3"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"
                    strokeLinecap="round" className="w-4 h-4 flex-shrink-0 mt-px">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <p className="text-xs text-red-700 leading-relaxed">{micError}</p>
                    <button
                      onClick={handleStart}
                      className="text-xs font-bold text-red-600 mt-1.5 underline underline-offset-2">
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Big start button */}
              <div className="flex flex-col items-center gap-5">
                <button
                  onClick={handleStart}
                  className="w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: 'linear-gradient(145deg,#EF4444,#DC2626)',
                    boxShadow: '0 8px 32px rgba(239,68,68,0.45)',
                  }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="9"  y1="22" x2="15" y2="22"/>
                  </svg>
                </button>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tap to start recording</p>

                <button
                  onClick={handleCancel}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-1">
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* ── RECORDING STATE ─────────────────────────────────────── */}
          {isRecording && !saving && (
            <>
              <div className="flex flex-col items-center gap-6">

                {/* Timer */}
                <div className="text-center">
                  <p className="text-5xl font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">
                    {formatTime(duration)}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"
                      style={{ animation: 'blink-dot 1s step-start infinite' }} />
                    <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Recording</span>
                  </div>
                </div>

                {/* Pulsing stop button */}
                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute rounded-full bg-red-500/15 w-28 h-28"
                    style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
                  <div className="absolute rounded-full bg-red-500/10 w-36 h-36"
                    style={{ animation: 'pulse-ring 2s ease-out infinite 0.7s' }} />
                  <div className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg,#EF4444,#DC2626)',
                      boxShadow: '0 6px 24px rgba(239,68,68,0.5)',
                    }}>
                    {/* Square stop icon */}
                    <div className="w-7 h-7 rounded-md bg-white" />
                  </div>
                </div>

                {/* Live waveform */}
                <div className="flex items-center gap-[3px] h-14 justify-center w-full">
                  {waveformData.slice(0, 32).map((v, i) => {
                    const h = Math.max(4, Math.round(4 + (v / 255) * 44))
                    return (
                      <div key={i}
                        className="rounded-full"
                        style={{
                          width: 3,
                          height: h,
                          background: `rgba(239,68,68,${0.4 + (v / 255) * 0.6})`,
                          transition: 'height 80ms ease',
                        }} />
                    )
                  })}
                </div>

                {/* Stop & Save */}
                <button
                  onClick={handleStopAndSave}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg,#EF4444,#DC2626)',
                    boxShadow: '0 6px 24px rgba(239,68,68,0.4)',
                  }}>
                  Stop &amp; Save
                </button>
              </div>
            </>
          )}

          {/* ── SAVING STATE ────────────────────────────────────────── */}
          {saving && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg className="animate-spin w-10 h-10 text-purple-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
              </svg>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Saving recording…</p>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes fade-in   { from { opacity:0 } to { opacity:1 } }
        @keyframes sheet-up  { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes pulse-ring {
          0%   { transform:scale(0.85); opacity:0.8; }
          60%  { transform:scale(1.2);  opacity:0;   }
          100% { transform:scale(1.2);  opacity:0;   }
        }
        @keyframes blink-dot {
          0%,100% { opacity:1 } 50% { opacity:0 }
        }
      `}</style>
    </>
  )
}
