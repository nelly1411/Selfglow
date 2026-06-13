// controllers/checkout.controller.js
const checkoutService = require('../services/checkout.service')
const mailService = require('../services/mail.service')
const prisma = require('../config/prisma')

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || null

    const order = await checkoutService.createOrder(
      req.body,
      userId,
      req.ip
    )

    const { customer, shipping, items, payment } = req.body

    let email = customer?.email || null

    if (!email && userId) {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { email: true },
      })

      email = user?.email || null
    }

    if (email) {
      try {
        await mailService.sendOrderConfirmation({
          to: email,
          orderId: order.orderNumber || order.id,
          items: order.items || items,
          total: order.totalPrice,
          shipping: {
            address: order.address || shipping?.address,
            city: order.city || shipping?.city,
            postal: order.postal || shipping?.postal,
            country: order.country || shipping?.country,
          },
          paymentMethod: order.paymentMethod || payment,
        })
    
        console.log('Bestätigungsmail wurde gesendet an:', email)
      } catch (mailError) {
        console.error(
          'Bestellung gespeichert, aber E-Mail konnte nicht gesendet werden:',
          mailError.message
        )
    
        return res.status(500).json({
          message:
            'Bestellung wurde gespeichert, aber die Bestätigungsmail konnte nicht gesendet werden.',
        })
      }
    } else {
      return res.status(400).json({
        message: 'Keine E-Mail-Adresse für die Bestellbestätigung vorhanden.',
      })
    }

    return res.status(201).json({
      message: 'Bestellung erfolgreich',
      order,
    })
  } catch (err) {
    console.error('CHECKOUT ERROR:', err.message)

    const status = err.message.includes('Zu viele Versuche') ? 429 : 500

    return res.status(status).json({
      message: err.message || 'Fehler bei Bestellung',
    })
  }
}

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.userId

    if (!userId) {
      return res.status(401).json({
        message: 'Nicht eingeloggt',
      })
    }

    const orders = await checkoutService.getOrdersByUserId(Number(userId))

    return res.json({ orders })
  } catch (err) {
    console.error('ORDER HISTORY ERROR:', err.message)

    return res.status(500).json({
      message: 'Fehler beim Laden der Bestellungen',
      error: err.message,
    })
  }
}
