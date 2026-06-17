const functions = require('firebase-functions/v1')
const admin = require('firebase-admin')
const Stripe = require('stripe')
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
    .limit(1)
    .get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

// ─── 1. createCheckoutSession ────────────────────────────────────────────────

exports.createCheckoutSession = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }

    const { planId } = data
    const uid = context.auth.uid
    const email = context.auth.token.email

    const isTopup = planId === 'topup_300'
    const plan = isTopup ? null : PLANS[planId]
    if (!isTopup && !plan) {
      throw new functions.https.HttpsError('invalid-argument', `Unknown planId: ${planId}`)
    }

    const stripe = getStripe()

    // Get or create Stripe customer
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    const userData = userSnap.data() || {}

    let customerId = userData.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUid: uid },
      })
      customerId = customer.id
      await userRef.set({ stripeCustomerId: customerId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    }

    const appUrl = process.env.APP_URL || 'https://voxopwa-production.up.railway.app'

    let session
    if (isTopup) {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        client_reference_id: uid,
        line_items: [{ price: TOPUP.priceId, quantity: 1 }],
        success_url: `${appUrl}/billing?success=true`,
        cancel_url: `${appUrl}/billing?canceled=true`,
        metadata: { planId: 'topup_300', firebaseUid: uid },
      })
    } else {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: uid,
        line_items: [{ price: plan.priceId, quantity: 1 }],
        success_url: `${appUrl}/billing?success=true`,
        cancel_url: `${appUrl}/billing?canceled=true`,
        metadata: { planId, firebaseUid: uid },
      })
    }

    return { url: session.url }
  })

// ─── 2. stripeWebhook ────────────────────────────────────────────────────────

exports.stripeWebhook = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
  .https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature']
    let event

    try {
      event = getStripe().webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook signature error:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {

        case 'checkout.session.completed': {
          const session = event.data.object
          const uid = session.client_reference_id || session.metadata?.firebaseUid
          if (!uid) break

          const userRef = db.collection('users').doc(uid)

          if (session.mode === 'payment') {
            // Top-up
            await userRef.set({
              minutesIncluded: admin.firestore.FieldValue.increment(TOPUP.minutes),
            }, { merge: true })
            await db.collection('usage_logs').doc(uid).collection('entries').add({
              type: 'topup',
              minutesAdded: TOPUP.minutes,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            })
          } else if (session.mode === 'subscription') {
            // New subscription
            const planId = session.metadata?.planId
            const plan = PLANS[planId]
            if (!plan) break

            const subId = session.subscription
            const stripe = getStripe()
            const subscription = await stripe.subscriptions.retrieve(subId)

            await userRef.set({
              subscriptionId: subId,
              planId,
              subscriptionStatus: 'active',
              minutesIncluded: plan.minutesIncluded,
              minutesUsed: 0,
              currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
              currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
            }, { merge: true })

            await db.collection('usage_logs').doc(uid).collection('entries').add({
              type: 'subscription_start',
              planId,
              minutesIncluded: plan.minutesIncluded,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            })
          }
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object
          // Skip the first payment — handled by checkout.session.completed
          if (invoice.billing_reason === 'subscription_create') break

          const customerId = invoice.customer
          const user = await getUserByCustomerId(customerId)
          if (!user) break

          const plan = PLANS[user.planId]
          if (!plan) break

          const rollover = Math.max(
            Math.min((user.minutesIncluded || 0) - (user.minutesUsed || 0), plan.minutesIncluded),
            0
          )
          const newMinutesIncluded = plan.minutesIncluded + rollover

          const stripe = getStripe()
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)

          await db.collection('users').doc(user.id).set({
            minutesIncluded: newMinutesIncluded,
            minutesUsed: 0,
            subscriptionStatus: 'active',
            currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
            currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
          }, { merge: true })

          await db.collection('usage_logs').doc(user.id).collection('entries').add({
            type: 'reset',
            planId: user.planId,
            minutesIncluded: plan.minutesIncluded,
            rolloverMinutes: rollover,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          })
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object
          const customerId = subscription.customer
          const user = await getUserByCustomerId(customerId)
          if (!user) break
          await db.collection('users').doc(user.id).set({ subscriptionStatus: 'canceled' }, { merge: true })
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object
          const user = await getUserByCustomerId(invoice.customer)
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

// ─── 3. consumeMinutes ───────────────────────────────────────────────────────

exports.consumeMinutes = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }

    const uid = context.auth.uid
    const estimatedMinutes = Math.ceil(data.estimatedMinutes || 1)
    const userRef = db.collection('users').doc(uid)

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef)
      const userData = snap.data() || {}
      const included = userData.minutesIncluded || 0
      const used = userData.minutesUsed || 0
      const remaining = included - used

      if (remaining < estimatedMinutes) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'INSUFFICIENT_MINUTES',
          { remaining, needed: estimatedMinutes }
        )
      }

      tx.set(userRef, { minutesUsed: admin.firestore.FieldValue.increment(estimatedMinutes) }, { merge: true })
    })

    await db.collection('usage_logs').doc(uid).collection('entries').add({
      type: 'analysis',
      minutesUsed: estimatedMinutes,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true, minutesConsumed: estimatedMinutes }
  })

// ─── 4. getAdminUsageStats ───────────────────────────────────────────────────

exports.getAdminUsageStats = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }
    if (!context.auth.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin only')
    }

    const usersSnap = await db.collection('users').get()
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const planCounts = { monthly: 0, quarterly: 0, yearly: 0, none: 0 }
    let totalActive = 0
    let totalMinutesUsed = 0

    for (const u of users) {
      if (u.subscriptionStatus === 'active') {
        totalActive++
        planCounts[u.planId] = (planCounts[u.planId] || 0) + 1
      } else {
        planCounts.none++
      }
      totalMinutesUsed += u.minutesUsed || 0
    }

    const planPrices = { monthly: 9.99, quarterly: 24.99, yearly: 79.99 }
    const estimatedRevenue = Object.entries(planCounts)
      .filter(([k]) => k !== 'none')
      .reduce((sum, [planId, count]) => sum + (planPrices[planId] || 0) * count, 0)

    const topUsers = [...users]
      .sort((a, b) => (b.minutesUsed || 0) - (a.minutesUsed || 0))
      .slice(0, 50)
      .map(u => ({
        id: u.id,
        planId: u.planId || 'none',
        subscriptionStatus: u.subscriptionStatus || 'none',
        minutesUsed: u.minutesUsed || 0,
        minutesIncluded: u.minutesIncluded || 0,
        currentPeriodEnd: u.currentPeriodEnd?.toMillis?.() || null,
      }))

    return {
      totalUsers: users.length,
      totalActive,
      totalMinutesUsed,
      planCounts,
      estimatedMonthlyRevenue: Math.round(estimatedRevenue * 100) / 100,
      topUsers,
    }
  })
