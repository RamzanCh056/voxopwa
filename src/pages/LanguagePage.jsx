import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English',    native: 'English' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic',     native: 'اللغة العربية' },
  { code: 'ur', flag: '🇵🇰', name: 'Urdu',       native: 'اردو' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish',    native: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'French',     native: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'German',     native: 'Deutsch' },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese', native: 'Português' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi',      native: 'हिन्दी' },
]

export default function LanguagePage() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const [selected, setSelected] = useState(
    localStorage.getItem('voxofied_language') || 'English'
  )
  const [saving, setSaving] = useState(false)

  async function handleSelect(lang) {
    setSelected(lang.name)
    localStorage.setItem('voxofied_language', lang.name)
    setSaving(true)
    try {
      if (user) await updateDoc(doc(db, 'users', user.uid), { language: lang.name })
    } catch {}
    setSaving(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-6 md:hidden"
        style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Language</h1>
            <p className="text-xs text-white/50">AI responses in your language</p>
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
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Language</h1>
          <p className="text-sm text-gray-400">AI responses will use your chosen language</p>
        </div>
        {saving && <span className="ml-auto text-xs text-gray-400">Saving…</span>}
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 md:max-w-xl md:mx-auto md:w-full">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
          Select language
        </p>
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
          {LANGUAGES.map((lang, i) => {
            const isSelected = selected === lang.name
            return (
              <button key={lang.code} onClick={() => handleSelect(lang)}
                className="w-full flex items-center gap-4 px-4 py-4 transition-colors text-left"
                style={{ borderBottom: i < LANGUAGES.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <span className="text-2xl flex-shrink-0">{lang.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{lang.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lang.native}</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#6C63FF' }}>
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 px-1 leading-relaxed">
          AI coaching insights, mood labels and recommendations will be generated in your selected language. JSON keys remain in English for compatibility.
        </p>
      </div>
    </div>
  )
}
