import { useEffect, useState } from 'react'
import { redirectToCheckout } from '../services/billingService'

const PRO_PLANS = [
  {
    id: 'pro_monthly',
    label: 'Pro Monthly',
    price: '$10.99',
    period: '/month',
    description: 'Includes full AI analysis, export PDFs, all features.',
    badge: null,
  },
  {
    id: 'pro_yearly',
    label: 'Pro Yearly',
    priceAmount: '$59',
    period: '/year',
    monthly: '~$4.92/month',
    savings: 'Save 35% vs monthly',
    badge: '⭐ Best Value',
  },
  {
    id: 'pro_lifetime',
    label: 'Pro Lifetime',
    price: '$199',
    priceSuffix: 'once',
    description: 'One-time purchase, yours forever.',
    badge: null,
  },
]

const FEATURES = [
  'Unlimited Recording Analyses',
  'Advanced Mood Timeline',
  'Reliability Scores + Deep Insights',
  'Voice Authenticity / Deepfake Check',
  'Export PDF + Share Link',
  'Notes + Playback Tools',
]

export default function UpgradeModal({ isOpen, onClose }) {
  const [loadingPlan, setLoadingPlan] = useState(null)

  // Prevent body scroll while modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleSelect = async (planId) => {
    try {
      setLoadingPlan(planId)
      await redirectToCheckout(planId)
    } catch (err) {
      console.error('Checkout error:', err)
      setLoadingPlan(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full md:max-w-sm bg-white dark:bg-[#1A1740] rounded-t-3xl md:rounded-3xl shadow-2xl
          flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#3E3B6E]" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center
            bg-gray-100 dark:bg-[#2E2B5B] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3E3B6E] transition-colors z-10"
          aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-8">

          {/* Header banner */}
          <div className="rounded-2xl p-5 mb-5 mt-1"
            style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
            <p className="text-white font-bold text-lg text-center mb-1">Voxofied Pro</p>
            <p className="text-white/90 text-sm text-center mb-4">
              Smarter analysis. Deeper insights. Unlimited exports.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '⚡', text: 'Faster Processing' },
                { icon: '📄', text: 'Unlimited Reports' },
                { icon: '🔍', text: 'Voice Analysis' },
                { icon: '🧠', text: 'AI Mood Timelines' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-white text-xs font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="flex flex-col gap-3 mb-5">

            {/* Pro Monthly */}
            <button
              onClick={() => handleSelect('pro_monthly')}
              disabled={!!loadingPlan}
              className="text-left w-full rounded-2xl border border-gray-200 dark:border-[#2E2B5B] bg-white dark:bg-[#12103A] p-4 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Pro Monthly</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold" style={{ color: '#2563EB' }}>$10.99</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {loadingPlan === 'pro_monthly' ? 'Loading…' : 'Includes full AI analysis, export PDFs, all features.'}
              </p>
            </button>

            {/* Pro Yearly — highlighted with gold border + badge */}
            <div className="relative pt-3">
              {/* Badge overlapping the top border */}
              <div className="absolute -top-0.5 left-4 z-10 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: '#F59E0B', color: '#1C1400' }}>
                ⭐ Best Value
              </div>
              <button
                onClick={() => handleSelect('pro_yearly')}
                disabled={!!loadingPlan}
                className="text-left w-full rounded-2xl p-4 bg-white dark:bg-[#12103A] transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ border: '2px solid #F59E0B' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-gray-800 dark:text-white font-bold text-base">Pro Yearly</p>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-xl font-bold" style={{ color: '#2563EB' }}>$59</span>
                      <span className="text-gray-400 text-sm">/year</span>
                    </div>
                    <p className="text-xs text-gray-400">~$4.92/month</p>
                  </div>
                </div>
                <p className="text-xs font-semibold mt-1" style={{ color: '#16A34A' }}>
                  {loadingPlan === 'pro_yearly' ? 'Loading…' : 'Save 35% vs monthly'}
                </p>
              </button>
            </div>

            {/* Pro Lifetime */}
            <button
              onClick={() => handleSelect('pro_lifetime')}
              disabled={!!loadingPlan}
              className="text-left w-full rounded-2xl border border-gray-200 dark:border-[#2E2B5B] bg-white dark:bg-[#12103A] p-4 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pro Lifetime</span>
                <span className="text-xl font-bold" style={{ color: '#2563EB' }}>$199</span>
                <span className="text-gray-400 text-sm">once</span>
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {loadingPlan === 'pro_lifetime' ? 'Loading…' : 'One-time purchase, yours forever.'}
              </p>
            </button>
          </div>

          {/* Feature checklist */}
          <div className="flex flex-col gap-2.5">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 flex-shrink-0">
                  <circle cx="10" cy="10" r="10" fill="#DCFCE7"/>
                  <path d="M6 10l3 3 5-5" stroke="#16A34A" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
