// controllers/checkout.controller.js
const checkoutService = require('../services/checkout.service')


exports.createOrder = async (req, res) => {
  try {
    const order = await checkoutService.createOrder({
      ...req.body,
      userId: req.userId,
    })

    return res.status(200).json({
      message: 'Bestellung erfolgreich',
      order,
    })
  } catch (err) {
    console.error('CHECKOUT ERROR:', err.message)

    // Spam-Fehler → 429 Too Many Requests
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
