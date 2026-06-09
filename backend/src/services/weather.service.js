const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5'

async function getWeatherContext(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    console.warn('[Weather] OPENWEATHER_API_KEY nicht gesetzt')
    return null
  }

  try {
    const response = await fetch(
      `${OPENWEATHER_API}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=de`
    )
    if (!response.ok) return null

    const data = await response.json()
    const temp        = Math.round(data.main?.temp ?? 0)
    const humidity    = data.main?.humidity ?? 0
    const weatherMain = data.weather?.[0]?.main ?? ''
    const weatherDesc = data.weather?.[0]?.description ?? ''
    const city        = data.name ?? ''
    const season      = getCurrentSeason()
    const skinTips    = getSkincareTips({ temp, humidity, weatherMain, season })

    return {
      // Felder für Frontend-Widget
      temp,
      humidity,
      weatherMain,
      weatherDesc,
      city,
      season,
      summary: `${city ? city + ': ' : ''}${temp}°C, ${weatherDesc}, Luftfeuchtigkeit ${humidity}%`,
      // Kontext für KI-Prompts
      promptContext: buildPromptContext({ temp, humidity, weatherMain, season, skinTips, city }),
    }
  } catch (err) {
    console.warn('[Weather] Fehler:', err.message)
    return null
  }
}

function buildPromptContext({ temp, humidity, weatherMain, season, skinTips, city }) {
  return `
Current weather context${city ? ' (' + city + ')' : ''}:
- Temperature: ${temp}°C
- Humidity: ${humidity}%
- Conditions: ${weatherMain}
- Season: ${season}
- Skincare priorities: ${skinTips.join('; ')}
`
}

function getSkincareTips({ temp, humidity, weatherMain, season }) {
  const tips = []

  if (temp >= 28)      tips.push('high heat — lightweight oil-free products')
  else if (temp <= 5)  tips.push('cold — rich barrier creams important')
  else if (temp <= 15) tips.push('cool — extra hydration recommended')

  if (humidity < 30)      tips.push('very dry air — hyaluronic acid and heavy moisturizer essential')
  else if (humidity < 50) tips.push('dry air — extra moisturizer recommended')
  else if (humidity > 75) tips.push('high humidity — lightweight non-comedogenic products preferred')

  if (weatherMain === 'Clear') tips.push('sunny — SPF 30+ essential')
  else if (weatherMain === 'Rain') tips.push('rain — focus on hydration and gentle cleansing')
  else if (['Snow','Sleet'].includes(weatherMain)) tips.push('snow — protective barrier cream recommended')
  else if (['Mist','Fog','Haze','Smoke'].includes(weatherMain)) tips.push('pollution/fog — antioxidant serum and thorough cleansing recommended')

  if (season === 'Summer')      tips.push('summer — sun protection and oil control priority')
  else if (season === 'Winter') tips.push('winter — intense moisturizing and barrier repair important')
  else if (season === 'Spring') tips.push('spring — gentle exfoliation beneficial')
  else if (season === 'Autumn') tips.push('autumn — richer products, repair sun damage')

  return tips.length > 0 ? tips : ['moderate conditions — standard routine appropriate']
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5)  return 'Spring'
  if (month >= 6 && month <= 8)  return 'Summer'
  if (month >= 9 && month <= 11) return 'Autumn'
  return 'Winter'
}

module.exports = { getWeatherContext }