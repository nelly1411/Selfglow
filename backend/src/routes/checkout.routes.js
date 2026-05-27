// routes/checkout.routes.js
const express = require('express')
const router  = express.Router()
const checkoutController = require('../controllers/checkout.controller')
const authMiddleware = require('../middleware/authMiddleware')

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return next()
  }

  return authMiddleware(req, res, next)
}

router.post('/', optionalAuth, checkoutController.createOrder)
router.get('/orders', authMiddleware, checkoutController.getMyOrders)

module.exports = router
