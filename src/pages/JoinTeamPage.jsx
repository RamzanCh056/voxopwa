import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  doc, getDoc, updateDoc, arrayUnion,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export default function JoinTeamPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const teamId = searchParams.get('team')

  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate(`/login?redirect=/join?team=${teamId}`, { replace: true })
      return
    }
    if (!teamId) {
      setError('Invalid invite link — no team ID found.')
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'teams', teamId))
        if (!snap.exists()) {
          setError('This team no longer exists.')
        } else {
          setTeam({ id: snap.id, ...snap.data() })
        }
      } catch {
        setError('Could not load team. Please try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [authLoading, user, teamId, navigate])

  const alreadyMember = team?.memberUids?.includes(user?.uid)

  async function joinTeam() {
    if (!user || !team || joining) return
    setJoining(true)
    setError(null)
    try {
      const teamRef = doc(db, 'teams', team.id)
      await updateDoc(teamRef, {
        memberUids: arrayUnion(user.uid),
        members: arrayUnion({
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email || 'Member',
          role: 'Member',
        }),
      })
      setJoined(true)
      setTimeout(() => navigate('/teams', { replace: true }), 1800)
    } catch (err) {
      console.error('joinTeam:', err)
      setError('Failed to join team. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F0C29]">
        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0C29] items-center justify-center px-5">
      <div className="w-full max-w-sm bg-[#1E1B4B] rounded-3xl p-7 shadow-2xl"
        style={{ border: '1px solid rgba(108,99,255,0.2)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-base text-white">Voxofied</span>
        </div>

        {joined ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-xl font-bold text-white">You joined!</p>
            <p className="text-sm text-gray-400">Redirecting to your team…</p>
          </div>
        ) : error && !team ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-4xl">🔗</span>
            <p className="font-bold text-white">Invalid invite link</p>
            <p className="text-sm text-gray-400">{error}</p>
            <button onClick={() => navigate('/')}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#6C63FF' }}>
              Go home
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white mb-1">You're invited!</h1>
            <p className="text-sm text-gray-400 mb-6">Join this team on Voxofied</p>

            {/* Team card */}
            {team && (
              <div className="rounded-2xl px-4 py-4 mb-5 flex items-center gap-3"
                style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.25)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-lg"
                  style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                  {(team.name?.[0] || 'T').toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{team.name}</p>
                  <p className="text-xs text-gray-400">
                    {(team.memberUids?.length || 1)} member{(team.memberUids?.length || 1) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 mb-4 px-1">{error}</p>
            )}

            {alreadyMember ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl px-4 py-3 text-center text-sm text-green-400 font-semibold"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  You're already a member of this team
                </div>
                <button onClick={() => navigate('/teams')}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#6C63FF' }}>
                  Go to team →
                </button>
              </div>
            ) : (
              <button onClick={joinTeam} disabled={joining}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: joining ? '#4B4F6B' : 'linear-gradient(135deg,#6C63FF,#8B85FF)',
                  boxShadow: joining ? 'none' : '0 6px 24px rgba(108,99,255,0.35)',
                }}>
                {joining ? 'Joining…' : 'Join Team'}
              </button>
            )}

            <p className="text-center text-xs text-gray-500 mt-4">
              Signed in as <span className="text-gray-300">{user?.email}</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
