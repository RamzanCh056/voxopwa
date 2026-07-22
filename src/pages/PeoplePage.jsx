import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PeoplePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('relationships')

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-5 md:hidden bg-white dark:bg-[#1E1B4B] border-b border-gray-100 dark:border-transparent"
        style={{ borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {tab === 'relationships' ? 'Relationships' : 'My Team'}
          </h1>
          {tab === 'team'
            ? <button onClick={() => navigate('/teams')}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-lg"
                style={{ background: '#6C63FF' }}>+</button>
            : <button className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-white text-lg bg-gray-100 dark:bg-white/15">+</button>
          }
        </div>
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(108,99,255,0.08)' }}>
          {['relationships', 'team'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all"
              style={tab === t
                ? { background: '#6C63FF', color: '#fff' }
                : { color: '#9CA3AF' }}>
              {t === 'team' ? 'My Team' : 'Relationships'}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">People</h1>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(108,99,255,0.08)' }}>
            {['relationships', 'team'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all"
                style={tab === t ? { background: '#6C63FF', color: '#fff' } : { color: '#9CA3AF' }}>
                {t === 'team' ? 'My Team' : 'Relationships'}
              </button>
            ))}
          </div>
        </div>
        {tab === 'team'
          ? <button onClick={() => navigate('/teams')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#6C63FF' }}>
              Open Team →
            </button>
          : <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#6C63FF' }}>
              <span className="text-lg leading-none">+</span> Add person
            </button>
        }
      </div>

      <div className="flex-1 px-4 pt-5 pb-24 md:pb-8 md:px-8 flex flex-col gap-4 md:max-w-5xl md:w-full md:mx-auto">

        {tab === 'relationships' ? (
          <>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm p-5 flex flex-col items-center gap-3 text-center md:flex-row md:text-left md:gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(108,99,255,0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 dark:text-white text-sm">Track relationships</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Analyze how emotions change with different people in your conversations
                </p>
              </div>
              <button className="mt-1 md:mt-0 px-6 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
                style={{ color: '#6C63FF', border: '1.5px solid #6C63FF', background: 'transparent' }}>
                + Add a person to start tracking
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10">
              <svg viewBox="0 0 120 100" className="w-32 h-28" fill="none">
                <circle cx="60" cy="55" r="38" fill="#F0F2F7" />
                <circle cx="42" cy="40" r="11" fill="#D1D5DB" />
                <path d="M22 72c0-11 9-18 20-18" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round" />
                <circle cx="78" cy="40" r="11" fill="#D1D5DB" />
                <path d="M98 72c0-11-9-18-20-18" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round" />
                <path d="M42 54c9 6 27 6 36 0" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
              </svg>
              <div className="text-center">
                <p className="font-semibold text-gray-400 text-sm">No relationships yet</p>
                <p className="text-xs text-gray-300 mt-1.5 leading-relaxed max-w-[220px]">
                  People you add will appear here with their emotional patterns
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-5 py-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
              <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 dark:text-white text-lg">Team collaboration</p>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed max-w-xs">
                Create a team, invite members, and view aggregated mood insights across your group.
              </p>
            </div>
            <button onClick={() => navigate('/teams')}
              className="px-8 py-3 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)', boxShadow: '0 6px 24px rgba(108,99,255,0.35)' }}>
              Open My Team →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
