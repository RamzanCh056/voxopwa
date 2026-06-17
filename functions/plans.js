module.exports = {
  PLANS: {
    monthly: {
      id: 'monthly',
      label: '30 Days',
      minutesIncluded: 300,
      priceId: process.env.PRICE_MONTHLY || 'price_REPLACE_MONTHLY',
      durationDays: 30,
    },
    quarterly: {
      id: 'quarterly',
      label: '90 Days',
      minutesIncluded: 1000,
      priceId: process.env.PRICE_QUARTERLY || 'price_REPLACE_QUARTERLY',
      durationDays: 90,
    },
    yearly: {
      id: 'yearly',
      label: '1 Year',
      minutesIncluded: 4500,
      priceId: process.env.PRICE_YEARLY || 'price_REPLACE_YEARLY',
      durationDays: 365,
    },
  },
  TOPUP: {
    id: 'topup_300',
    label: '+300 minutes',
    minutes: 300,
    priceId: process.env.PRICE_TOPUP || 'price_REPLACE_TOPUP',
  },
}
