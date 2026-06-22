import { useEffect, useState } from 'react'
import { getPlanPrices, redirectToCheckout } from '../services/billingService'

const PLAN_META = {
  monthly: {
    label: '30 Days',
    minutesIncluded: 300,
  },
  quarterly: {
    label: '90 Days',
    minutesIncluded: 1000,
    badge: 'Popular',
    badgeColor: { bg: '#EDE9FE', text: '#6D28D9', ring: '#8B5CF6' },
  },
  yearly: {
    label: '1 Year',
    minutesIncluded: 4500,
    badge: 'Best Value',
    badgeColor: { bg: '#FEF3C7', text: '#92400E', ring: '#F59E0B' },
  },
}

const PLAN_ORDER = ['monthly', 'quarterly', 'yearly']

function periodLabel(interval, intervalCount) {
  if (!interval) return ''
  if (interval === 'month' && intervalCount === 3) return '/3 months'
  if (interval === 'month') return '/month'
  if (interval === 'year') return '/year'
  return `/${intervalCount > 1 ? intervalCount : ''}${interval}`
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0">
      <circle cx="8" cy="8" r="8" fill="#EDE9FE"/>
      <path d="M5 8l2 2 4-4" stroke="#6C63FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlanCard({ planId, meta, priceInfo, onChoose, loading }) {
  const hasBadge = !!meta.badge
  const hasPrice = !!priceInfo

  return (
    <div
      className="relative bg-white dark:bg-[#1A1740] rounded-3xl p-5 flex flex-col gap-4 shadow-sm transition-transform active:scale-[0.98]"
      style={hasBadge ? {
        border: `2px solid ${meta.badgeColor.ring}`,
        boxShadow: `0 0 0 4px ${meta.badgeColor.ring}22`,
      } : {
        border: '1.5px solid rgba(0,0,0,0.06)',
      }}>

      {hasBadge && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: meta.badgeColor.bg, color: meta.badgeColor.text }}>
          {meta.badge}
        </span>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
          {meta.label}
        </p>
        {hasPrice ? (
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-white leading-none">
              ${priceInfo.amount}
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500 mb-1">
              {periodLabel(priceInfo.interval, priceInfo.intervalCount)}
            </span>
          </div>
        ) : (
          <div className="h-9 flex items-center">
            <span className="text-sm text-gray-400 dark:text-gray-500">Price unavailable</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <strong>{meta.minutesIncluded.toLocaleString()}</strong> analysis minutes included
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span className="text-sm text-gray-700 dark:text-gray-300">Mood, stress &amp; intent insights</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span className="text-sm text-gray-700 dark:text-gray-300">Full transcript + AI report</span>
        </div>
      </div>

      <button
        onClick={() => onChoose(planId)}
        disabled={!hasPrice || loading}
        className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: hasBadge
            ? 'linear-gradient(135deg,#6C63FF 0%,#8B85FF 60%,#4F8AFF 100%)'
            : 'linear-gradient(135deg,#6C63FF,#8B85FF)',
          boxShadow: hasBadge ? '0 6px 24px rgba(108,99,255,0.45)' : '0 4px 16px rgba(108,99,255,0.25)',
        }}>
        {loading ? 'Redirecting…' : 'Choose Plan'}
      </button>
    </div>
  )
}

export default function PlanSelectionScreen({ onDismiss }) {
  const [prices,  setPrices]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [pendingPlan, setPendingPlan] = useState(null)

  useEffect(() => {
    getPlanPrices().then(setPrices)
  }, [])

  async function handleChoose(planId) {
    setError('')
    setPendingPlan(planId)
    setLoading(true)
    try {
      await redirectToCheckout(planId)
      // redirectToCheckout navigates away on success — no further action needed
    } catch (err) {
      console.error('[PlanSelectionScreen] checkout failed', err)
      setError(err?.message || 'Could not start checkout. Please try again.')
      setLoading(false)
      setPendingPlan(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F0F2F7] dark:bg-[#0F0C29] overflow-y-auto">
      <div className="min-h-full flex flex-col px-4 pt-12 pb-12 md:px-8 md:pt-16 max-w-3xl mx-auto">

        {/* Header row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full px-3 py-1 mb-3">
              <span className="text-purple-500 text-xs">✨</span>
              <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">Voxofied AI</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Choose Your Plan
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Pick the plan that fits how much you record
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pt-1 flex-shrink-0 ml-4">
            Skip for now
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Plan cards — stacked on mobile, row on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {PLAN_ORDER.map(planId => (
            <PlanCard
              key={planId}
              planId={planId}
              meta={PLAN_META[planId]}
              priceInfo={prices?.[planId] || null}
              onChoose={handleChoose}
              loading={loading && pendingPlan === planId}
            />
          ))}
        </div>

        {/* Bottom skip link */}
        <div className="flex justify-center mt-8">
          <button
            onClick={onDismiss}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2">
            Skip for now — I'll decide later
          </button>
        </div>

      </div>
    </div>
  )
}
