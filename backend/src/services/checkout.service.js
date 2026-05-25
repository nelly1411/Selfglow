// services/checkout.service.js
const crypto = require('crypto')
const prisma  = require('../config/prisma')
const { sendOrderConfirmation } = require('./mail.service')

// ─── Spam-Schutz ──────────────────────────────────────────────────────────────
const attemptMap  = new Map()
const MAX_ATTEMPTS = 3
const WINDOW_MS    = 60_000

function checkSpam(key) {
  const now   = Date.now()
  const entry = attemptMap.get(key)
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attemptMap.set(key, { count: 1, firstAttempt: now })
    return
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const waitSec = Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000)
    throw new Error(`Zu viele Versuche. Bitte warte ${waitSec} Sekunden.`)
  }
  entry.count++
}

// ─── Create Order ─────────────────────────────────────────────────────────────
exports.createOrder = async (data, userId = null, userIp = 'unknown') => {
  const { items, totalPrice, payment, shipping, customer, discountCode } = data

  // 1. userId normalisieren
  if (userId) {
    userId = Number(userId)
    if (Number.isNaN(userId)) userId = null
  }

  // 2. Spam-Check
  const spamKey = userId ? `user_${userId}` : `ip_${userIp}`
  checkSpam(spamKey)

  // 3. Basis-Validierung
  if (!items || items.length === 0) throw new Error('Keine Produkte im Warenkorb')
  if (!shipping?.address)           throw new Error('Adresse fehlt')
  if (!payment)                     throw new Error('Zahlungsmethode fehlt')

  // 4. WELCOME10 prüfen — nur wenn eingeloggt
  const code = discountCode?.trim().toUpperCase() || null
  if (code === 'WELCOME10' && userId) {
    const dbUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { usedWelcomeCode: true },
    })
    if (dbUser?.usedWelcomeCode) {
      throw new Error('WELCOME10 wurde bereits verwendet.')
    }
  }

  // 5. Bestellung anlegen
  const orderNumber = `JE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const order = await prisma.order.create({
    data: {
      orderNumber,
      totalPrice,
      paymentMethod: payment,
      address:       shipping.address,
      city:          shipping.city,
      postal:        shipping.postal,
      country:       shipping.country,
      items:         JSON.stringify(items),
      ...(userId ? { userId } : {}),
    },
  })

  // 6. Adresse + WELCOME10-Flag beim User speichern (nur eingeloggt)
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        savedAddress:    shipping.address,
        savedPostal:     shipping.postal,
        savedCity:       shipping.city,
        savedCountry:    shipping.country,
        savedPhone:      customer?.phone ?? '',
        // WELCOME10 als benutzt markieren — nur wenn er verwendet wurde
        ...(code === 'WELCOME10' ? { usedWelcomeCode: true } : {}),
      },
    })
  }

  // 7. Bestätigungs-Mail senden
  let recipientEmail = customer?.email ?? null
  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { email: true },
    })
    recipientEmail = dbUser?.email ?? null
  }

  if (recipientEmail) {
    sendOrderConfirmation({
      to:      recipientEmail,
      orderId: order.orderNumber,
      items,
      total:   totalPrice,
      shipping,
    }).catch(err =>
      console.error('Mail-Fehler (Bestellung trotzdem gespeichert):', err.message)
    )
  }

  return { ...order, orderNumber }
}

// ─── Orders by User ───────────────────────────────────────────────────────────
exports.getOrdersByUserId = async (userId) => {
  return prisma.order.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
  })
}