import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { redirectToCheckout } from '../services/billingService'

const PLANS = [
  {
    id: 'monthly',
    label: '30 Days',
    price: '$9.99',
    minutes: 300,
    period: '/month',
    features: ['300 analysis minutes', 'All AI features', 'Export reports', 'Priority support'],
    highlight: false,
  },
  {
    id: 'quarterly',
    label: '90 Days',
    price: '$24.99',
    minutes: 1000,
    period: '/quarter',
    features: ['1,000 analysis minutes', 'All AI features', 'Export reports', 'Priority support', 'Rollover unused minutes'],
    highlight: true,
  },
  {
    id: 'yearly',
    label: '1 Year',
    price: '$79.99',
    minutes: 4500,
    period: '/year',
    features: ['4,500 analysis minutes', 'All AI features', 'Export reports', 'Priority support', 'Rollover unused minutes', 'Best value'],
    highlight: false,
  },
]

const STATUS_COLORS = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  past_due: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  canceled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg
      flex items-center gap-3 text-sm font-medium max-w-xs w-full
      ${type === 'success'
        ? 'bg-green-500 text-white'
        : 'bg-gray-800 text-white dark:bg-gray-700'
      }`}>
      {type === 'success'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
      }
      {message}
    </div>
  )
}

export default function BillingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [userData, setUserData] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [toast, setToast] = useState(null)

  // Subscribe to Firestore user doc for live updates
  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      setUserData(snap.exists() ? snap.data() : {})
    })
    return unsub
  }, [user])

  // Handle Stripe redirect params
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

  const minutesUsed = userData?.minutesUsed || 0
  const minutesIncluded = userData?.minutesIncluded || 0
  const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed)
  const pct = minutesIncluded > 0 ? Math.min(100, Math.round((minutesUsed / minutesIncluded) * 100)) : 0
  const status = userData?.subscriptionStatus
  const statusColors = STATUS_COLORS[status] || {}

  const periodEnd = userData?.currentPeriodEnd
  const renewDate = periodEnd
    ? new Date(periodEnd.toMillis ? periodEnd.toMillis() : periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300 px-4 py-8 pb-28 md:pb-8">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your subscription and analysis minutes</p>
        </div>

        {/* Usage card */}
        {userData !== null && (
          <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm mb-6">
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
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct > 80
                    ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                    : 'linear-gradient(90deg,#6C63FF,#8B85FF)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              <span>{minutesUsed.toLocaleString()} used</span>
              {renewDate && <span>Renews {renewDate}</span>}
            </div>
          </div>
        )}

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

        {/* Plan cards */}
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Subscription Plans</h2>
        <div className="flex flex-col gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-[#1A1740] rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all
                ${plan.highlight ? 'ring-2 ring-purple-500' : ''}`}>

              {plan.highlight && (
                <div className="absolute top-0 right-0">
                  <div className="text-xs font-bold text-white px-3 py-1 rounded-bl-xl"
                    style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                    Most Popular
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-base">{plan.label}</p>
                  <p className="text-2xl font-extrabold mt-1" style={{ color: '#6C63FF' }}>
                    {plan.price}
                    <span className="text-sm font-normal text-gray-400 ml-1">{plan.period}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {plan.minutes.toLocaleString()} analysis minutes
                  </p>
                </div>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!loadingPlan || status === 'active' && userData?.planId === plan.id}
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl text-white text-sm font-semibold mt-1 transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
                  {loadingPlan === plan.id
                    ? 'Loading…'
                    : status === 'active' && userData?.planId === plan.id
                    ? 'Current Plan'
                    : 'Subscribe'}
                </button>
              </div>

              <ul className="flex flex-col gap-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5 flex-shrink-0">
                      <path d="M2 6l3 3 5-5" stroke="#6C63FF" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-6">
          Payments processed securely by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
