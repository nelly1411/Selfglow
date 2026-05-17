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
    console.error("CHECKOUT ERROR:", err.message) // 👈 WICHTIG

    return res.status(500).json({
      message: 'Fehler bei Bestellung',
      error: err.message,
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
