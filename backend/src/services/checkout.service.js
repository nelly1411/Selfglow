// services/checkout.service.js

const prisma = require('../config/prisma')

exports.createOrder = async (data) => {
  const { items, totalPrice, payment, shipping } = data

  if (!items || items.length === 0) {
    throw new Error('Keine Produkte im Warenkorb')
  }

  if (!shipping?.address) {
    throw new Error('Adresse fehlt')
  }

  const order = await prisma.order.create({
    data: {
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