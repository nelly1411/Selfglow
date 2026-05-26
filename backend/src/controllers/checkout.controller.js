// controllers/checkout.controller.js
const checkoutService = require('../services/checkout.service')
const mailService = require('../services/mail.service')

const prisma = require('../config/prisma')

exports.createOrder = async (req, res) => {
  try {
 const order = await checkoutService.createOrder(
  req.body,
  req.user?.userId || null,  
  req.ip
)


  const user = await prisma.user.findUnique({
  where: { id: req.user?.userId }, 
      select: { email: true }
    })

    if (user?.email) {
      await mailService.sendOrderConfirmation({
        to: user.email,
        orderId: order.orderNumber,
        items: order.items,
        total: order.totalPrice,
        shipping: {
          address: order.address,
          city: order.city,
          postal: order.postal,
          country: order.country,
        },
      })
    }

    return res.status(200).json({
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
    const orders = await checkoutService.getOrdersByUserId(req.userId)

    return res.json({ orders })
  } catch (err) {
    console.error('ORDER HISTORY ERROR:', err.message)

    return res.status(500).json({
      message: 'Fehler beim Laden der Bestellungen',
      error: err.message,
    })
  }
}
