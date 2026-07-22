import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../firebase/config'

const ROLES = ['Admin', 'Member', 'Viewer']
const MOOD_COLORS = { calm: '#22C55E', stressed: '#EF4444', happy: '#F59E0B', neutral: '#6B7280', anxious: '#A855F7' }

function InviteModal({ teamId, onClose }) {
  const { darkMode } = useTheme()
  const [copied, setCopied] = useState(false)
  const link = `https://voxofied.app/join?team=${teamId}`

  async function copy() {
    await navigator.clipboard.writeText(link)
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
        <p className="text-sm text-gray-400 mb-5">Share this link to invite someone to your team</p>
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl mb-4"
          style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FF', border: '1px solid rgba(108,99,255,0.2)' }}>
          <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate font-mono">{link}</span>
        </div>
        <button onClick={copy}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: copied ? '#22C55E' : '#6C63FF', color: '#fff' }}>
          {copied ? '✓ Copied!' : 'Copy invite link'}
        </button>
      </div>
      <style>{`@keyframes sheet-up { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  )
}

const DEMO_MEMBERS = [
  { name: 'You', role: 'Admin', mood: 'calm', calls: 12, initials: 'YO' },
  { name: 'Ali Hassan', role: 'Member', mood: 'stressed', calls: 7, initials: 'AH' },
  { name: 'Sara Khan', role: 'Member', mood: 'happy', calls: 15, initials: 'SK' },
  { name: 'John Smith', role: 'Viewer', mood: 'neutral', calls: 3, initials: 'JS' },
]

export default function TeamsPage() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const teamId = `team_${user.uid}`
    getDoc(doc(db, 'teams', teamId)).then(snap => {
      if (snap.exists()) {
        setTeam({ id: teamId, ...snap.data() })
      } else {
        const newTeam = {
          name: `${user.displayName?.split(' ')[0] || 'My'}'s Team`,
          adminUid: user.uid,
          members: [{ uid: user.uid, email: user.email, name: user.displayName || 'You', role: 'Admin' }],
          createdAt: new Date().toISOString(),
        }
        setDoc(doc(db, 'teams', teamId), newTeam).then(() => setTeam({ id: teamId, ...newTeam }))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const members = DEMO_MEMBERS
  const avgCalm = Math.round(members.filter(m => m.mood === 'calm').length / members.length * 100)
  const stressed = members.filter(m => m.mood === 'stressed').length
  const totalCalls = members.reduce((s, m) => s + m.calls, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-6 md:hidden"
        style={{ background: '#0F1729', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{team?.name || 'My Team'}</h1>
            <p className="text-xs text-white/50 mt-0.5">{members.length} members · Admin</p>
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
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{team?.name || 'My Team'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{members.length} members · Admin</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#6C63FF' }}>
          + Invite
        </button>
      </div>

      <div className="flex-1 px-4 pt-5 pb-8 md:px-8 md:max-w-3xl md:mx-auto md:w-full flex flex-col gap-4">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Members', value: members.length, color: '#6C63FF' },
            { label: 'Avg calm', value: `${avgCalm}%`, color: '#22C55E' },
            { label: 'Stressed', value: stressed, color: '#EF4444' },
            { label: 'Calls', value: totalCalls, color: '#4F8AFF' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-3 shadow-sm text-center">
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Member cards */}
        <div className="grid grid-cols-2 gap-3">
          {members.map((m, i) => (
            <div key={i} className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                  {m.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                  style={{ background: `${MOOD_COLORS[m.mood] || '#6B7280'}15`, color: MOOD_COLORS[m.mood] || '#6B7280' }}>
                  {m.mood}
                </span>
                <span className="text-xs text-gray-400">{m.calls} calls</span>
              </div>
            </div>
          ))}
        </div>

        {/* View team report */}
        <button onClick={() => navigate('/team-report')}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)', boxShadow: '0 6px 24px rgba(108,99,255,0.35)' }}>
          View team report →
        </button>
      </div>

      {showInvite && team && <InviteModal teamId={team.id} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
