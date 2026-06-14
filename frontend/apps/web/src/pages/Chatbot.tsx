import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Camera, MessageCircle, Plus, Send, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { apiUrl } from '@/lib/api'
import { cn } from '@workspace/ui/lib/utils'
import SkinAnalysis from '@/pages/SkinAnalysis'
import { useChat, initialMessages, type Message, type ChatProduct } from '@/context/ChatContext'
import { useAuth } from '@/context/AuthContext'

type ChatResponseData = {
  answer: string
  products?: ChatProduct[]
  canExplainProducts?: boolean
}

type WeatherData = {
  summary?: string
  temp?: number
  humidity?: number
  weatherMain?: string
  season?: string
  promptContext?: string
}

type ProfileContextFact = {
  key: string
  value: string
}

type ProfileContextProduct = {
  id: number
  name: string
  brand: string
  category: string
  quantity?: number
}

type ProfileContext = {
  skinType?: string | null
  gender?: string | null
  facts: ProfileContextFact[]
  cart: ProfileContextProduct[]
  wishlist: ProfileContextProduct[]
}

type StarterQuestion = {
  label: string
  message: string
  contextProductIds?: number[]
}

function getWeatherEmoji(weatherMain?: string, temp?: number): string {
  if (!weatherMain) return '🌡️'
  const w = weatherMain.toLowerCase()
  if (w === 'clear') return temp && temp >= 25 ? '☀️' : '🌤️'
  if (w === 'clouds') return '☁️'
  if (w === 'rain' || w === 'drizzle') return '🌧️'
  if (w === 'thunderstorm') return '⛈️'
  if (w === 'snow') return '❄️'
  if (w === 'mist' || w === 'fog' || w === 'haze') return '🌫️'
  return '🌡️'
}

/*function getWeatherMessage(weather: WeatherData): string {
  const emoji = getWeatherEmoji(weather.weatherMain, weather.temp)
  const temp = weather.temp !== undefined ? `${weather.temp}°C` : ''
  const humidity = weather.humidity !== undefined ? `${weather.humidity}% Luftfeuchtigkeit` : ''
  return [emoji, temp, humidity].filter(Boolean).join(' · ')
}*/

function getWeatherRecommendationPrompt(weather: WeatherData): string {
  const emoji = getWeatherEmoji(weather.weatherMain, weather.temp)
  return `${emoji} Es ist ${weather.temp !== undefined ? weather.temp + '°C' : 'aktuell'} und ${weather.weatherMain?.toLowerCase() || 'bewölkt'} bei ${weather.humidity ?? '?'}% Luftfeuchtigkeit. Welche Hautpflegeprodukte empfiehlst du mir für dieses Wetter?`
}

const skinTypeLabels: Record<string, string> = {
  Normal: 'normale Haut',
  Oily: 'fettige Haut',
  Dry: 'trockene Haut',
  Sensitive: 'sensible Haut',
  Combination: 'Mischhaut',
}

const profileFactLabels: Record<string, string> = {
  acne: 'Unreinheiten',
  blemishes: 'Unreinheiten',
  redness: 'Rötungen',
  pores: 'großen Poren',
  dark_spots: 'Pigmentflecken',
  balanced: 'ausgeglichener Haut',
  oily: 'fettiger Haut',
  oily_t_zone: 'öliger T-Zone',
  shine: 'Glanz',
  dryness: 'Trockenheit',
  dehydration: 'feuchtigkeitsarmer Haut',
  tightness: 'Spannungsgefühl',
  flakiness: 'schuppiger Haut',
  rough_texture: 'rauer Hauttextur',
  refined_pores: 'feinen Poren',
  clear_skin: 'wenigen Unreinheiten',
  matte: 'matter Haut',
  combination_zones: 'Mischhaut-Zonen',
  sensitive: 'sensibler Haut',
  tolerant: 'robuster Haut',
  fragrance: 'Parfum',
  alcohol: 'Alkohol',
  fragrance_free: 'parfumfreie Pflege',
  alcohol_free: 'alkoholfreie Pflege',
  vegan: 'vegane Produkte',
  non_comedogenic: 'nicht komedogene Produkte',
  oil_free: 'ölfreie Produkte',
  cruelty_free: 'tierversuchsfreie Produkte',
  natural_ingredients: 'natürliche Inhaltsstoffe',
  light_texture: 'leichte Texturen',
  rich_texture: 'reichhaltige Texturen',
}

