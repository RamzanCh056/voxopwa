const functions = require('firebase-functions/v1')
const admin = require('firebase-admin')
const Stripe = require('stripe')
const { FREE_PLANS, PRO_PLANS, TOPUP } = require('./plans')

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

    const isTopup  = planId === 'topup_300'
    const freePlan = !isTopup ? FREE_PLANS[planId] : null
    const proPlan  = !isTopup ? PRO_PLANS[planId]  : null

    if (!isTopup && !freePlan && !proPlan) {
      throw new functions.https.HttpsError('invalid-argument', `Unknown planId: ${planId}`)
    }

    const stripe = getStripe()

    // Get or create Stripe customer
    const userRef  = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    const userData = userSnap.data() || {}

    let customerId = userData.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUid: uid },
      })
      customerId = customer.id
      await userRef.set(
        { stripeCustomerId: customerId, createdAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      )
    }

    const appUrl   = process.env.APP_URL || 'https://voxopwa-production.up.railway.app'
    const priceId  = isTopup ? TOPUP.priceId : (proPlan ? proPlan.priceId : freePlan.priceId)
    const mode     = isTopup ? 'payment'     : (proPlan ? proPlan.mode    : 'subscription')

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      client_reference_id: uid,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true`,
      cancel_url:  `${appUrl}/billing?canceled=true`,
      metadata:    { planId, firebaseUid: uid },
    })

    return { url: session.url }
  })

// ─── 2. createPortalSession ──────────────────────────────────────────────────

exports.createPortalSession = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }
    const uid      = context.auth.uid
    const userSnap = await db.collection('users').doc(uid).get()
    const userData = userSnap.data() || {}

    if (!userData.stripeCustomerId) {
      throw new functions.https.HttpsError('not-found', 'No billing account found')
    }

    const appUrl  = process.env.APP_URL || 'https://voxopwa-production.up.railway.app'
    const stripe  = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer:   userData.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    })

    return { url: session.url }
  })

// ─── 3. stripeWebhook ────────────────────────────────────────────────────────

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
          const uid     = session.client_reference_id || session.metadata?.firebaseUid
          if (!uid) break

          const planId  = session.metadata?.planId
          const userRef = db.collection('users').doc(uid)
          const proPlan = PRO_PLANS[planId]

          if (proPlan) {
            // ── Unlimited Pro purchase ──────────────────────────────────
            const update = { planId, subscriptionStatus: 'active', unlimited: true }

            if (proPlan.mode === 'payment') {
              // Lifetime — never expires
              update.planType = 'lifetime'
            } else {
              // Pro subscription — record current period
              const subscription = await getStripe().subscriptions.retrieve(session.subscription)
              update.subscriptionId     = session.subscription
              update.currentPeriodStart = admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000)
              update.currentPeriodEnd   = admin.firestore.Timestamp.fromMillis(subscription.current_period_end   * 1000)
            }

            await userRef.set(update, { merge: true })
            await db.collection('usage_logs').doc(uid).collection('entries').add({
              type:      'pro_upgrade',
              planId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            })

          } else if (session.mode === 'payment') {
            // ── Top-up for metered user ─────────────────────────────────
            await userRef.set({ minutesIncluded: admin.firestore.FieldValue.increment(TOPUP.minutes) }, { merge: true })
            await db.collection('usage_logs').doc(uid).collection('entries').add({
              type:         'topup',
              minutesAdded: TOPUP.minutes,
              timestamp:    admin.firestore.FieldValue.serverTimestamp(),
            })

          } else {
            // ── New metered subscription ───────────────────────────────
            const freePlan = FREE_PLANS[planId]
            if (!freePlan) break
            const subscription = await getStripe().subscriptions.retrieve(session.subscription)

            await userRef.set({
              subscriptionId:     session.subscription,
              planId,
              subscriptionStatus: 'active',
              unlimited:          false,
              minutesIncluded:    freePlan.minutesIncluded,
              minutesUsed:        0,
              currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
              currentPeriodEnd:   admin.firestore.Timestamp.fromMillis(subscription.current_period_end   * 1000),
            }, { merge: true })

            await db.collection('usage_logs').doc(uid).collection('entries').add({
              type:            'subscription_start',
              planId,
              minutesIncluded: freePlan.minutesIncluded,
              timestamp:       admin.firestore.FieldValue.serverTimestamp(),
            })
          }
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object
          if (invoice.billing_reason === 'subscription_create') break

          const user = await getUserByCustomerId(invoice.customer)
          if (!user) break

          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription)
          const periodUpdate = {
            subscriptionStatus: 'active',
            currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
            currentPeriodEnd:   admin.firestore.Timestamp.fromMillis(subscription.current_period_end   * 1000),
          }

          if (user.unlimited) {
            // Pro renewal — just update period, no minute rollover
            await db.collection('users').doc(user.id).set(periodUpdate, { merge: true })
            await db.collection('usage_logs').doc(user.id).collection('entries').add({
              type:      'pro_renewal',
              planId:    user.planId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            })
          } else {
            // Metered renewal — rollover unused minutes
            const freePlan = FREE_PLANS[user.planId]
            if (!freePlan) break
            const rollover = Math.max(
              Math.min((user.minutesIncluded || 0) - (user.minutesUsed || 0), freePlan.minutesIncluded),
              0
            )
            await db.collection('users').doc(user.id).set({
              ...periodUpdate,
              minutesIncluded: freePlan.minutesIncluded + rollover,
              minutesUsed:     0,
            }, { merge: true })
            await db.collection('usage_logs').doc(user.id).collection('entries').add({
              type:            'reset',
              planId:          user.planId,
              minutesIncluded: freePlan.minutesIncluded,
              rolloverMinutes: rollover,
              timestamp:       admin.firestore.FieldValue.serverTimestamp(),
            })
          }
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object
          const user = await getUserByCustomerId(subscription.customer)
          if (!user) break
          await db.collection('users').doc(user.id).set({
            subscriptionStatus: 'canceled',
            unlimited:          false,
          }, { merge: true })
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

    // Fast path: unlimited Pro users — log analytics but never block
    const userSnap = await userRef.get()
    const userData = userSnap.data() || {}

    if (userData.unlimited === true && userData.subscriptionStatus === 'active') {
      await db.collection('usage_logs').doc(uid).collection('entries').add({
        type:          'analysis',
        minutesUsed:   estimatedMinutes,
        unlimited:     true,
        timestamp:     admin.firestore.FieldValue.serverTimestamp(),
      })
      return { success: true, unlimited: true }
    }

    // Metered path: atomic check + deduct
    await db.runTransaction(async (tx) => {
      const snap     = await tx.get(userRef)
      const d        = snap.data() || {}
      const included = d.minutesIncluded || 0
      const used     = d.minutesUsed     || 0
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
      type:        'analysis',
      minutesUsed: estimatedMinutes,
      timestamp:   admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true, minutesConsumed: estimatedMinutes }
  })

// ─── 5. getAdminUsageStats ───────────────────────────────────────────────────

exports.getAdminUsageStats = functions
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }
    if (!context.auth.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin only')
    }

    const usersSnap = await db.collection('users').get()
    const users     = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const planCounts     = { pro_monthly: 0, pro_yearly: 0, pro_lifetime: 0, monthly: 0, quarterly: 0, yearly: 0, none: 0 }
    let totalActive      = 0
    let totalUnlimited   = 0
    let totalMinutesUsed = 0

    for (const u of users) {
      if (u.subscriptionStatus === 'active' || u.planType === 'lifetime') {
        totalActive++
        if (u.unlimited) totalUnlimited++
        planCounts[u.planId] = (planCounts[u.planId] || 0) + 1
      } else {
        planCounts.none = (planCounts.none || 0) + 1
      }
      totalMinutesUsed += u.minutesUsed || 0
    }

    const planPrices    = { pro_monthly: 10.99, pro_yearly: 59 / 12, pro_lifetime: 0, monthly: 9.99, quarterly: 24.99 / 3, yearly: 79.99 / 12 }
    const estimatedRevenue = Object.entries(planCounts)
      .filter(([k]) => k !== 'none')
      .reduce((sum, [planId, count]) => sum + (planPrices[planId] || 0) * count, 0)

    const topUsers = [...users]
      .sort((a, b) => (b.minutesUsed || 0) - (a.minutesUsed || 0))
      .slice(0, 50)
      .map(u => ({
        id:                 u.id,
        planId:             u.planId || 'none',
        subscriptionStatus: u.subscriptionStatus || (u.planType === 'lifetime' ? 'lifetime' : 'none'),
        unlimited:          u.unlimited || false,
        minutesUsed:        u.minutesUsed || 0,
        minutesIncluded:    u.minutesIncluded || 0,
        currentPeriodEnd:   u.currentPeriodEnd?.toMillis?.() || null,
      }))

    return {
      totalUsers:              users.length,
      totalActive,
      totalUnlimited,
      totalMinutesUsed,
      planCounts,
      estimatedMonthlyRevenue: Math.round(estimatedRevenue * 100) / 100,
      topUsers,
    }
  })
