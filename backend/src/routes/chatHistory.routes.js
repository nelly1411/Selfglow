const express        = require('express')
const router         = express.Router()
const prisma         = require('../config/prisma')
const authMiddleware = require('../middleware/authMiddleware')

// ── GET /api/chat-history ─────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where:   { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      take:    50,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    return res.json(conversations.map(c => ({
      id:        c.id,
      title:     c.title,
      updatedAt: c.updatedAt,
      messages:  c.messages.map(m => ({
        id:        m.id,
        role:      m.role,
        content:   m.content,
        imageData: m.imageData || null,
        products:  (() => { try { return m.products ? JSON.parse(m.products) : [] } catch { return [] } })(),
        createdAt: m.createdAt,
      })),
    })))
  } catch (err) {
    console.error('Chat-History-Fehler:', err)
    return res.status(500).json({ error: 'Fehler beim Laden der Chats' })
  }
})

// ── POST /api/chat-history ────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { id, title, messages } = req.body

  if (!id || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'id und messages sind erforderlich' })
  }

  // createdAt: Basiszeit weit in der Vergangenheit + Index * 1 Sekunde
  // Damit ist die Reihenfolge stabil über mehrere Saves hinweg
  const BASE_TIME = new Date('2020-01-01').getTime()
  const msgData = messages.map((m, index) => ({
    role:      m.role,
    content:   m.content,
    imageData: m.imageData || null,
    products:  m.products && m.products.length > 0 ? JSON.stringify(m.products) : null,
    createdAt: new Date(BASE_TIME + index * 1000),
  }))

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({ where: { id } })

      if (existing) {
        if (existing.userId !== req.user.userId) throw new Error('FORBIDDEN')
        await tx.chatMessage.deleteMany({ where: { conversationId: id } })
        await tx.conversation.update({
          where: { id },
          data:  { title: title || 'Neue Beratung', messages: { create: msgData } },
        })
      } else {
        await tx.conversation.create({
          data: {
            id,
            userId:   req.user.userId,
            title:    title || 'Neue Beratung',
            messages: { create: msgData },
          },
        })
      }
    })

    return res.json({ id })
  } catch (err) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Kein Zugriff' })
    if (err.code === 'P2002') return res.json({ id })
    console.error('Chat-Save-Fehler:', err.message)
    return res.status(500).json({ error: 'Fehler beim Speichern' })
  }
})

// ── DELETE /api/chat-history/:id ─────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (!conversation || conversation.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Konversation nicht gefunden' })
    }
    await prisma.conversation.delete({ where: { id } })
    return res.json({ ok: true })
  } catch (err) {
    console.error('Delete-Fehler:', err)
    return res.status(500).json({ error: 'Fehler beim Löschen' })
  }
})

module.exports = router