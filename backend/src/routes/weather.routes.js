const express = require('express')
const router  = express.Router()
const { getWeatherContext } = require('../services/weather.service')

// GET /api/weather?lat=52.5&lon=13.4
router.get('/', async (req, res) => {
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ error: 'lat und lon erforderlich' })

  const context = await getWeatherContext(parseFloat(lat), parseFloat(lon))
  return res.json({ weather: context })
})

module.exports = router