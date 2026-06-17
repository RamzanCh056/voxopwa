import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'

const createCheckoutSessionFn = httpsCallable(functions, 'createCheckoutSession')
const consumeMinutesFn        = httpsCallable(functions, 'consumeMinutes')
const getPlanPricesFn         = httpsCallable(functions, 'getPlanPrices')

export async function redirectToCheckout(planId) {
  const result = await createCheckoutSessionFn({ planId })
  window.location.href = result.data.url
}

export async function checkMinutesBeforeAnalysis(estimatedMinutes) {
  try {
    await consumeMinutesFn({ estimatedMinutes })
    return { ok: true }
  } catch (err) {
    const code = err?.code || ''
    const msg  = err?.message || ''
    if (code === 'functions/resource-exhausted' || msg.includes('INSUFFICIENT_MINUTES')) {
      return { ok: false, reason: 'INSUFFICIENT_MINUTES', details: err?.details }
    }
    throw err
  }
}

// Cache plan prices for the session — avoids refetching on every render
let _planPricesCache = null

export async function getPlanPrices() {
  if (_planPricesCache) return _planPricesCache
  try {
    const result = await getPlanPricesFn()
    _planPricesCache = result.data
    return _planPricesCache
  } catch {
    return {}
  }
}
