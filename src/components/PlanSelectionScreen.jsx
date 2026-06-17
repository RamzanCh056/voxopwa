const FAKE_PLANS = [
  {
    id: 'monthly',
    label: '30 Days',
    minutesIncluded: 300,
    price: 9.99,
    period: '/month',
  },
  {
    id: 'quarterly',
    label: '90 Days',
    minutesIncluded: 1000,
    price: 24.99,
    period: '/3 months',
    badge: 'Popular',
    badgeColor: { bg: '#EDE9FE', text: '#6D28D9', ring: '#8B5CF6' },
  },
  {
    id: 'yearly',
    label: '1 Year',
    minutesIncluded: 4500,
    price: 79.99,
    period: '/year',
    badge: 'Best Value',
    badgeColor: { bg: '#FEF3C7', text: '#92400E', ring: '#F59E0B' },
  },
]

const FAKE_TOPUP = {
  id: 'topup_300',
  label: '+300 minutes',
  price: 4.99,
  description: 'One-time add-on, never expires',
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 flex-shrink-0">
      <circle cx="8" cy="8" r="8" fill="#EDE9FE"/>
      <path d="M5 8l2 2 4-4" stroke="#6C63FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlanCard({ plan, onChoose }) {
  const hasBadge = !!plan.badge

  return (
    <div
      className="relative bg-white dark:bg-[#1A1740] rounded-3xl p-5 flex flex-col gap-4 shadow-sm transition-transform active:scale-[0.98]"
      style={hasBadge ? {
        border: `2px solid ${plan.badgeColor.ring}`,
        boxShadow: `0 0 0 4px ${plan.badgeColor.ring}22`,
      } : {
        border: '1.5px solid rgba(0,0,0,0.06)',
      }}>

      {/* Badge */}
      {hasBadge && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: plan.badgeColor.bg, color: plan.badgeColor.text }}>
          {plan.badge}
        </span>
      )}

      {/* Label */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
          {plan.label}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white leading-none">
            ${plan.price}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500 mb-1">{plan.period}</span>
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <strong>{plan.minutesIncluded.toLocaleString()}</strong> analysis minutes included
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

      {/* CTA */}
      <button
        onClick={() => onChoose(plan.id)}
        className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
        style={{
          background: hasBadge
            ? 'linear-gradient(135deg,#6C63FF 0%,#8B85FF 60%,#4F8AFF 100%)'
            : 'linear-gradient(135deg,#6C63FF,#8B85FF)',
          boxShadow: hasBadge ? '0 6px 24px rgba(108,99,255,0.45)' : '0 4px 16px rgba(108,99,255,0.25)',
        }}>
        Choose Plan
      </button>
    </div>
  )
}

export default function PlanSelectionScreen({ onDismiss }) {
  function handleChoose(planId) {
    console.log('[PlanSelectionScreen] plan selected:', planId)
    onDismiss()
  }

  function handleTopup() {
    console.log('[PlanSelectionScreen] topup selected')
    onDismiss()
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

        {/* Plan cards — stacked on mobile, row on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {FAKE_PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} onChoose={handleChoose} />
          ))}
        </div>

        {/* Top-up card */}
        <div className="bg-white dark:bg-[#1A1740] rounded-2xl p-4 flex items-center gap-4 shadow-sm"
          style={{ border: '1.5px solid rgba(0,0,0,0.06)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6C63FF22,#8B85FF22)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{FAKE_TOPUP.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{FAKE_TOPUP.description}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-lg font-extrabold text-gray-900 dark:text-white">
              ${FAKE_TOPUP.price}
            </span>
            <button
              onClick={handleTopup}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#6C63FF,#8B85FF)' }}>
              Add
            </button>
          </div>
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
