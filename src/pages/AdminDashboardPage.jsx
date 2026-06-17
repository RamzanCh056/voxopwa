import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { getIdTokenResult } from 'firebase/auth'
import { functions } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

const getAdminStatsFn = httpsCallable(functions, 'getAdminStats')
const getAdminUsersFn = httpsCallable(functions, 'getAdminUsers')

const PLAN_LABEL = { monthly: '30d', quarterly: '90d', yearly: '1yr' }

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold mt-1 leading-none" style={{ color: color || '#6C63FF' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function StatusChip({ status }) {
  const map = {
    active:   { bg: '#DCFCE7', text: '#15803D' },
    past_due: { bg: '#FEF9C3', text: '#A16207' },
    canceled: { bg: '#FEE2E2', text: '#B91C1C' },
  }
  const s = map[status] || { bg: '#F3F4F6', text: '#6B7280' }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ background: s.bg, color: s.text }}>
      {status || 'none'}
    </span>
  )
}

export default function AdminDashboardPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [isAdmin,  setIsAdmin]  = useState(null)
  const [stats,    setStats]    = useState(null)
  const [users,    setUsers]    = useState([])
  const [cursor,   setCursor]   = useState(null)   // { lastMinutesUsed, lastUid }
  const [hasMore,  setHasMore]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')

  // Verify admin claim
  useEffect(() => {
    if (!user) return
    getIdTokenResult(user).then(r => setIsAdmin(!!r.claims.admin))
  }, [user])

  // Load summary stats
  useEffect(() => {
    if (!isAdmin) return
    getAdminStatsFn()
      .then(r => setStats(r.data))
      .catch(err => setError(err.message || 'Failed to load stats'))
  }, [isAdmin])

  // Load first page of users
  const loadFirstPage = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError(null)
    try {
      const r = await getAdminUsersFn({ pageSize: 50 })
      setUsers(r.data.users)
      setHasMore(r.data.hasMore)
      const last = r.data.users[r.data.users.length - 1]
      setCursor(last ? { lastMinutesUsed: last.minutesUsed, lastUid: last.id } : null)
    } catch (err) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { loadFirstPage() }, [loadFirstPage])

  const loadMore = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const r = await getAdminUsersFn({ pageSize: 50, ...cursor })
      const newUsers = r.data.users
      setUsers(prev => [...prev, ...newUsers])
      setHasMore(r.data.hasMore)
      const last = newUsers[newUsers.length - 1]
      setCursor(last ? { lastMinutesUsed: last.minutesUsed, lastUid: last.id } : null)
    } catch (err) {
      setError(err.message || 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  // Client-side search on loaded data
  const q = search.trim().toLowerCase()
  const filtered = q
    ? users.filter(u =>
        u.id.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.planId || '').toLowerCase().includes(q)
      )
    : users

  // ── Access denied ───────────────────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F7] dark:bg-[#0F0C29] px-5">
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-8 text-center max-w-sm shadow-sm">
          <p className="font-bold text-gray-800 dark:text-white text-lg mb-2">Access Denied</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Admin privileges required.</p>
          <button onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors px-4 py-8 pb-28 md:pb-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Usage overview across all users</p>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Summary stats */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={stats.totalUsers.toLocaleString()}
              color="#6C63FF"
            />
            <StatCard
              label="Active Subs"
              value={stats.totalActive.toLocaleString()}
              sub={`${stats.totalUsers > 0 ? Math.round(stats.totalActive / stats.totalUsers * 100) : 0}% of users`}
              color="#16A34A"
            />
            <StatCard
              label="Minutes Used"
              value={stats.totalMinutesUsed.toLocaleString()}
              sub="all time"
              color="#0EA5E9"
            />
            <StatCard
              label="Est. Revenue"
              value={`$${stats.estimatedMonthlyRevenue.toFixed(2)}`}
              sub="this cycle"
              color="#F59E0B"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm h-24 animate-pulse" />
            ))}
          </div>
        )}

        {/* Plan distribution */}
        {stats?.planCounts && Object.keys(stats.planCounts).length > 0 && (
          <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
              Active Plan Distribution
            </p>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.planCounts).map(([planId, count]) => (
                <div key={planId}
                  className="flex flex-col items-center bg-gray-50 dark:bg-[#2E2B5B] rounded-xl px-5 py-3 min-w-[72px]">
                  <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{count}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {PLAN_LABEL[planId] || planId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User table */}
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl shadow-sm overflow-hidden">

          {/* Search + header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2E2B5B] flex items-center gap-3">
            <div className="flex-1 relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search by ID, email, or plan…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#2E2B5B]
                  bg-gray-50 dark:bg-[#12103A] text-gray-800 dark:text-gray-200
                  focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              {filtered.length} / {users.length} loaded
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2E2B5B]">
                    {['User ID / Email', 'Plan', 'Status', 'Used', 'Included', '% Used', 'Period End'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const pct = u.minutesIncluded > 0
                      ? Math.min(100, Math.round((u.minutesUsed / u.minutesIncluded) * 100))
                      : 0
                    const end = u.currentPeriodEnd
                      ? new Date(u.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                      : '—'

                    return (
                      <tr key={u.id}
                        className={`border-b border-gray-50 dark:border-[#2E2B5B]/60 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors
                          ${i % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-[#12103A]/40'}`}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-gray-600 dark:text-gray-300 truncate max-w-[140px]">{u.id}</p>
                          {u.email && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[140px]">{u.email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {PLAN_LABEL[u.planId] || u.planId || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={u.subscriptionStatus} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {u.minutesUsed.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {u.minutesIncluded.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-[#2E2B5B] rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#6C63FF' }} />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {end}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && !loading && (
                <p className="text-center text-sm text-gray-400 py-10">
                  {search ? 'No users match your search.' : 'No users yet.'}
                </p>
              )}
            </div>
          )}

          {/* Load more */}
          {hasMore && !search && (
            <div className="flex justify-center px-5 py-4 border-t border-gray-100 dark:border-[#2E2B5B]">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                {loadingMore ? 'Loading…' : 'Load 50 more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
