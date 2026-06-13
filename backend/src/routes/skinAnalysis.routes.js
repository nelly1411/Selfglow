const express        = require('express')
const router         = express.Router()
const prisma         = require('../config/prisma')
const authMiddleware = require('../middleware/authMiddleware')
const {
  captureSkinAnalysisProfileFacts,
} = require('../services/user-skin-profile.service')


const { refreshUserProfileEmbedding } = require("../services/user-profile-embedding.service");

// ── POST /api/skin-analysis/analyze ──────────────────────────────────────────
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
  "multipleFaces": true oder false (true wenn mehr als ein Gesicht im Bild erkennbar ist),
  "tips": ["Tipp 1", "Tipp 2", "Tipp 3"],
  "products": [
    {"name": "Produktname", "category": "Serum|Feuchtigkeitspflege|Toner|Reinigung|Sonnenschutz", "reason": "Kurze Begründung"},
    {"name": "Produktname", "category": "Kategorie", "reason": "Begründung"},
    {"name": "Produktname", "category": "Kategorie", "reason": "Begründung"}
  ]
}

Wenn mehrere Gesichter im Bild sind, setze "multipleFaces": true und analysiere NUR das prominenteste/größte Gesicht im Vordergrund.
Nur wenn überhaupt kein Mensch erkennbar ist, gib zurück: {"error": "Kein Gesicht erkennbar"}`

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

// ── POST /api/skin-analysis/glow ─────────────────────────────────────────────
router.post('/glow', async (req, res) => {
  try {
    const { imageData } = req.body
    if (!imageData) return res.status(400).json({ error: 'Kein Bild übermittelt' })

    // Person beschreiben lassen
    const descResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:      'gpt-4o',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageData } },
            { type: 'text', text: 'Describe this person briefly for image generation: gender, approximate age, hair color and style, skin tone, eye color if visible. Only objective facts, max 2 sentences, do NOT mention any skin problems.' },
          ],
        }],
      }),
    })

    let personDesc = 'a person'
    if (descResponse.ok) {
      const descData = await descResponse.json()
      personDesc = descData.choices?.[0]?.message?.content?.trim() || 'a person'
    }

    console.log('[Glow] Person-Beschreibung:', personDesc)

    // gpt-image-1 — kein response_format Parameter
    const glowResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:   'gpt-image-1',
        prompt:  `Portrait photo of ${personDesc}, with perfectly clear, smooth, radiant, glowing skin. No blemishes, no acne, no redness, no dark spots. Natural healthy glow. Realistic photography, soft natural lighting.`,
        n:       1,
        size:    '1024x1024',
        quality: 'medium',
      }),
    })

    if (!glowResponse.ok) {
      const errData = await glowResponse.json().catch(() => ({}))
      console.error('[Glow] Fehler:', errData)
      return res.status(500).json({ error: 'Bildgenerierung fehlgeschlagen: ' + (errData.error?.message || glowResponse.status) })
    }

    const glowData = await glowResponse.json()
    console.log('[Glow] Response keys:', Object.keys(glowData))
    
    const b64 = glowData.data?.[0]?.b64_json
    if (!b64) {
      console.error('[Glow] Kein b64_json:', JSON.stringify(glowData).slice(0, 200))
      return res.status(500).json({ error: 'Kein Bild erhalten' })
    }

    return res.json({ imageData: `data:image/png;base64,${b64}` })

  } catch (err) {
    console.error('[Glow] Fehler:', err)
    return res.status(500).json({ error: 'Fehler bei der Bildgenerierung: ' + err.message })
  }
})

// ── POST /api/skin-analysis/save ─────────────────────────────────────────────
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { skinType, dryness, redness, blemishes, sensitivity, overall, tips, products } = req.body

    if (!skinType) {
      return res.status(400).json({ error: 'skinType fehlt' })
    }

    const analysis = await prisma.skinAnalysis.create({
      data: {
        userId:      req.user.userId,
        skinType,
        dryness:     Math.round(dryness     || 0),
        redness:     Math.round(redness     || 0),
        blemishes:   Math.round(blemishes   || 0),
        sensitivity: Math.round(sensitivity || 0),
        overall:     overall   || '',
        tips:        JSON.stringify(tips     || []),
        products:    JSON.stringify(products || []),
      }
    })

    const capturedProfile = await captureSkinAnalysisProfileFacts(req.user.userId, analysis)
    if (capturedProfile.facts.length > 0 || capturedProfile.skinType) {
      await refreshUserProfileEmbedding(req.user.userId)
    }

    return res.json({ analysis })
  } catch (err) {
    console.error('Save-Fehler:', err)
    return res.status(500).json({ error: 'Fehler beim Speichern der Analyse' })
  }
})

// ── GET /api/skin-analysis/history ───────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const analyses = await prisma.skinAnalysis.findMany({
      where:   { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    })

    return res.json(
      analyses.map(a => ({
        ...a,
        tips:     JSON.parse(a.tips     || '[]'),
        products: JSON.parse(a.products || '[]'),
      }))
    )
  } catch (err) {
    console.error('History-Fehler:', err)
    return res.status(500).json({ error: 'Fehler beim Laden der Analysen' })
  }
})

// ── DELETE /api/skin-analysis/:id ────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    const analysis = await prisma.skinAnalysis.findUnique({ where: { id } })
    if (!analysis || analysis.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Analyse nicht gefunden' })
    }

    await prisma.skinAnalysis.delete({ where: { id } })
    await refreshUserProfileEmbedding(req.user.userId)
    return res.json({ message: 'Analyse gelöscht' })
  } catch (err) {
    console.error('Delete-Fehler:', err)
    return res.status(500).json({ error: 'Fehler beim Löschen' })
  }
})

module.exports = router
