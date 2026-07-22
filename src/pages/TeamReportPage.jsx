import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKLY_MOOD = [72, 65, 80, 58, 71, 90, 85]
const MEMBER_BREAKDOWN = [
  { name: 'You',        mood: 'Calm',     score: 82, calls: 12, initials: 'YO' },
  { name: 'Ali Hassan', mood: 'Stressed', score: 44, calls: 7,  initials: 'AH' },
  { name: 'Sara Khan',  mood: 'Happy',    score: 91, calls: 15, initials: 'SK' },
  { name: 'John Smith', mood: 'Neutral',  score: 63, calls: 3,  initials: 'JS' },
]

const MOOD_COLOR = { Calm: '#22C55E', Happy: '#F59E0B', Stressed: '#EF4444', Neutral: '#6B7280', Anxious: '#A855F7' }

export default function TeamReportPage() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()

  const maxBar = Math.max(...WEEKLY_MOOD)
  const mostStressedDay = DAYS[WEEKLY_MOOD.indexOf(Math.min(...WEEKLY_MOOD))]
  const wellnessScore = Math.round(WEEKLY_MOOD.reduce((a, b) => a + b, 0) / WEEKLY_MOOD.length)

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Header */}
      <div className="px-5 pt-12 pb-6 md:pt-8"
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
            <h1 className="text-xl font-bold text-white">Team Report</h1>
            <p className="text-xs text-white/50">Aggregated mood across your team</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 md:max-w-3xl md:mx-auto md:w-full flex flex-col gap-4">

        {/* Wellness score */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Team Wellness Score</p>
          <div className="flex items-center gap-4">
            <span className="text-5xl font-black" style={{ color: wellnessScore >= 70 ? '#22C55E' : wellnessScore >= 50 ? '#F59E0B' : '#EF4444' }}>
              {wellnessScore}
            </span>
            <div className="flex-1">
              <div className="w-full h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2E2B5B] mb-1.5">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${wellnessScore}%`, background: wellnessScore >= 70 ? '#22C55E' : wellnessScore >= 50 ? '#F59E0B' : '#EF4444' }} />
              </div>
              <p className="text-xs text-gray-400">out of 100 · This week</p>
            </div>
          </div>
        </div>

        {/* Weekly mood trend */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Weekly Mood Trend</p>
          <div className="flex items-end gap-2 h-24">
            {WEEKLY_MOOD.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${(val / maxBar) * 80}px`,
                    background: val === Math.min(...WEEKLY_MOOD)
                      ? 'linear-gradient(180deg,#EF4444,#FCA5A5)'
                      : 'linear-gradient(180deg,#6C63FF,#8B85FF)',
                    minHeight: 8,
                  }} />
                <span className="text-[10px] text-gray-400">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most stressed day */}
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-sm font-bold text-red-500">Most stressed day: {mostStressedDay}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Consider scheduling lighter workloads on this day</p>
          </div>
        </div>

        {/* Member breakdown */}
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Member Breakdown</p>
          <div className="flex flex-col gap-2">
            {MEMBER_BREAKDOWN.map((m, i) => (
              <div key={i} className="bg-white dark:bg-[#1E1B4B] rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                  {m.initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{m.name}</p>
                    <span className="text-xs font-bold" style={{ color: MOOD_COLOR[m.mood] || '#6B7280' }}>{m.score}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2E2B5B]">
                    <div className="h-full rounded-full"
                      style={{ width: `${m.score}%`, background: MOOD_COLOR[m.mood] || '#6C63FF' }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${MOOD_COLOR[m.mood] || '#6B7280'}15`, color: MOOD_COLOR[m.mood] || '#6B7280' }}>
                    {m.mood}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.calls} calls</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
