import { useRef, useState } from 'react'

export default function ShareMoodCard({ analysis, onClose }) {
  const cardRef = useRef(null)
  const [copied, setCopied] = useState(false)

  const mood = analysis?.primaryMood || 'Neutral'
  const emoji = analysis?.primaryMoodEmoji || '😐'
  const confidence = analysis?.confidence ?? 0
  const APP_URL = 'https://voxofied.app'

  async function handleWhatsApp() {
    const text = `I just analyzed my voice — I'm feeling ${mood} (${confidence}% confidence). Try Voxofied AI!`
    if (navigator.share) {
      try { await navigator.share({ title: 'My Mood Analysis', text, url: APP_URL }) } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + APP_URL)}`, '_blank')
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(APP_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function handleSaveImage() {
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true })
      const link = document.createElement('a')
      link.download = `voxofied-mood-${mood.toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('Could not save image. Try a different browser.')
    }
  }

  const BARS = [6, 10, 16, 22, 18, 14, 10, 7, 12, 20, 26, 22, 16, 11, 8, 13, 19, 24, 18, 12, 8, 10, 14, 6]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>

      <div className="w-full max-w-sm bg-white dark:bg-[#1E1B4B] rounded-t-3xl md:rounded-3xl p-5 pb-8 md:pb-5"
        style={{ animation: 'sheet-up 0.35s cubic-bezier(0.34,1.2,0.64,1) both' }}
        onClick={e => e.stopPropagation()}>

        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600 mx-auto mb-5 md:hidden" />

        <h2 className="text-base font-bold text-gray-800 dark:text-white mb-4 text-center">Share your mood</h2>

        {/* Gradient card preview */}
        <div ref={cardRef} className="rounded-2xl p-6 mx-auto flex flex-col items-center gap-3 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #6C63FF 0%, #06B6D4 100%)',
            boxShadow: '0 12px 40px rgba(108,99,255,0.4)',
          }}>

          {/* Voxofied logo row */}
          <div className="flex items-center gap-1.5 self-start">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              </svg>
            </div>
            <span className="text-white text-[11px] font-bold opacity-80">Voxofied AI</span>
          </div>

          {/* Emoji */}
          <div className="text-6xl my-1" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
            {emoji}
          </div>

          {/* Mood + confidence */}
          <div className="text-center">
            <p className="text-white font-black text-2xl leading-tight">{mood}</p>
            <p className="text-white font-semibold text-sm mt-0.5" style={{ opacity: 0.8 }}>
              {confidence}% confidence
            </p>
          </div>

          {/* Waveform */}
          <div className="flex items-center gap-[2px] mt-1">
            {BARS.map((h, i) => (
              <div key={i} className="rounded-full"
                style={{
                  width: 3,
                  height: h,
                  background: `rgba(255,255,255,${0.35 + (i % 4) * 0.12})`,
                  animation: `wf-bar ${0.5 + (i % 5) * 0.1}s ease-in-out ${i * 0.04}s infinite alternate`,
                }} />
            ))}
          </div>

          {/* Footer */}
          <p className="text-white text-[10px] font-medium mt-1" style={{ opacity: 0.6 }}>
            Analyzed by Voxofied AI · voxofied.app
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5 mt-5">
          <button onClick={handleWhatsApp}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: '#25D366' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.5 2.003C6.203 2.003 1.899 6.307 1.899 11.604c0 1.67.435 3.233 1.195 4.59L2 22l5.961-1.075A9.543 9.543 0 0011.5 21.205c5.297 0 9.601-4.304 9.601-9.601 0-5.297-4.304-9.601-9.601-9.601z"/>
            </svg>
            Share to WhatsApp
          </button>

          <button onClick={handleCopyLink}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(108,99,255,0.08)',
              color: copied ? '#16A34A' : '#6C63FF',
              border: `1.5px solid ${copied ? '#22C55E' : 'rgba(108,99,255,0.3)'}`,
            }}>
            {copied ? '✓ Copied!' : '🔗 Copy shareable link'}
          </button>

          <button onClick={handleSaveImage}
            className="w-full py-3 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1.5px solid rgba(0,0,0,0.08)' }}>
            📷 Save as image
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheet-up { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes wf-bar { from { transform: scaleY(0.4) } to { transform: scaleY(1) } }
      `}</style>
    </div>
  )
}
