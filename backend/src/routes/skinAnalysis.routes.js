const express = require('express')
const router  = express.Router()

router.post('/analyze', async (req, res) => {
  try {
    const { imageData, mediaType } = req.body

    if (!imageData) {
      return res.status(400).json({ error: 'Kein Bild übermittelt' })
    }

    const prompt = `Du bist ein Hautpflege-Experte. Analysiere dieses Bild für eine Hautpflege-Beratung. Auch wenn das Gesicht nicht perfekt zentriert oder beleuchtet ist, führe die Analyse durch. Nur wenn überhaupt kein Mensch im Bild erkennbar ist, gib einen Fehler zurück.

Antworte NUR mit einem validen JSON-Objekt ohne Markdown-Backticks:
{
  "skinType": "Normal|Oily|Dry|Combination|Sensitive",
  "dryness": 0-100,
  "redness": 0-100,
  "blemishes": 0-100,
  "sensitivity": 0-100,
  "overall": "Ein Satz der den Hautzustand zusammenfasst",
  "tips": ["Tipp 1", "Tipp 2", "Tipp 3"],
  "products": [
    {"name": "Produktname", "category": "Serum|Feuchtigkeitspflege|Toner|Reinigung|Sonnenschutz", "reason": "Kurze Begründung"},
    {"name": "Produktname", "category": "Kategorie", "reason": "Begründung"},
    {"name": "Produktname", "category": "Kategorie", "reason": "Begründung"}
  ]
}

Nur wenn kein Mensch oder Körperteil erkennbar ist, gib zurück: {"error": "Kein Gesicht erkennbar"}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:      'gpt-4o',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageData } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('OpenAI Fehler:', errData)
      return res.status(500).json({ error: 'OpenAI API Fehler: ' + (errData.error?.message || response.status) })
    }

    const data   = await response.json()
    const text   = data.choices?.[0]?.message?.content || ''
    const clean  = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.json(parsed)

  } catch (err) {
    console.error('Analyse-Fehler:', err)
    return res.status(500).json({ error: 'Analyse fehlgeschlagen: ' + err.message })
  }
})

module.exports = router