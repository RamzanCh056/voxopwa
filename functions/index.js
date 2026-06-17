const functions = require('firebase-functions/v1')
const admin     = require('firebase-admin')
const Stripe    = require('stripe')
const { PLANS, TOPUP } = require('./plans')

admin.initializeApp()
const db = admin.firestore()

// ─── helpers ─────────────────────────────────────────────────────────────────

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
}

async function getUserByCustomerId(customerId) {
  const snap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1).get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

// ─── 1. createCheckoutSession ─────────────────────────────────────────────────

exports.createCheckoutSession = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }

    const { planId } = data
    const uid   = context.auth.uid
    const email = context.auth.token.email

    const isTopup = planId === 'topup_300'
    const plan    = isTopup ? null : PLANS[planId]
    if (!isTopup && !plan) {
      throw new functions.https.HttpsError('invalid-argument', `Unknown planId: ${planId}`)
    }

    const priceId = isTopup ? TOPUP.priceId : plan.priceId
    if (!priceId) {
      throw new functions.https.HttpsError('failed-precondition', `Price ID not configured for plan: ${planId}`)
    }

    const stripe  = getStripe()
    const userRef = db.collection('users').doc(uid)
    const snap    = await userRef.get()
    const ud      = snap.data() || {}

    let customerId = ud.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { firebaseUid: uid } })
      customerId = customer.id
      await userRef.set({ stripeCustomerId: customerId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    }

    const appUrl = process.env.APP_URL || 'https://voxopwa-production.up.railway.app'

    const session = await stripe.checkout.sessions.create({
      mode:               isTopup ? 'payment' : 'subscription',
      customer:           customerId,
      client_reference_id: uid,
      line_items:         [{ price: priceId, quantity: 1 }],
      success_url:        `${appUrl}/billing?success=true`,
      cancel_url:         `${appUrl}/billing?canceled=true`,
      metadata:           { planId, firebaseUid: uid },
    })

    return { url: session.url }
  })

// ─── 2. getPlanPrices ─────────────────────────────────────────────────────────

exports.getPlanPrices = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }

    const stripe  = getStripe()
    const results = {}

    const allItems = [
      ...Object.entries(PLANS).map(([id, p]) => ({ planId: id, priceId: p.priceId })),
      { planId: 'topup_300', priceId: TOPUP.priceId },
    ]

    await Promise.all(allItems.map(async ({ planId, priceId }) => {
      if (!priceId) return
      try {
        const price = await stripe.prices.retrieve(priceId)
        results[planId] = {
          amount:        price.unit_amount / 100,
          currency:      price.currency.toUpperCase(),
          interval:      price.recurring?.interval      || null,
          intervalCount: price.recurring?.interval_count || 1,
        }
      } catch {
        // price not configured yet — omit from results
      }
    }))

    return results
  })

// ─── 3. stripeWebhook ────────────────────────────────────────────────────────

exports.stripeWebhook = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
  .https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature']
    let event
    try {
      event = getStripe().webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Webhook signature error:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {

        case 'checkout.session.completed': {
          const session = event.data.object
          const uid     = session.client_reference_id || session.metadata?.firebaseUid
          if (!uid) break
          const planId  = session.metadata?.planId
          const userRef = db.collection('users').doc(uid)

          if (session.mode === 'payment') {
            // One-time top-up
            await userRef.set({ minutesIncluded: admin.firestore.FieldValue.increment(TOPUP.minutes) }, { merge: true })
            await db.collection('usage_logs').doc(uid).collection('entries').add({
              type: 'topup', minutesAdded: TOPUP.minutes,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            })
          } else {
            // New subscription
            const plan = PLANS[planId]
            if (!plan) break
            const subscription = await getStripe().subscriptions.retrieve(session.subscription)
            await userRef.set({
              subscriptionId:     session.subscription,
              planId,
              subscriptionStatus: 'active',
              minutesIncluded:    plan.minutesIncluded,
              minutesUsed:        0,
              currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
              currentPeriodEnd:   admin.firestore.Timestamp.fromMillis(subscription.current_period_end   * 1000),
            }, { merge: true })
            await db.collection('usage_logs').doc(uid).collection('entries').add({
              type: 'subscription_start', planId, minutesIncluded: plan.minutesIncluded,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            })
          }
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object
          if (invoice.billing_reason === 'subscription_create') break
          const user = await getUserByCustomerId(invoice.customer)
          if (!user) break
          const plan = PLANS[user.planId]
          if (!plan) break

          // Rollover: carry forward up to planMinutes of unused time
          const rollover = Math.max(
            Math.min((user.minutesIncluded || 0) - (user.minutesUsed || 0), plan.minutesIncluded),
            0
          )
          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription)
          await db.collection('users').doc(user.id).set({
            minutesIncluded:    plan.minutesIncluded + rollover,
            minutesUsed:        0,
            subscriptionStatus: 'active',
            currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
            currentPeriodEnd:   admin.firestore.Timestamp.fromMillis(subscription.current_period_end   * 1000),
          }, { merge: true })
          await db.collection('usage_logs').doc(user.id).collection('entries').add({
            type: 'reset', planId: user.planId, minutesIncluded: plan.minutesIncluded,
            rolloverMinutes: rollover, timestamp: admin.firestore.FieldValue.serverTimestamp(),
          })
          break
        }

        case 'customer.subscription.deleted': {
          const sub  = event.data.object
          const user = await getUserByCustomerId(sub.customer)
          if (!user) break
          await db.collection('users').doc(user.id).set({ subscriptionStatus: 'canceled' }, { merge: true })
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object
          const user    = await getUserByCustomerId(invoice.customer)
          if (!user) break
          await db.collection('users').doc(user.id).set({ subscriptionStatus: 'past_due' }, { merge: true })
          break
        }
      }
    } catch (err) {
      console.error('Webhook handler error:', err)
      return res.status(500).send('Internal error')
    }

    res.json({ received: true })
  })

