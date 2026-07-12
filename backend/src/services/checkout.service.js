// services/checkout.service.js
const crypto = require('crypto')
const prisma = require('../config/prisma')

// ─── Spam-Schutz ──────────────────────────────────────────────────────────────
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

// ─── Create Order ─────────────────────────────────────────────────────────────
exports.createOrder = async (data, userId = null, userIp = 'unknown') => {
  const { items, totalPrice, payment, shipping, customer, discountCode } = data

  if (userId) {
    userId = Number(userId)
    if (Number.isNaN(userId)) userId = null
  }

  const spamKey = userId ? `user_${userId}` : `ip_${userIp}`
  checkSpam(spamKey)

  if (!items || items.length === 0) throw new Error('Keine Produkte im Warenkorb')
  if (!shipping?.address) throw new Error('Adresse fehlt')
  if (!payment) throw new Error('Zahlungsmethode fehlt')

  const code = discountCode?.trim().toUpperCase() || null

  if (code === 'WELCOME10' && userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { usedWelcomeCode: true },
    })

    if (dbUser?.usedWelcomeCode) {
      throw new Error('WELCOME10 wurde bereits verwendet.')
    }
  }

  const orderNumber = `JE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

  const order = await prisma.order.create({
    data: {
      orderNumber,
      totalPrice,
      paymentMethod: payment,
      address: shipping.address,
      city: shipping.city,
      postal: shipping.postal,
      country: shipping.country,
      items: JSON.stringify(items),
      ...(userId ? { userId } : {}),
      ...(!userId && customer?.email ? { guestEmail: customer.email.trim().toLowerCase() } : {}),
    },
  })

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        savedAddress: shipping.address,
        savedPostal: shipping.postal,
        savedCity: shipping.city,
        savedCountry: shipping.country,
        savedPhone: customer?.phone ?? '',
        ...(code === 'WELCOME10' ? { usedWelcomeCode: true } : {}),
      },
    })
  }

  return order
}

//connecting guest orders with an account
exports.linkGuestOrdersToUser = async (userId, email) => {
  if (!userId || !email) return

  const normalizedEmail = email.trim().toLowerCase()

  await prisma.order.updateMany({
    where: {
      guestEmail: normalizedEmail,
      userId: null,
    },
    data: {
      userId: Number(userId),
    },
  })
}

// ─── Orders by User ───────────────────────────────────────────────────────────
exports.getOrdersByUserId = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}