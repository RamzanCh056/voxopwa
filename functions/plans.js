module.exports = {
  // Metered / starter plans — users burn down a bucket of minutes
  FREE_PLANS: {
    monthly:   { id: 'monthly',   label: '30 Days', minutesIncluded: 300,  priceId: process.env.PRICE_MONTHLY,   durationDays: 30  },
    quarterly: { id: 'quarterly', label: '90 Days', minutesIncluded: 1000, priceId: process.env.PRICE_QUARTERLY, durationDays: 90  },
    yearly:    { id: 'yearly',    label: '1 Year',  minutesIncluded: 4500, priceId: process.env.PRICE_YEARLY,    durationDays: 365 },
  },

  // One-time top-up
  TOPUP: { id: 'topup_300', label: '+300 minutes', minutes: 300, priceId: process.env.PRICE_TOPUP },

  // Unlimited Pro tiers — no minute counting, just active/canceled subscription status
  PRO_PLANS: {
    pro_monthly:  { id: 'pro_monthly',  label: 'Pro Monthly',  price: 10.99, priceId: process.env.PRICE_PRO_MONTHLY,  mode: 'subscription', unlimited: true },
    pro_yearly:   { id: 'pro_yearly',   label: 'Pro Yearly',   price: 59,    priceId: process.env.PRICE_PRO_YEARLY,   mode: 'subscription', unlimited: true, badge: 'Best Value', savingsLabel: 'Save 35% vs monthly' },
    pro_lifetime: { id: 'pro_lifetime', label: 'Pro Lifetime', price: 199,   priceId: process.env.PRICE_PRO_LIFETIME, mode: 'payment',      unlimited: true },
  },
}
