// controllers/checkout.controller.js

const checkoutService = require('../services/checkout.service')

exports.createOrder = async (req, res) => {
  try {
    console.log("BODY:", req.body) // 👈 WICHTIG

    const order = await checkoutService.createOrder(req.body)

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