function formatProfileFact(value: string) {
  return profileFactLabels[value] || value.replace(/_/g, ' ')
}

function compactProductName(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > 22 ? `${text.slice(0, 22)}...` : text
}

function getFactValues(profileContext: ProfileContext | null, keys: string[]) {
  return (profileContext?.facts || [])
    .filter((fact) => keys.includes(fact.key))
    .map((fact) => fact.value)
    .filter(Boolean)
}

function buildPersonalizedStarterQuestions(
  userSkinType?: string | null,
  weather?: WeatherData | null,
  profileContext?: ProfileContext | null
) {
  const profileSkinType = profileContext?.skinType || userSkinType
  const questions: StarterQuestion[] = []
  const concerns = getFactValues(profileContext || null, ['concern', 'skin_state'])
  const preferences = getFactValues(profileContext || null, ['preference'])
  const avoidances = getFactValues(profileContext || null, ['ingredient_avoidance', 'allergy'])
  const cartProduct = profileContext?.cart?.[0]
  const wishlistProduct = profileContext?.wishlist?.[0]
  const effectiveSkinLabel = profileSkinType ? skinTypeLabels[profileSkinType] || `${profileSkinType} Haut` : null

  if (cartProduct && effectiveSkinLabel) {
    questions.push({
      label: `Passt ${compactProductName(cartProduct.name)}?`,
      message: `Passt ${cartProduct.name} zu ${effectiveSkinLabel}? Bitte prüfe Inhaltsstoffe, Hauttyp und Anwendung.`,
      contextProductIds: [cartProduct.id],
    })
  } else if (cartProduct) {
    questions.push({
      label: `${compactProductName(cartProduct.name)} anwenden`,
      message: `Wie wende ich ${cartProduct.name} sinnvoll in meiner Routine an?`,
      contextProductIds: [cartProduct.id],
    })
  } else if (effectiveSkinLabel) {
    questions.push({
      label: `Produkte für ${effectiveSkinLabel}`,
      message: `Welche Produkte passen zu ${effectiveSkinLabel}?`,
    })
  }

  if (concerns.length > 0) {
    questions.push({
      label: `Routine gegen ${formatProfileFact(concerns[0])}`,
      message: `Welche Routine hilft bei ${formatProfileFact(concerns[0])}?`,
    })
  } else if (avoidances.length > 0) {
    questions.push({
      label: `Produkte ohne ${formatProfileFact(avoidances[0])}`,
      message: `Welche Produkte passen, wenn ich ${formatProfileFact(avoidances[0])} meiden möchte?`,
    })
  } else if (preferences.length > 0) {
    questions.push({
      label: `${formatProfileFact(preferences[0])}`,
      message: `Welche Produkte passen zu meiner Vorliebe für ${formatProfileFact(preferences[0])}?`,
    })
  } else if (wishlistProduct && effectiveSkinLabel) {
    questions.push({
      label: `Passt ${compactProductName(wishlistProduct.name)}?`,
      message: `Passt ${wishlistProduct.name} zu ${effectiveSkinLabel}? Bitte prüfe Inhaltsstoffe, Hauttyp und Anwendung.`,
      contextProductIds: [wishlistProduct.id],
    })
  } else if (effectiveSkinLabel) {
    if (profileSkinType === 'Oily') {
      questions.push({ label: 'Leichte Routine', message: 'Welche leichte Routine hilft bei fettiger Haut und Unreinheiten?' })
    } else if (profileSkinType === 'Dry') {
      questions.push({ label: 'Mehr Feuchtigkeit', message: 'Welche feuchtigkeitsspendende Routine passt zu trockener Haut?' })
    } else if (profileSkinType === 'Sensitive') {
      questions.push({ label: 'Parfumfreie Pflege', message: 'Welche parfumfreien Produkte sind für sensible Haut geeignet?' })
    } else if (profileSkinType === 'Combination') {
      questions.push({ label: 'Routine für Mischhaut', message: 'Wie kombiniere ich Pflege für ölige und trockene Hautpartien?' })
    } else {
      questions.push({ label: 'Hautbarriere stärken', message: 'Wie kann ich meine Hautbarriere mit einer einfachen Routine unterstützen?' })
    }
  }

  if (questions.length === 0) {
    questions.push({ label: 'Passende Produkte', message: 'Welche Produkte passen zu meinem aktuellen Hautprofil?' })
    questions.push({ label: 'Einfache Routine', message: 'Hilf mir, eine einfache Hautpflegeroutine zusammenzustellen.' })
  }

  if (weather?.temp !== undefined || weather?.humidity !== undefined || weather?.weatherMain) {
    questions.push({ label: 'Wetter-Tipps', message: getWeatherRecommendationPrompt(weather) })
  } else {
    questions.push({ label: 'Morgens oder abends?', message: 'Welche Produkte sollte ich morgens und abends kombinieren?' })
  }

  return questions.slice(0, 3)
}

