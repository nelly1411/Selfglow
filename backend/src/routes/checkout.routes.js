// routes/checkout.routes.js

const express = require('express')
const router = express.Router()
const checkoutController = require('../controllers/checkout.controller')

router.post('/', checkoutController.createOrder)

module.exports = router