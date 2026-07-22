import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

function formatDur(secs) {
  if (!secs) return '—'
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

async function getAudioDuration(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(audio.duration) }
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
  })
}

export default function BulkImportPage() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState(new Set())

  const AUDIO_TYPES = /\.(opus|ogg|mp3|m4a|wav|webm|flac)$/i

  async function processFiles(rawFiles) {
    const audioFiles = Array.from(rawFiles).filter(f => AUDIO_TYPES.test(f.name))
    const withDurations = await Promise.all(audioFiles.map(async f => ({
      file: f,
      name: f.name,
      duration: await getAudioDuration(f),
    })))
    setFiles(withDurations)
    setSelected(new Set(withDurations.map((_, i) => i)))
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  function handleInput(e) { processFiles(e.target.files) }

  function toggleSelect(i) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const selectedFiles = files.filter((_, i) => selected.has(i))
  const totalMins = selectedFiles.reduce((sum, f) => sum + (f.duration || 60), 0) / 60

  function handleAnalyzeAll() {
    if (selectedFiles.length === 0) return
    navigate('/bulk-progress', { state: { files: selectedFiles.map(f => ({ name: f.name, duration: f.duration })) } })
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-6 md:hidden"
        style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Bulk Import</h1>
            <p className="text-xs text-white/50">Analyze all voice notes at once</p>
          </div>
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
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Bulk Import</h1>
          <p className="text-sm text-gray-400">Analyze all voice notes at once</p>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-32 md:px-8 md:max-w-2xl md:mx-auto md:w-full flex flex-col gap-4">

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl flex flex-col items-center justify-center py-12 px-6 gap-3 cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragging ? '#6C63FF' : (darkMode ? 'rgba(108,99,255,0.4)' : '#C4B5FD')}`,
            background: dragging
              ? 'rgba(108,99,255,0.08)'
              : (darkMode ? 'rgba(108,99,255,0.04)' : '#F5F3FF'),
          }}>
          <span className="text-4xl">📁</span>
          <div className="text-center">
            <p className="font-bold text-gray-800 dark:text-white">Drop WhatsApp export folder</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ZIP file or folder containing .opus .ogg voice notes</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#6C63FF' }}>tap to browse files</p>
          <input ref={inputRef} type="file" accept=".zip,.opus,.ogg,.mp3,.m4a,.wav,.webm" multiple className="hidden"
            onChange={handleInput} />
        </div>

        {/* Files list */}
        {files.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800 dark:text-white">Detected files</p>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#6C63FF', color: '#fff' }}>
                {files.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {files.map((f, i) => (
                <div key={i}
                  className="bg-white dark:bg-[#1E1B4B] rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm cursor-pointer"
                  onClick={() => toggleSelect(i)}>
                  <span className="text-xl flex-shrink-0">🎵</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{f.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDur(f.duration)}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: selected.has(i) ? '#6C63FF' : '#D1D5DB',
                      background: selected.has(i) ? '#6C63FF' : 'transparent',
                    }}>
                    {selected.has(i) && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      {files.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 md:max-w-2xl md:mx-auto md:left-auto md:right-auto"
          style={{ background: darkMode ? 'rgba(15,12,41,0.96)' : 'rgba(240,242,247,0.96)', backdropFilter: 'blur(20px)' }}>
          <button onClick={handleAnalyzeAll} disabled={selected.size === 0}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all"
            style={{
              background: selected.size > 0 ? 'linear-gradient(135deg,#6C63FF,#8B85FF)' : '#D1D5DB',
              boxShadow: selected.size > 0 ? '0 6px 24px rgba(108,99,255,0.4)' : 'none',
            }}>
            ⚡ Analyze all {selected.size} file{selected.size !== 1 ? 's' : ''}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            Est. {Math.ceil(totalMins)} min · uses {Math.ceil(totalMins)} minutes from your plan
          </p>
        </div>
      )}
    </div>
  )
}