// ─── 4. consumeMinutes ───────────────────────────────────────────────────────

exports.consumeMinutes = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }

    const uid              = context.auth.uid
    const estimatedMinutes = Math.max(1, Math.ceil(data.estimatedMinutes || 1))
    const userRef          = db.collection('users').doc(uid)

    await db.runTransaction(async (tx) => {
      const snap      = await tx.get(userRef)
      const ud        = snap.data() || {}
      const remaining = (ud.minutesIncluded || 0) - (ud.minutesUsed || 0)

      if (remaining < estimatedMinutes) {
        throw new functions.https.HttpsError(
          'resource-exhausted', 'INSUFFICIENT_MINUTES',
          { remaining, needed: estimatedMinutes }
        )
      }

      tx.set(userRef, { minutesUsed: admin.firestore.FieldValue.increment(estimatedMinutes) }, { merge: true })
    })

    await db.collection('usage_logs').doc(uid).collection('entries').add({
      type: 'analysis', minutesUsed: estimatedMinutes,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true, minutesConsumed: estimatedMinutes }
  })

// ─── 5. getAdminStats (summary only) ─────────────────────────────────────────

exports.getAdminStats = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    if (!context.auth.token.admin) throw new functions.https.HttpsError('permission-denied', 'Admin only')

    const snap  = await db.collection('users').get()
    const users = snap.docs.map(d => d.data())

    const planCounts = {}
    let totalActive = 0, totalMinutesUsed = 0, topupCount = 0

    for (const u of users) {
      totalMinutesUsed += u.minutesUsed || 0
      if (u.subscriptionStatus === 'active') {
        totalActive++
        planCounts[u.planId] = (planCounts[u.planId] || 0) + 1
      }
    }

    // Rough topup count from usage_logs would be expensive; skip for now
    const planPrices = { monthly: 9.99, quarterly: 24.99, yearly: 79.99 }
    const estimatedRevenue = Object.entries(planCounts)
      .reduce((sum, [id, count]) => sum + (planPrices[id] || 0) * count, 0)

    return {
      totalUsers: snap.size,
      totalActive,
      totalMinutesUsed,
      planCounts,
      estimatedMonthlyRevenue: Math.round(estimatedRevenue * 100) / 100,
    }
  })

// ─── 6. getAdminUsers (cursor-paginated) ─────────────────────────────────────

exports.getAdminUsers = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    if (!context.auth.token.admin) throw new functions.https.HttpsError('permission-denied', 'Admin only')

    const pageSize       = Math.min(data?.pageSize || 50, 100)
    const lastMinutesUsed = data?.lastMinutesUsed ?? null
    const lastUid        = data?.lastUid          ?? null

    let q = db.collection('users')
      .orderBy('minutesUsed', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
      .limit(pageSize + 1)

    if (lastMinutesUsed !== null && lastUid) {
      q = q.startAfter(lastMinutesUsed, lastUid)
    }

    const snap    = await q.get()
    const hasMore = snap.docs.length > pageSize
    const docs    = snap.docs.slice(0, pageSize)

    const users = docs.map(d => {
      const u = d.data()
      return {
        id:                 d.id,
        email:              u.email              || null,
        planId:             u.planId             || null,
        subscriptionStatus: u.subscriptionStatus || null,
        minutesUsed:        u.minutesUsed        || 0,
        minutesIncluded:    u.minutesIncluded    || 0,
        currentPeriodEnd:   u.currentPeriodEnd?.toMillis?.() || null,
        stripeCustomerId:   u.stripeCustomerId   || null,
      }
    })

    return { users, hasMore }
  })
