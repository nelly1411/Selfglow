// services/checkout.service.js
const crypto = require('crypto')
const prisma = require('../config/prisma')
const { sendOrderConfirmation } = require('./mail.service')

exports.createOrder = async (data) => {
  const { items, totalPrice, payment, shipping, userId } = data


function checkSpam(key) {
  const now   = Date.now()
  const entry = attemptMap.get(key)

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    // Neues Zeitfenster
    attemptMap.set(key, { count: 1, firstAttempt: now })
    return
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const waitSec = Math.ceil((WINDOW_MS - (now - entry.firstAttempt)) / 1000)
    throw new Error(`Zu viele Versuche. Bitte warte ${waitSec} Sekunden.`)
  }

  entry.count++
}

// ─── Hauptfunktion ────────────────────────────────────────────────────────────
// userId  = null  → Gastkauf
// userIp  = IP-Adresse des Clients (aus Controller)
exports.createOrder = async (data, userId = null, userIp = 'unknown') => {
  const { items, totalPrice, payment, shipping, customer } = data

  // 1. Spam-Check (eingeloggte User per ID, Gäste per IP)
  const spamKey = userId ? `user_${userId}` : `ip_${userIp}`
  checkSpam(spamKey)

  // 2. Validierung
  if (!items || items.length === 0) throw new Error('Keine Produkte im Warenkorb')
  if (!shipping?.address)           throw new Error('Adresse fehlt')
  if (!payment)                     throw new Error('Zahlungsmethode fehlt')
    
 const orderNumber = `JE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  // 3. Bestellung in DB anlegen
  const order = await prisma.order.create({
    data: {
      userId: userId || null,
      totalPrice,
      paymentMethod: payment,
      address:       shipping.address,
      city:          shipping.city,
      postal:        shipping.postal,
      country:       shipping.country,
      items:         JSON.stringify(items),
      // userId nur setzen wenn eingeloggt
      ...(userId ? { userId } : {}),
    },
  })

  return order
}

exports.getOrdersByUserId = async (userId) => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}
