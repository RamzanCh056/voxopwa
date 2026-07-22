import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MOOD_SCORE = {
  happy: 90, excited: 85, calm: 80, neutral: 60,
  sad: 40, anxious: 35, stressed: 25, angry: 15,
}
const MOOD_COLOR = {
  happy: '#22C55E', excited: '#F59E0B', calm: '#22C55E',
  neutral: '#6B7280', sad: '#4F8AFF', anxious: '#A855F7',
  stressed: '#EF4444', angry: '#EF4444',
}

function scoreColor(s) {
  return s >= 70 ? '#22C55E' : s >= 45 ? '#F59E0B' : '#EF4444'
}

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
}

export default function TeamReportPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { darkMode } = useTheme()
  const { user } = useAuth()

  const [members, setMembers] = useState(state?.members || [])
  const [loading, setLoading] = useState(!state?.members)
  const [weeklyScores, setWeeklyScores] = useState([])
  const [error, setError] = useState(null)

  const loadReportData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const teamsRef = collection(db, 'teams')
      const adminSnap = await getDocs(query(teamsRef, where('adminUid', '==', user.uid)))
      const memberSnap = await getDocs(query(teamsRef, where('memberUids', 'array-contains', user.uid)))

      let teamDoc = null
      if (!adminSnap.empty) teamDoc = { id: adminSnap.docs[0].id, ...adminSnap.docs[0].data() }
      else if (!memberSnap.empty) teamDoc = { id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() }

      if (!teamDoc) { setLoading(false); return }

      const enriched = await Promise.all(
        (teamDoc.members || []).map(async (member) => {
          try {
            const recRef = collection(db, 'users', member.uid, 'recordings')

            const latestSnap = await getDocs(
              query(recRef, where('analysisStatus', '==', 'completed'), orderBy('createdAt', 'desc'), limit(1))
            )

            let latestMood = null
            let latestMoodEmoji = '😐'
            let clarityScore = null

            if (!latestSnap.empty) {
              const rec = latestSnap.docs[0].data()
              latestMood = rec.analysis?.primaryMood || null
              latestMoodEmoji = rec.analysis?.primaryMoodEmoji || '😐'
              clarityScore = rec.analysis?.clarityScore ?? null
            }

            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            const weekSnap = await getDocs(query(recRef, where('createdAt', '>=', weekAgo)))

            return { ...member, latestMood, latestMoodEmoji, clarityScore, callsThisWeek: weekSnap.size }
          } catch {
            return { ...member, latestMood: null, latestMoodEmoji: '😐', clarityScore: null, callsThisWeek: 0 }
          }
        })
      )
      setMembers(enriched)

      // Build weekly bar chart: average mood score per day of the week from this week's recordings
      const dayScores = Array(7).fill(null).map(() => [])
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      for (const member of teamDoc.members || []) {
        try {
          const recRef = collection(db, 'users', member.uid, 'recordings')
          const weekSnap = await getDocs(
            query(recRef, where('analysisStatus', '==', 'completed'), where('createdAt', '>=', weekAgo))
          )
          weekSnap.forEach(d => {
            const rec = d.data()
            const mood = rec.analysis?.primaryMood?.toLowerCase()
            const score = MOOD_SCORE[mood] ?? 60
            const dayIdx = new Date(rec.createdAt?.toDate?.() || rec.createdAt).getDay()
            // 0=Sun shift to Mon=0
            const shifted = (dayIdx + 6) % 7
            dayScores[shifted].push(score)
          })
        } catch {}
      }

      setWeeklyScores(dayScores.map(arr => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null))
    } catch (err) {
      console.error('TeamReportPage:', err)
      setError('Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!state?.members) loadReportData()
  }, [state, loadReportData])

  const wellnessScore = members.length > 0
    ? Math.round(
        members.reduce((s, m) => s + (MOOD_SCORE[m.latestMood?.toLowerCase()] ?? 60), 0) / members.length
      )
    : 0

  const stressedDay = (() => {
    const filled = weeklyScores.map((v, i) => ({ v: v ?? 60, i }))
    if (filled.every(x => x.v === 60)) return null
    const minIdx = filled.reduce((a, b) => b.v < a.v ? b : a).i
    return DAYS[minIdx]
  })()

  const maxBar = Math.max(...weeklyScores.filter(Boolean), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (members.length === 0 && !loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="px-5 pt-12 pb-6 md:pt-8 md:px-8"
          style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">Team Report</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <span className="text-5xl">📊</span>
          <p className="font-bold text-gray-800 dark:text-white text-lg">No team data yet</p>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            Create a team and have members analyze recordings to see aggregated wellness data here.
          </p>
          <button onClick={() => navigate('/teams')}
            className="px-6 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: '#6C63FF' }}>
            Go to My Team
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Header */}
      <div className="px-5 pt-12 pb-6 md:pt-8 md:px-8"
        style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Team Report</h1>
            <p className="text-xs text-white/50">Live data from {members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 md:max-w-3xl md:mx-auto md:w-full flex flex-col gap-4">

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-500"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* Wellness score */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Team Wellness Score</p>
          <div className="flex items-center gap-4">
            <span className="text-5xl font-black" style={{ color: scoreColor(wellnessScore) }}>
              {wellnessScore}
            </span>
            <div className="flex-1">
              <div className="w-full h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2E2B5B] mb-1.5">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${wellnessScore}%`, background: scoreColor(wellnessScore) }} />
              </div>
              <p className="text-xs text-gray-400">out of 100 · based on latest mood per member</p>
            </div>
          </div>
        </div>

        {/* Weekly mood trend */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Weekly Mood Trend</p>
          {weeklyScores.every(v => v === null) ? (
            <p className="text-sm text-gray-400 text-center py-4">No recordings from team members this week</p>
          ) : (
            <div className="flex items-end gap-2 h-24">
              {DAYS.map((day, i) => {
                const val = weeklyScores[i]
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-t-lg transition-all"
                      style={{
                        height: val != null ? `${(val / maxBar) * 80}px` : '4px',
                        background: val != null
                          ? (val <= 40 ? 'linear-gradient(180deg,#EF4444,#FCA5A5)' : 'linear-gradient(180deg,#6C63FF,#8B85FF)')
                          : (darkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                        minHeight: 4,
                        opacity: val == null ? 0.4 : 1,
                      }} />
                    <span className="text-[10px] text-gray-400">{day}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Most stressed day */}
        {stressedDay && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-sm font-bold text-red-500">Most stressed day: {stressedDay}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Consider scheduling lighter workloads on this day
              </p>
            </div>
          </div>
        )}

        {/* Member breakdown */}
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">
            Member Breakdown
          </p>
          <div className="flex flex-col gap-2">
            {members.map((m, i) => {
              const score = MOOD_SCORE[m.latestMood?.toLowerCase()] ?? null
              const color = m.latestMood ? (MOOD_COLOR[m.latestMood.toLowerCase()] || '#6B7280') : '#D1D5DB'
              return (
                <div key={m.uid || i} className="bg-white dark:bg-[#1E1B4B] rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                    {initials(m.name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{m.name}</p>
                      <span className="text-xs font-bold" style={{ color }}>
                        {score != null ? score : '—'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2E2B5B]">
                      <div className="h-full rounded-full"
                        style={{ width: score != null ? `${score}%` : '0%', background: color }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {m.latestMood ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: `${color}15`, color }}>
                        {m.latestMoodEmoji} {m.latestMood}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No data</span>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{m.callsThisWeek} this wk</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
