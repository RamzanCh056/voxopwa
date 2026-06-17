import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { redirectToCheckout } from '../services/billingService'
import { useUpgradeModal } from '../context/UpgradeModalContext'

const createPortalSessionFn = httpsCallable(functions, 'createPortalSession')

const METERED_PLANS = [
  {
    id: 'monthly',
    label: '30 Days',
    price: '$9.99',
    minutes: 300,
    period: '/month',
  },
  {
    id: 'quarterly',
    label: '90 Days',
    price: '$24.99',
    minutes: 1000,
    period: '/quarter',
    highlight: true,
  },
  {
    id: 'yearly',
    label: '1 Year',
    price: '$79.99',
    minutes: 4500,
    period: '/year',
  },
]

const PRO_LABELS = {
  pro_monthly:  'Pro Monthly',
  pro_yearly:   'Pro Yearly',
  pro_lifetime: 'Pro Lifetime',
}

const STATUS_COLORS = {
  active:   { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300' },
  past_due: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  canceled: { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300' },
  lifetime: { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-300' },
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg
      flex items-center gap-3 text-sm font-medium max-w-xs w-full
      ${type === 'success' ? 'bg-green-500 text-white' : 'bg-gray-800 text-white dark:bg-gray-700'}`}>
      {type === 'success'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" className="w-4 h-4 flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
      }
      {message}
    </div>
  )
}

export default function BillingPage() {
  const { user } = useAuth()
  const { openUpgradeModal } = useUpgradeModal()
  const [searchParams, setSearchParams] = useSearchParams()
  const [userData, setUserData] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      setUserData(snap.exists() ? snap.data() : {})
    })
    return unsub
  }, [user])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setToast({ message: 'Payment successful! Your plan is now active.', type: 'success' })
      setSearchParams({})
    } else if (searchParams.get('canceled') === 'true') {
      setToast({ message: 'Payment canceled — no charge was made.', type: 'info' })
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const handleCheckout = async (planId) => {
    try {
      setLoadingPlan(planId)
      await redirectToCheckout(planId)
    } catch (err) {
      setToast({ message: err.message || 'Failed to start checkout. Please try again.', type: 'info' })
      setLoadingPlan(null)
    }
  }

  const handlePortal = async () => {
    try {
      setPortalLoading(true)
      const result = await createPortalSessionFn()
      window.location.href = result.data.url
    } catch (err) {
      setToast({ message: err.message || 'Could not open billing portal.', type: 'info' })
      setPortalLoading(false)
    }
  }

  const isUnlimited  = userData?.unlimited === true && (userData?.subscriptionStatus === 'active' || userData?.planType === 'lifetime')
  const isLifetime   = userData?.planType === 'lifetime'
  const planLabel    = PRO_LABELS[userData?.planId] || null
  const status       = isLifetime ? 'lifetime' : (userData?.subscriptionStatus || null)
  const statusColors = STATUS_COLORS[status] || {}

  const minutesUsed      = userData?.minutesUsed || 0
  const minutesIncluded  = userData?.minutesIncluded || 0
  const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed)
  const pct              = minutesIncluded > 0 ? Math.min(100, Math.round((minutesUsed / minutesIncluded) * 100)) : 0

  const periodEnd  = userData?.currentPeriodEnd
  const renewDate  = periodEnd && !isLifetime
    ? new Date(periodEnd.toMillis ? periodEnd.toMillis() : periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300 px-4 py-8 pb-28 md:pb-8">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your subscription and analysis access</p>
        </div>

        {/* ─── PRO USERS ─────────────────────────────────────────── */}
        {isUnlimited && userData !== null && (
          <>
            {/* Pro status card */}
            <div className="rounded-2xl p-5 shadow-sm mb-6 text-white"
              style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⭐</span>
                    <p className="font-bold text-lg">{planLabel || 'Voxofied Pro'}</p>
                  </div>
                  <p className="text-white/80 text-sm">Unlimited analyses · All features unlocked</p>
                  {renewDate && (
                    <p className="text-white/70 text-xs mt-1">Renews {renewDate}</p>
                  )}
                  {isLifetime && (
                    <p className="text-white/70 text-xs mt-1">Lifetime access — never expires</p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${statusColors.bg} ${statusColors.text}`}>
                  {isLifetime ? 'Lifetime' : (status ? status.replace('_', ' ') : 'Active')}
                </span>
              </div>
            </div>

            {/* Manage subscription — only for recurring Pro plans */}
            {!isLifetime && (
              <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Manage Subscription</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cancel, update payment method, or view invoices</p>
                </div>
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-[#2E2B5B] text-gray-700 dark:text-gray-300 transition-opacity disabled:opacity-60">
                  {portalLoading ? 'Loading…' : 'Manage'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── METERED / FREE USERS ──────────────────────────────── */}
        {!isUnlimited && userData !== null && (
          <>
            {/* Usage card */}
            <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Analysis Minutes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {minutesRemaining.toLocaleString()}
                    <span className="text-sm font-normal text-gray-400 ml-1">/ {minutesIncluded.toLocaleString()} remaining</span>
                  </p>
                </div>
                {status && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColors.bg} ${statusColors.text}`}>
                    {status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-[#2E2B5B] overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: pct > 80 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#6C63FF,#8B85FF)',
                  }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                <span>{minutesUsed.toLocaleString()} used</span>
                {renewDate && <span>Renews {renewDate}</span>}
              </div>
            </div>

            {/* Upgrade to Pro CTA */}
            <button
              onClick={openUpgradeModal}
              className="w-full rounded-2xl p-4 mb-6 flex items-center justify-between gap-3 shadow-sm transition-all active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
              <div className="text-left">
                <p className="text-white font-bold text-base">Upgrade to Pro — Unlimited</p>
                <p className="text-white/80 text-sm mt-0.5">No minute limits. All features. From $10.99/mo</p>
              </div>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </button>

            {/* Top-up */}
            <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Need more minutes?</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Add 300 minutes as a one-time top-up</p>
              </div>
              <button
                onClick={() => handleCheckout('topup_300')}
                disabled={!!loadingPlan}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                {loadingPlan === 'topup_300' ? 'Loading…' : '+300 min'}
              </button>
            </div>

            {/* Metered plan cards */}
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Minute Bundle Plans</h2>
            <div className="flex flex-col gap-3">
              {METERED_PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`bg-white dark:bg-[#1A1740] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4
                    ${plan.highlight ? 'ring-2 ring-purple-400' : ''}`}>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{plan.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{plan.minutes.toLocaleString()} minutes</p>
                    <p className="text-lg font-extrabold mt-1" style={{ color: '#6C63FF' }}>
                      {plan.price}<span className="text-xs font-normal text-gray-400 ml-1">{plan.period}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={!!loadingPlan || (status === 'active' && userData?.planId === plan.id)}
                    className="flex-shrink-0 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                    {loadingPlan === plan.id ? 'Loading…'
                      : (status === 'active' && userData?.planId === plan.id) ? 'Current'
                      : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-6">
          Payments processed securely by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