const medicalDisclaimer = 'hinweis: dies ist keine medizinische diagnose.'
const legacyMedicalDisclaimer = 'Das ist keine medizinische Diagnose, sondern eine Produktempfehlung auf Basis deiner Anfrage.'

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function renderMessageContent(message: Message) {
  if (message.role !== 'assistant') return renderStructuredText(message.content)
  const hasNew = message.content.toLowerCase().includes(medicalDisclaimer)
  const hasLegacy = message.content.includes(legacyMedicalDisclaimer)
  if (!hasNew && !hasLegacy) return renderStructuredText(message.content)
  const main = message.content.replace(new RegExp(medicalDisclaimer, 'i'), '').replace(legacyMedicalDisclaimer, '').trim()
  return (
    <>
      {main && renderStructuredText(main)}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">{medicalDisclaimer}</p>
    </>
  )
}

function renderInlineText(text: string) {
  const match = text.match(/^\*\*(.+)\*\*$/)
  if (match) return <span className="font-semibold">{match[1]}</span>
  return text
}

function renderStructuredText(content: string) {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) return content
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line === '---') return <hr key={i} className="border-border" />
        if (line.startsWith('- ')) return (
          <div key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A574]" />
            <span>{renderInlineText(line.slice(2))}</span>
          </div>
        )
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="pt-1 font-semibold">{renderInlineText(line)}</p>
        return <p key={i}>{renderInlineText(line)}</p>
      })}
    </div>
  )
}

function parseSseEvent(eventText: string) {
  const eventType = eventText.split('\n').find((l) => l.startsWith('event:'))?.slice(6).trim()
  const dataText = eventText.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n')
  if (!eventType || !dataText) return null
  try {
    return { event: eventType, data: JSON.parse(dataText) as { text?: string } & ChatResponseData & { message?: string } }
  } catch { return null }
}

function getLatestRecommendedProductIds(messages: Message[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.products?.length) return m.products.slice(0, 3).map((p) => p.id)
  }
  return []
}

