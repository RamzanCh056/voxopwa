import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit,
  arrayUnion, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const MOOD_COLORS = {
  calm: '#22C55E', happy: '#22C55E', excited: '#F59E0B',
  stressed: '#EF4444', angry: '#EF4444', anxious: '#A855F7',
  neutral: '#6B7280', sad: '#4F8AFF',
}

function moodColor(mood) {
  return MOOD_COLORS[mood?.toLowerCase()] || '#6B7280'
}

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
}

function InviteModal({ teamId, onClose, darkMode }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/join?team=${teamId}`

  async function copy() {
    try { await navigator.clipboard.writeText(link) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-[#1E1B4B] rounded-t-3xl md:rounded-3xl p-6 pb-8 md:pb-6"
        style={{ animation: 'sheet-up 0.35s cubic-bezier(0.34,1.2,0.64,1) both' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600 mx-auto mb-5 md:hidden" />
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Invite team member</h2>
        <p className="text-sm text-gray-400 mb-4">Anyone with this link can join your team</p>
        <div className="px-3 py-3 rounded-xl mb-4"
          style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FF', border: '1px solid rgba(108,99,255,0.2)' }}>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate font-mono">{link}</p>
        </div>
        <button onClick={copy}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all text-white"
          style={{ background: copied ? '#22C55E' : '#6C63FF' }}>
          {copied ? '✓ Copied!' : 'Copy invite link'}
        </button>
      </div>
      <style>{`@keyframes sheet-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  )
}

export default function TeamsPage() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()
  const { user } = useAuth()

  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState(null)

  const loadTeamData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const teamsRef = collection(db, 'teams')

      // Look for teams where user is admin
      const adminSnap = await getDocs(query(teamsRef, where('adminUid', '==', user.uid)))
      // Look for teams where user is a member
      const memberSnap = await getDocs(query(teamsRef, where('memberUids', 'array-contains', user.uid)))

      let teamDoc = null
      if (!adminSnap.empty) {
        teamDoc = { id: adminSnap.docs[0].id, ...adminSnap.docs[0].data() }
      } else if (!memberSnap.empty) {
        teamDoc = { id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() }
      }

      if (!teamDoc) {
        setTeam(null)
        setMembers([])
        setLoading(false)
        return
      }

      setTeam(teamDoc)

      // Load each member's latest mood from their recordings
      const enriched = await Promise.all(
        (teamDoc.members || []).map(async (member) => {
          try {
            const recRef = collection(db, 'users', member.uid, 'recordings')

            // Latest analyzed recording
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

            // Count recordings this week
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            const weekSnap = await getDocs(
              query(recRef, where('createdAt', '>=', weekAgo))
            )

            return {
              ...member,
              latestMood,
              latestMoodEmoji,
              clarityScore,
              callsThisWeek: weekSnap.size,
              isCurrentUser: member.uid === user.uid,
            }
          } catch {
            return {
              ...member,
              latestMood: null,
              latestMoodEmoji: '😐',
              clarityScore: null,
              callsThisWeek: 0,
              isCurrentUser: member.uid === user.uid,
            }
          }
        })
      )

      setMembers(enriched)
    } catch (err) {
      console.error('loadTeamData:', err)
      setError('Failed to load team. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadTeamData() }, [loadTeamData])

  async function createTeam() {
    if (!user || creating) return
    setCreating(true)
    try {
      await addDoc(collection(db, 'teams'), {
        name: `${user.displayName || user.email?.split('@')[0] || 'My'}'s Team`,
        adminUid: user.uid,
        memberUids: [user.uid],
        members: [{
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email || 'You',
          role: 'Admin',
        }],
        createdAt: serverTimestamp(),
      })
      await loadTeamData()
    } catch (err) {
      setError('Could not create team. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // Real stats from Firestore data
  const calmCount = members.filter(m =>
    ['calm', 'happy', 'neutral', 'excited'].includes(m.latestMood?.toLowerCase())
  ).length
  const stressedCount = members.filter(m =>
    ['stressed', 'angry', 'anxious'].includes(m.latestMood?.toLowerCase())
  ).length
  const totalCalls = members.reduce((s, m) => s + m.callsThisWeek, 0)
  const avgCalmPct = members.length > 0 ? Math.round((calmCount / members.length) * 100) : 0

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── No team yet ──
  if (!team) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors">
        <div className="px-5 pt-12 pb-6 md:pt-8 md:px-8"
          style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
          <h1 className="text-xl font-bold text-white">My Team</h1>
          <p className="text-xs text-white/50 mt-0.5">Team wellness & collaboration</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="text-6xl">👥</span>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">No team yet</h2>
            <p className="text-sm text-gray-400 mt-2 max-w-xs leading-relaxed">
              Create a team and invite your colleagues to track wellness together
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={createTeam} disabled={creating}
            className="px-8 py-3.5 rounded-2xl font-bold text-white text-sm transition-all"
            style={{ background: creating ? '#9CA3AF' : 'linear-gradient(135deg,#6C63FF,#8B85FF)', boxShadow: creating ? 'none' : '0 6px 24px rgba(108,99,255,0.35)' }}>
            {creating ? 'Creating…' : 'Create Team'}
          </button>
        </div>
      </div>
    )
  }

  // ── Has team ──
  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-6 md:hidden"
        style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{team.name}</h1>
            <p className="text-xs text-white/50 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''} · Admin</p>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'rgba(108,99,255,0.3)', border: '1px solid rgba(108,99,255,0.5)' }}>
            + Invite
          </button>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{team.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#6C63FF' }}>
          + Invite
        </button>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 md:max-w-3xl md:mx-auto md:w-full flex flex-col gap-4">

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-500"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Members', value: members.length, color: '#6C63FF' },
            { label: 'Avg calm', value: `${avgCalmPct}%`, color: '#22C55E' },
            { label: 'Stressed', value: stressedCount, color: '#EF4444' },
            { label: 'Calls', value: totalCalls, color: '#4F8AFF' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-3 shadow-sm text-center">
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Member cards */}
        {members.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-8 shadow-sm flex flex-col items-center gap-3 text-center">
            <span className="text-3xl">🙋</span>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">You're the only member</p>
            <p className="text-xs text-gray-400">Share the invite link to add colleagues</p>
            <button onClick={() => setShowInvite(true)}
              className="mt-1 px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#6C63FF' }}>
              + Invite someone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {members.map((m, i) => (
              <div key={m.uid || i} className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                      {m.isCurrentUser ? `${m.name} (you)` : m.name}
                    </p>
                    <p className="text-xs text-gray-400">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {m.latestMood ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${moodColor(m.latestMood)}15`, color: moodColor(m.latestMood) }}>
                      {m.latestMoodEmoji} {m.latestMood}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No data yet</span>
                  )}
                  <span className="text-xs text-gray-400">{m.callsThisWeek} this wk</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate('/team-report', { state: { teamId: team.id, members } })}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)', boxShadow: '0 6px 24px rgba(108,99,255,0.35)' }}>
          View team report →
        </button>
      </div>

      {showInvite && <InviteModal teamId={team.id} onClose={() => setShowInvite(false)} darkMode={darkMode} />}
    </div>
  )
}
