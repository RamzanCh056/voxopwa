import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { getIdTokenResult } from 'firebase/auth'
import { functions } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

const getAdminUsageStatsFn = httpsCallable(functions, 'getAdminUsageStats')

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

const PLAN_LABELS = { monthly: '30d', quarterly: '90d', yearly: '1yr', none: 'None' }

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    if (!user) return
    getIdTokenResult(user).then(result => {
      setIsAdmin(!!result.claims.admin)
    })
  }, [user])

  useEffect(() => {
    if (!isAdmin) return
    getAdminUsageStatsFn()
      .then(r => setStats(r.data))
      .catch(err => setError(err.message || 'Failed to load stats'))
  }, [isAdmin])

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"/>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F7] dark:bg-[#0F0C29] gap-4 px-5">
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-8 text-center max-w-sm shadow-sm">
          <p className="font-bold text-gray-800 dark:text-white text-lg mb-2">Access Denied</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            This page requires admin privileges.
          </p>
          <button onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F7] dark:bg-[#0F0C29] px-5">
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-6 text-center max-w-sm shadow-sm">
          <p className="text-red-500 font-semibold mb-2">Error</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F7] dark:bg-[#0F0C29]">
        <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300 px-4 py-8 pb-28 md:pb-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Usage overview across all users</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
          <StatCard label="Active Subs" value={stats.totalActive.toLocaleString()} />
          <StatCard label="Minutes Used" value={stats.totalMinutesUsed.toLocaleString()} sub="all time" />
          <StatCard
            label="Est. Revenue"
            value={`$${stats.estimatedMonthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="this cycle"
          />
        </div>

        {/* Plan breakdown */}
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Active Plan Distribution</h2>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.planCounts).map(([planId, count]) => (
              <div key={planId} className="flex flex-col items-center bg-gray-50 dark:bg-[#2E2B5B] rounded-xl px-5 py-3 min-w-[70px]">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{count}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{PLAN_LABELS[planId] || planId}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top users */}
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2E2B5B]">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Users by Minutes Used</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#2E2B5B]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase">User ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase">Used / Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map((u, i) => {
                  const pct = u.minutesIncluded > 0
                    ? Math.min(100, Math.round((u.minutesUsed / u.minutesIncluded) * 100))
                    : 0
                  return (
                    <tr key={u.id}
                      className={`border-b border-gray-50 dark:border-[#2E2B5B] ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-[#1E1B4B]/40'}`}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 max-w-[160px] truncate">
                        {u.id}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {PLAN_LABELS[u.planId] || u.planId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                          ${u.subscriptionStatus === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : u.subscriptionStatus === 'past_due'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}>
                          {u.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                          {u.minutesUsed} / {u.minutesIncluded}
                        </span>
                        <div className="w-20 h-1.5 bg-gray-100 dark:bg-[#2E2B5B] rounded-full ml-auto mt-1">
                          <div className="h-1.5 rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: pct > 80 ? '#ef4444' : '#6C63FF',
                            }}/>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {stats.topUsers.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No users yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