function HistoryDivider() {
  return (
    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-[#E8D5C0]" />
      <span>Chatverlauf -</span>
      <span className="h-px flex-1 bg-[#E8D5C0]" />
    </div>
  )
}

export default function Chatbot() {
  const {
    chatState, setChatState,
    activeConversation,
    input, setInput,
    startNewConversation: startNewConversationCtx,
    selectConversation: selectConversationCtx,
    deleteConversation: deleteConversationCtx,
    applyMessages,
    saveConversationToDb,
    isLoadingHistory,
    weather,
  } = useChat()
  const { token, user } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [explainingMessageId, setExplainingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [isGeneratingGlow] = useState(false)
  const [glowLoadingForMsg, setGlowLoadingForMsg] = useState<string | null>(null)
  const [glowSources, setGlowSources] = useState<Record<string, string>>({})
  const [weatherAnimation, setWeatherAnimation] = useState<string | null>(null)
  const [profileContext, setProfileContext] = useState<ProfileContext | null>(null)
  const [reopenedConversationId, setReopenedConversationId] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)

  const messages = activeConversation?.messages ?? initialMessages
  const personalizedStarterQuestions = buildPersonalizedStarterQuestions(user?.skinType, weather as WeatherData | null, profileContext)

  async function refreshProfileContext() {
    if (!token) {
      setProfileContext(null)
      return
    }

    try {
      const response = await fetch(apiUrl('/api/auth/profile-context'), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        setProfileContext(null)
        return
      }

      setProfileContext(await response.json())
    } catch (err) {
      console.error(err)
      setProfileContext(null)
    }
  }

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, isLoading, explainingMessageId, isGeneratingGlow])

  useEffect(() => {
    refreshProfileContext()
  }, [token])

  function updateUiOnly(conversationId: string, updater: (msgs: Message[]) => Message[]) {
    setChatState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id !== conversationId ? c : { ...c, messages: updater(c.messages) }
      ),
    }))
  }

  function startNewConversation() {
    if (isLoading) return
    setReopenedConversationId(null)
    startNewConversationCtx()
    setError(null)
  }

  function selectConversation(id: string) {
    if (isLoading) return
    setReopenedConversationId(id)
    selectConversationCtx(id)
    setError(null)
  }

  function deleteConversation(id: string) {
    if (isLoading) return
    if (reopenedConversationId === id) setReopenedConversationId(null)
    deleteConversationCtx(id)
    setError(null)
  }

  async function generateGlowImage(imageData: string, conversationId: string, triggerMsgId: string) {
    setGlowLoadingForMsg(triggerMsgId)
    try {
      const res = await fetch(apiUrl('/api/skin-analysis/glow'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data.imageData) return

      const glowMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '✨ So könnte deine Haut aussehen, wenn du deine Pflegeroutine konsequent durchziehst — rein, strahlend und gesund. Du schaffst das! 💪',
        imageUrl: data.imageData,
      }
      const updated = applyMessages(conversationId, (msgs) => [...msgs, glowMsg])
      if (updated) saveConversationToDb(updated)
    } catch {
      // optional
    } finally {
      setGlowLoadingForMsg(null)
    }
  }

  async function sendMessage(messageText: string, extraContextProductIds: number[] = []) {
    const trimmed = messageText.trim()
    if (!trimmed || isLoading) return

    const conversationId = chatState.activeConversationId
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: Message = { id: assistantMessageId, role: 'assistant', content: '' }

    const chatHistory = [...messages, userMessage].slice(-4).map((m) => ({ role: m.role, content: m.content }))
    const contextProductIds = Array.from(new Set([
      ...extraContextProductIds,
      ...getLatestRecommendedProductIds(messages),
    ])).slice(0, 3)

    updateUiOnly(conversationId, (msgs) => [...msgs, userMessage, assistantMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(apiUrl('/api/chat/stream'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed, history: chatHistory, contextProductIds, weather }),
      })
      if (!response.ok) throw new Error('Die KI-Beratung konnte gerade nicht antworten.')
      if (!response.body) throw new Error('Streaming nicht unterstützt.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalAnswer = ''
      let finalProducts: ChatProduct[] = []
      let finalCanExplain = false

      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventText of events) {
          const parsed = parseSseEvent(eventText)
          if (!parsed) continue

          if (parsed.event === 'delta' && parsed.data.text) {
            updateUiOnly(conversationId, (msgs) =>
              msgs.map((m) => m.id === assistantMessageId ? { ...m, content: m.content + parsed.data.text! } : m)
            )
          }

          if (parsed.event === 'done') {
            finalAnswer = parsed.data.answer ?? ''
            finalProducts = parsed.data.products ?? []
            finalCanExplain = parsed.data.canExplainProducts ?? false
          }

          if (parsed.event === 'error') throw new Error(parsed.data.message ?? 'Fehler beim Streamen.')
        }
        if (done) break
      }

      const updated = applyMessages(conversationId, (msgs) =>
        msgs.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: finalAnswer || m.content, products: finalProducts, canExplainProducts: finalCanExplain }
            : m
        )
      )
      if (updated) saveConversationToDb(updated)
      await refreshProfileContext()

    } catch (err) {
      console.error(err)
      updateUiOnly(conversationId, (msgs) =>
        msgs.filter((m) => m.id !== assistantMessageId || m.content.trim().length > 0)
      )
      setError('Die KI-Beratung ist gerade nicht erreichbar. Bitte versuche es gleich nochmal.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    sendMessage(input)
  }

  async function explainProduct(message: Message, product: ChatProduct) {
    if (explainingMessageId || isLoading || !activeConversation) return
    const conversationId = activeConversation.id
    const explanationId = `${message.id}-${product.id}`
    const lastUserMessage = messages
      .slice(0, messages.findIndex((m) => m.id === message.id))
      .reverse().find((m) => m.role === 'user')

    setExplainingMessageId(explanationId)
    setError(null)

    try {
      const res = await fetch(apiUrl('/api/chat/explain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [product.id], message: lastUserMessage?.content ?? message.content }),
      })
      if (!res.ok) throw new Error()
      const data: { answer: string } = await res.json()

      const updated = applyMessages(conversationId, (msgs) => [
        ...msgs,
        { id: crypto.randomUUID(), role: 'assistant', content: data.answer },
      ])
      if (updated) saveConversationToDb(updated)
    } catch {
      setError('Die KI-Erklärung ist gerade nicht erreichbar. Bitte versuche es gleich nochmal.')
    } finally {
      setExplainingMessageId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#FBFAF7]">
      {conversationToDelete && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Chat löschen?</h2>
            <p className="mb-8 text-muted-foreground">Möchtest du diesen Chatverlauf wirklich löschen?</p>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setConversationToDelete(null)}
                className="flex-1 rounded-full border-border py-3 text-muted-foreground hover:bg-gray-50">
                Abbrechen
              </Button>
              <Button type="button"
                onClick={() => { deleteConversation(conversationToDelete!); setConversationToDelete(null) }}
                className="flex-1 rounded-full bg-[#D4A574] py-3 text-white hover:bg-[#C49464]">
                Löschen
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAnalysis && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAnalysis(false) }}
        >
          <div style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <SkinAnalysis
              onClose={() => setShowAnalysis(false)}
              onAnalysisComplete={(result, imageData) => {
                const hint = (result as any).multipleFaces
                  ? '\n\n⚠️ Im Bild wurden mehrere Gesichter erkannt. Für eine genaue Analyse empfehle ich ein einzelnes Foto von dir.'
                  : ''
                const assistantContent = `Hautanalyse abgeschlossen ✨\n\n**Hauttyp:** ${result.skinType}\n\nTrockenheit: ${result.dryness}% · Rötungen: ${result.redness}% · Unreinheiten: ${result.blemishes}% · Sensibilität: ${result.sensitivity}%\n\n${result.overall}${hint}\n\nDu kannst mir jetzt Fragen zu deiner Hautanalyse stellen oder ein weiteres Bild hochladen.`
                const assistantMsgId = crypto.randomUUID()
                const isRealPhoto = imageData && imageData.startsWith('data:image')
                const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: '📸 Hautanalyse gestartet', imageUrl: imageData ?? null }
                // glowSourceUrl in content verstecken damit Button es nutzen kann
                const assistantMsg: Message = {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: assistantContent,
                  // imageUrl missbrauchen wir nicht — stattdessen speichern wir das Quellbild separat
                }
                const conversationId = chatState.activeConversationId
                const updated = applyMessages(conversationId, (msgs) => [...msgs, userMsg, assistantMsg])
                if (updated) saveConversationToDb(updated)
                setShowAnalysis(false)
                // Quellbild für Glow-Button im State merken (msgId → imageData)
                if (isRealPhoto) {
                  setGlowSources(prev => ({ ...prev, [assistantMsgId]: imageData! }))
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-6xl px-4 pb-5 lg:pb-6">
        <div className="sticky top-0 z-20 mb-4 flex items-center gap-3 bg-[#FBFAF7] py-4 lg:py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5E6D3]">
            <Sparkles className="h-4 w-4 text-[#A97745]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">KI-Beratung</h1>
            <p className="text-xs text-muted-foreground">Produktempfehlungen aus dem SelfGlow Sortiment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="self-start rounded-lg border border-border bg-background p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
            <Button type="button" onClick={startNewConversation} disabled={isLoading}
              className="mb-3 h-9 w-full rounded-full bg-[#D4A574] text-sm text-white hover:bg-[#C49464]">
              <Plus className="mr-2 h-4 w-4" /> Neue Beratung
            </Button>
            <button type="button" onClick={() => setShowAnalysis(true)}
              className="mb-3 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#e0c9a8] bg-[#FDF6EE] text-sm font-medium text-[#A97745] transition-colors hover:bg-[#F5E6D3]">
              <Camera className="h-4 w-4" /> Haut analysieren
            </button>

            {/* ── Wetter-Widget ── */}
            {weather && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  const w = weather as WeatherData
                  setWeatherAnimation(w.weatherMain?.toLowerCase() ?? 'clouds')
                  setTimeout(() => setWeatherAnimation(null), 10000)
                  sendMessage(getWeatherRecommendationPrompt(w))
                }}
                className="mb-3 flex h-9 w-full items-center justify-between gap-2 rounded-full border border-[#e0c9a8] bg-[#FDF6EE] px-4 text-sm font-medium text-[#A97745] transition-colors hover:bg-[#F5E6D3] disabled:opacity-60"
              >
                <span>🌤️ Wetter-Tipps</span>
                <span className="text-xs opacity-70">→</span>
              </button>
            )}

            <h2 className="mb-3 text-sm font-semibold text-foreground">Chatverlauf</h2>
            {isLoadingHistory && <p className="mb-2 text-xs text-muted-foreground">Chats werden geladen...</p>}
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-18rem)]">
              {chatState.conversations.map((conversation) => {
                const isActive = conversation.id === chatState.activeConversationId
                return (
                  <div key={conversation.id}
                    className={cn('group flex w-full items-start gap-1 rounded-lg border p-1.5 transition-colors',
                      isActive ? 'border-[#D4A574] bg-[#FBFAF7]' : 'border-border hover:border-[#D4A574] hover:bg-[#FBFAF7]')}>
                    <button type="button" onClick={() => selectConversation(conversation.id)} disabled={isLoading}
                      className="min-w-0 flex-1 rounded-md px-1 py-1 text-left disabled:cursor-not-allowed disabled:opacity-60">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#A97745]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{conversation.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatConversationDate(conversation.updatedAt)}</p>
                        </div>
                      </div>
                    </button>
                    <button type="button" onClick={() => setConversationToDelete(conversation.id)} disabled={isLoading}
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label="Chat löschen">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>

          <main className="space-y-4">
            <section className="relative flex h-[75vh] flex-col rounded-lg border border-border bg-background overflow-hidden">
              {/* ── Wetter-Animation ── */}
              {weatherAnimation && (
                <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg">
                  {weatherAnimation === 'clear' && (
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-yellow-100/60 via-orange-50/40 to-transparent">
                      <div className="absolute left-1/2 top-4 h-16 w-16 -translate-x-1/2 rounded-full bg-yellow-300/70 blur-xl animate-ping" />
                      <div className="absolute left-1/2 top-2 h-24 w-24 -translate-x-1/2 rounded-full bg-yellow-200/50 blur-2xl" />
                      {['10%','25%','40%','60%','75%','90%'].map((l, i) => (
                        <div key={i} className="absolute top-8 h-1 w-1 rounded-full bg-yellow-400/80"
                          style={{ left: l, animation: `ping ${1 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`, animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  )}
                  {(weatherAnimation === 'clouds' || weatherAnimation === 'overcast') && (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-200/50 to-transparent">
                      {[
                        { w: '120px', h: '40px', top: '8%',  left: '-10%',  dur: '8s',  delay: '0s' },
                        { w: '160px', h: '50px', top: '15%', left: '-20%',  dur: '12s', delay: '1s' },
                        { w: '100px', h: '35px', top: '5%',  left: '-15%',  dur: '10s', delay: '2s' },
                        { w: '140px', h: '45px', top: '20%', left: '-25%',  dur: '9s',  delay: '0.5s' },
                        { w: '180px', h: '55px', top: '3%',  left: '-30%',  dur: '14s', delay: '3s' },
                      ].map((c, i) => (
                        <div key={i} className="absolute rounded-full bg-white/70 blur-sm"
                          style={{ width: c.w, height: c.h, top: c.top, left: c.left,
                            animation: `slideRight ${c.dur} linear infinite`, animationDelay: c.delay }} />
                      ))}
                    </div>
                  )}
                  {(weatherAnimation === 'rain' || weatherAnimation === 'drizzle') && (
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-200/30 to-transparent">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="absolute w-px bg-blue-400/60 rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            height: `${8 + Math.random() * 12}px`,
                            top: '-10px',
                            animation: `rainfall ${0.6 + Math.random() * 0.8}s linear infinite`,
                            animationDelay: `${Math.random() * 1}s`,
                          }} />
                      ))}
                    </div>
                  )}
                  {weatherAnimation === 'snow' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 to-transparent">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="absolute text-white/80 text-sm select-none"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: '-20px',
                            animation: `snowfall ${2 + Math.random() * 3}s linear infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                          }}>❄️</div>
                      ))}
                    </div>
                  )}
                  {(weatherAnimation === 'mist' || weatherAnimation === 'fog' || weatherAnimation === 'haze') && (
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-300/40 via-gray-200/20 to-transparent animate-pulse" />
                  )}
                  {weatherAnimation === 'thunderstorm' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 to-transparent">
                      <div className="absolute left-1/2 top-0 text-4xl -translate-x-1/2 animate-bounce">⚡</div>
                    </div>
                  )}
                  {/* CSS für Animationen */}
                  <style>{`
                    @keyframes slideRight { from { transform: translateX(0); } to { transform: translateX(110vw); } }
                    @keyframes rainfall { from { transform: translateY(-10px); } to { transform: translateY(100vh); } }
                    @keyframes snowfall { from { transform: translateY(-20px) rotate(0deg); } to { transform: translateY(100vh) rotate(360deg); } }
                  `}</style>
                </div>
              )}
              <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {message.role === 'assistant' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                          <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                        </div>
                      )}
                      <div className={cn('max-w-[min(620px,85%)] rounded-lg px-3 py-2 text-sm leading-relaxed',
                        message.role === 'user' ? 'bg-[#D4A574] text-white' : 'bg-[#F5F5F5] text-foreground')}>
                        {message.imageUrl && (
                          <img src={message.imageUrl} alt="Bild" className="mb-2 max-h-48 w-auto rounded-md object-cover" />
                        )}
                        {message.role === 'assistant' && message.content.trim().length === 0
                          ? <span className="text-muted-foreground">Denke nach...</span>
                          : renderMessageContent(message)}
                      </div>
                      {message.role === 'user' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground">
                          <User className="h-3.5 w-3.5 text-background" />
                        </div>
                      )}
                    </div>

                    {/* Glow-Button: erscheint nach Hautanalyse-Nachrichten */}
                    {message.role === 'assistant' && glowSources[message.id] && (
                      <div className="ml-9 mt-1">
                        {glowLoadingForMsg === message.id ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#A97745]" />
                            ✨ Erstelle dein Glow-Bild...
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => generateGlowImage(glowSources[message.id], chatState.activeConversationId, message.id)}
                            disabled={glowLoadingForMsg !== null}
                            className="flex items-center gap-2 rounded-full border border-[#e0c9a8] bg-[#FDF6EE] px-4 py-2 text-sm font-medium text-[#A97745] transition-colors hover:bg-[#F5E6D3] disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            ✨ Zeig mir meine Glow-Haut
                          </button>
                        )}
                      </div>
                    )}

                    {message.products && message.products.length > 0 && (
                      <div className="ml-9 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {message.products.slice(0, 3).map((product) => (
                          <div key={product.id} className="overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md">
                            <Link to={`/product/${product.id}?from=chatbot`} className="group block">
                              <div className="flex gap-2 p-2">
                                <img src={product.imageUrl || 'https://placehold.co/120x120?text=Kein+Bild'} alt={product.name}
                                  className="h-16 w-16 shrink-0 rounded-md bg-[#F5F5F5] object-cover" />
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">{product.category}</p>
                                  <h3 className="line-clamp-2 text-sm font-medium group-hover:text-[#D4A574]">{product.name}</h3>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>
                                  <p className="mt-1 text-sm font-semibold">€{product.price.toFixed(2)}</p>
                                  {product.recommendationBullets && product.recommendationBullets.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {product.recommendationBullets.slice(0, 4).map((b) => (
                                        <span key={b} className="rounded-full bg-[#FDF7F0] px-2 py-0.5 text-[11px] leading-4 text-[#7A5A3A]">{b}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                            {message.canExplainProducts && (
                              <div className="border-t border-border px-2 py-2">
                                <Button type="button" variant="outline"
                                  onClick={() => explainProduct(message, product)}
                                  disabled={Boolean(explainingMessageId) || isLoading}
                                  className="h-8 w-full rounded-full border-[#E8D5C0] px-3 text-xs text-[#A97745] hover:bg-[#FDF7F0]">
                                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                  {explainingMessageId === `${message.id}-${product.id}` ? 'KI erklärt...' : 'Von KI erklären lassen'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {reopenedConversationId === chatState.activeConversationId && messages.length > 0 && (
                  <HistoryDivider />
                )}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                      <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                    </div>
                    <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-muted-foreground">Denke nach...</div>
                  </div>
                )}



                {explainingMessageId && !isLoading && (
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                      <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                    </div>
                    <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-muted-foreground">KI erklärt das Produkt...</div>
                  </div>
                )}
              </div>

              {error && <div className="border-t border-border px-3 py-2 text-sm text-red-600 md:px-4">{error}</div>}

              <form onSubmit={handleSubmit} className="border-t border-border p-3 md:p-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAnalysis(true)} title="Haut analysieren"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e0c9a8] bg-[#FDF6EE] text-[#A97745] transition-colors hover:bg-[#F5E6D3]">
                    <Camera className="h-4 w-4" />
                  </button>
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Frag nach Hauttyp, Anliegen oder Produktwunsch..."
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-[#D4A574]"
                    disabled={isLoading} />
                  <Button type="submit" disabled={isLoading || input.trim().length === 0}
                    className="h-10 w-10 shrink-0 rounded-full bg-[#D4A574] p-0 text-white hover:bg-[#C49464]"
                    aria-label="Nachricht senden">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </section>

            <section className="rounded-lg border border-border bg-background p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Schnell starten</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {personalizedStarterQuestions.map((q) => (
                  <button key={q.label} type="button" onClick={() => sendMessage(q.message, q.contextProductIds || [])} disabled={isLoading}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-[#D4A574] hover:bg-[#FBFAF7] disabled:cursor-not-allowed disabled:opacity-60">
                    {q.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Die Beratung nutzt Produktdaten aus dem Sortiment und ersetzt keine medizinische Beratung.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
