module.exports = {
  PLANS: {
    monthly:   { id: 'monthly',   label: '30 Days', minutesIncluded: 300,  priceId: process.env.PRICE_MONTHLY   || null, durationDays: 30  },
    quarterly: { id: 'quarterly', label: '90 Days', minutesIncluded: 1000, priceId: process.env.PRICE_QUARTERLY || null, durationDays: 90  },
    yearly:    { id: 'yearly',    label: '1 Year',  minutesIncluded: 4500, priceId: process.env.PRICE_YEARLY    || null, durationDays: 365 },
  },
  TOPUP: { id: 'topup_300', label: '+300 minutes', minutes: 300, priceId: process.env.PRICE_TOPUP || null },
}
