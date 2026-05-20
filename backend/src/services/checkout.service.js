const crypto = require('crypto')
const prisma = require('../config/prisma')

// ─── Spam-Schutz ─────────────────────────────
const attemptMap = new Map()
const MAX_ATTEMPTS = 3
const WINDOW_MS = 60_000

function checkSpam(key) {
  const now = Date.now()
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

// ─── Create Order ───────────────────────────
exports.createOrder = async (data, userId = null, userIp = 'unknown') => {
  const { items, totalPrice, payment, shipping } = data

  if (userId) {
    userId = Number(userId)
    if (Number.isNaN(userId)) userId = null
  }

  const spamKey = userId ? `user_${userId}` : `ip_${userIp}`
  checkSpam(spamKey)

  if (!items || items.length === 0) throw new Error('Keine Produkte im Warenkorb')
  if (!shipping?.address) throw new Error('Adresse fehlt')
  if (!payment) throw new Error('Zahlungsmethode fehlt')

  const orderNumber = `JE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: userId || null,
      totalPrice,
      paymentMethod: payment,
      address: shipping.address,
      city: shipping.city,
      postal: shipping.postal,
      country: shipping.country,
      items: JSON.stringify(items),
    },
  })

  return order
}

// ─── Orders fetch ───────────────────────────
exports.getOrdersByUserId = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}