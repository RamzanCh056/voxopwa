import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { redirectToCheckout, getPlanPrices } from '../services/billingService'

const PLAN_META = {
  monthly:   { label: '30 Days',  minutes: 300,  period: 'month',   highlight: false },
  quarterly: { label: '90 Days',  minutes: 1000, period: 'quarter', highlight: true  },
  yearly:    { label: '1 Year',   minutes: 4500, period: 'year',    highlight: false },
}

const STATUS_BADGE = {
  active:   { bg: '#DCFCE7', text: '#15803D', label: 'Active'   },
  past_due: { bg: '#FEF9C3', text: '#A16207', label: 'Past Due' },
  canceled: { bg: '#FEE2E2', text: '#B91C1C', label: 'Canceled' },
}

function fmt(amount, currency) {
  if (!amount && amount !== 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl
      flex items-center gap-3 text-sm font-semibold max-w-sm w-[calc(100%-2rem)]
      ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'}`}>
      {type === 'success'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4 flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
      {message}
    </div>
  )
}

function PlanCard({ planId, meta, price, status, currentPlanId, loading, onSelect }) {
  const isCurrent = status === 'active' && currentPlanId === planId
  const priceLabel = price
    ? `${fmt(price.amount, price.currency)}/${price.interval}`
    : null

  return (
    <div className={`relative bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm transition-all
      ${meta.highlight ? 'ring-2 ring-[#6C63FF]' : 'border border-gray-100 dark:border-[#2E2B5B]'}`}>

      {meta.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-3 py-1 rounded-full"
          style={{ background: 'linear-gradient(90deg,#6C63FF,#8B85FF)' }}>
          Most Popular
        </span>
      )}

      <div className="mb-3">
        <p className="font-bold text-gray-900 dark:text-white text-base">{meta.label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {meta.minutes.toLocaleString()} analysis minutes
        </p>
      </div>

      <p className="text-2xl font-extrabold mb-4" style={{ color: '#6C63FF' }}>
        {priceLabel ?? <span className="text-gray-300 text-base font-normal">Price loading…</span>}
      </p>

      <button
        onClick={() => onSelect(planId)}
        disabled={!!loading || isCurrent || !price}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ background: isCurrent ? '#9CA3AF' : 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
        {loading === planId ? 'Redirecting…' : isCurrent ? 'Current Plan' : 'Subscribe'}
      </button>
    </div>
  )
}

export default function BillingPage() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [userData,    setUserData]    = useState(null)
  const [prices,      setPrices]      = useState({})
  const [pricesError, setPricesError] = useState(false)
  const [loading,     setLoading]     = useState(null)
  const [toast,       setToast]       = useState(null)

  // Live Firestore listener for usage
  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      setUserData(snap.exists() ? snap.data() : {})
    })
    return unsub
  }, [user])

  // Fetch real Stripe prices once
  useEffect(() => {
    getPlanPrices()
      .then(p => setPrices(p || {}))
      .catch(() => setPricesError(true))
  }, [])

  // Handle Stripe redirect params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setToast({ message: 'Payment successful! Your plan is now active.', type: 'success' })
      setSearchParams({})
    } else if (searchParams.get('canceled') === 'true') {
      setToast({ message: 'Payment canceled — you were not charged.', type: 'info' })
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const handleSelect = async (planId) => {
    setLoading(planId)
    try {
      await redirectToCheckout(planId)
    } catch (err) {
      setToast({ message: err.message || 'Could not start checkout. Try again.', type: 'info' })
      setLoading(null)
    }
  }

  // Computed values
  const minutesUsed      = userData?.minutesUsed      || 0
  const minutesIncluded  = userData?.minutesIncluded  || 0
  const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed)
  const pct              = minutesIncluded > 0 ? Math.min(100, Math.round((minutesUsed / minutesIncluded) * 100)) : 0
  const status           = userData?.subscriptionStatus
  const badge            = STATUS_BADGE[status]

  const periodEnd = userData?.currentPeriodEnd
  const renewDate = periodEnd
    ? new Date(periodEnd.toMillis ? periodEnd.toMillis() : periodEnd)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const hasActiveSub = status === 'active'
  const topupPrice   = prices['topup_300']

  return (
    <div className="min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors px-4 py-8 pb-28 md:pb-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Usage</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your subscription and analysis minutes
          </p>
        </div>

        {/* ── Usage card ── */}
        {userData !== null && (
          <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  This Period
                </p>
                {minutesIncluded > 0 ? (
                  <>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white leading-none">
                      {minutesRemaining.toLocaleString()}
                      <span className="text-sm font-normal text-gray-400 ml-2">min left</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {minutesUsed.toLocaleString()} of {minutesIncluded.toLocaleString()} used
                    </p>
                  </>
                ) : (
                  <p className="text-base font-semibold text-gray-400 dark:text-gray-500">No active plan</p>
                )}
              </div>
              {badge && (
                <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
                  style={{ background: badge.bg, color: badge.text }}>
                  {badge.label}
                </span>
              )}
            </div>

            {minutesIncluded > 0 && (
              <>
                <div className="w-full h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2E2B5B]">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width:      `${pct}%`,
                      background: pct > 80
                        ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                        : 'linear-gradient(90deg,#6C63FF,#8B85FF)',
                    }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2">
                  <span>{pct}% used</span>
                  {renewDate && <span>Renews {renewDate}</span>}
                </div>
              </>
            )}

            {!hasActiveSub && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 border-t border-gray-100 dark:border-[#2E2B5B] pt-3">
                Choose a plan below to get started with analysis minutes.
              </p>
            )}
          </div>
        )}

        {/* ── Plan cards ── */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Subscription Plans
          </h2>

          {pricesError && (
            <div className="mb-3 px-4 py-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
              Could not load live prices. Check that Stripe price IDs are configured in Firebase.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Object.entries(PLAN_META).map(([planId, meta]) => (
              <PlanCard
                key={planId}
                planId={planId}
                meta={meta}
                price={prices[planId] || null}
                status={status}
                currentPlanId={userData?.planId}
                loading={loading}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        {/* ── Top-up card ── */}
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4 border border-dashed border-purple-200 dark:border-purple-900/40">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Top-up Minutes</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Add 300 minutes without changing your plan
            </p>
            {topupPrice && (
              <p className="text-lg font-extrabold mt-1" style={{ color: '#6C63FF' }}>
                {fmt(topupPrice.amount, topupPrice.currency)} once
              </p>
            )}
          </div>
          <button
            onClick={() => handleSelect('topup_300')}
            disabled={!!loading || !topupPrice}
            className="flex-shrink-0 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
            {loading === 'topup_300' ? 'Redirecting…' : '+300 min'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 pb-2">
          Payments are processed securely by Stripe. Cancel anytime from your Stripe billing portal.
        </p>
      </div>
    </div>
  )
}
