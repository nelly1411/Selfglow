import { useEffect,  useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Camera, MessageCircle, Plus, Send, Sparkles, Trash2, User, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { apiUrl } from '@/lib/api'
import { cn } from '@workspace/ui/lib/utils'
import SkinAnalysis from '@/pages/SkinAnalysis'

type ChatProduct = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  imageUrl?: string | null
  description?: string | null
  rating?: number | null
  vegan?: boolean
  alcoholFree?: boolean
  fragranceFree?: boolean
  recommendationReason?: string | null
  recommendationBullets?: string[]
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: ChatProduct[]
  canExplainProducts?: boolean
}

type Conversation = {
  id: string
  title: string
  updatedAt: string
  messages: Message[]
}

type ChatState = {
  conversations: Conversation[]
  activeConversationId: string
}

type ChatResponseData = {
  answer: string
  products?: ChatProduct[]
  canExplainProducts?: boolean
}

const starterQuestions = [
  'Ich habe ölige Haut und suche etwas gegen Unreinheiten.',
  'Welche parfumfreien Produkte passen zu empfindlicher Haut?',
  'Ich brauche eine einfache vegane Hautpflegeroutine.',
]

const chatStorageKey = 'selfglow-chatbot-conversations'
const legacyChatStorageKey = 'selfglow-chatbot-messages'
const medicalDisclaimer = 'hinweis: dies ist keine medizinische diagnose.'
const legacyMedicalDisclaimer =
  'Das ist keine medizinische Diagnose, sondern eine Produktempfehlung auf Basis deiner Anfrage.'
const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Hi, ich bin deine SelfGlow KI-Beratung. Sag mir deinen Hauttyp, dein Anliegen oder welche Eigenschaften dir wichtig sind.',
  },
]

function createConversation(messages: Message[] = initialMessages): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'Neue Beratung',
    updatedAt: new Date().toISOString(),
    messages,
  }
}

function getConversationTitle(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user')
  if (!firstUserMessage) return 'Neue Beratung'
  return firstUserMessage.content.length > 42
    ? `${firstUserMessage.content.slice(0, 42)}...`
    : firstUserMessage.content
}

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function loadStoredChatState(): ChatState {
  try {
    const storedState = sessionStorage.getItem(chatStorageKey)
    if (storedState) {
      const parsedState = JSON.parse(storedState) as ChatState
      if (parsedState.conversations?.length && parsedState.activeConversationId) {
        const activeConversationId = parsedState.conversations.some(
          (conversation) => conversation.id === parsedState.activeConversationId
        )
          ? parsedState.activeConversationId
          : parsedState.conversations[0].id
        return { conversations: parsedState.conversations, activeConversationId }
      }
    }
    const legacyMessages = sessionStorage.getItem(legacyChatStorageKey)
    if (legacyMessages) {
      const messages = JSON.parse(legacyMessages) as Message[]
      const conversation = createConversation(messages)
      conversation.title = getConversationTitle(messages)
      return { conversations: [conversation], activeConversationId: conversation.id }
    }
  } catch {
    // Fall back to clean conversation
  }
  const conversation = createConversation()
  return { conversations: [conversation], activeConversationId: conversation.id }
}

function renderMessageContent(message: Message) {
  if (message.role !== 'assistant') {
    return renderStructuredText(message.content)
  }
  const hasNewDisclaimer = message.content.toLowerCase().includes(medicalDisclaimer)
  const hasLegacyDisclaimer = message.content.includes(legacyMedicalDisclaimer)

  if (!hasNewDisclaimer && !hasLegacyDisclaimer) {
    return renderStructuredText(message.content)
  }

  const mainContent = message.content
    .replace(new RegExp(medicalDisclaimer, 'i'), '')
    .replace(legacyMedicalDisclaimer, '')
    .trim()

  return (
    <>
      {mainContent && renderStructuredText(mainContent)}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        {medicalDisclaimer}
      </p>
    </>
  )
}

function renderInlineText(text: string) {
  const match = text.match(/^\*\*(.+)\*\*$/)
  if (match) return <span className="font-semibold">{match[1]}</span>
  return text
}

function renderStructuredText(content: string) {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length <= 1) return content
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        if (line === '---') return <hr key={`${line}-${index}`} className="border-border" />
        if (line.startsWith('- ')) return (
          <div key={`${line}-${index}`} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A574]" />
            <span>{renderInlineText(line.slice(2))}</span>
          </div>
        )
        if (line.startsWith('**') && line.endsWith('**')) return (
          <p key={`${line}-${index}`} className="pt-1 font-semibold">{renderInlineText(line)}</p>
        )
        return <p key={`${line}-${index}`}>{renderInlineText(line)}</p>
      })}
    </div>
  )
}

function parseSseEvent(eventText: string) {
  const eventType = eventText
    .split('\n')
    .find((line) => line.startsWith('event:'))
    ?.slice(6)
    .trim()
  const dataText = eventText
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')

  if (!eventType || !dataText) return null

  return {
    event: eventType,
    data: JSON.parse(dataText) as { text?: string } & ChatResponseData & { message?: string },
  }
}

function getLatestRecommendedProductIds(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message.role === 'assistant' && message.products?.length) {
      return message.products.slice(0, 3).map((product) => product.id)
    }
  }

  return []
}

export default function Chatbot() {
  const [chatState, setChatState] = useState<ChatState>(loadStoredChatState)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [explainingMessageId, setExplainingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false) 
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)

  const activeConversation =
    chatState.conversations.find((c) => c.id === chatState.activeConversationId) ||
    chatState.conversations[0]
  const messages = activeConversation?.messages || initialMessages

  useEffect(() => {
    sessionStorage.setItem(chatStorageKey, JSON.stringify(chatState))
  }, [chatState])

useEffect(() => {
  if (messagesContainerRef.current) {
    messagesContainerRef.current.scrollTop =
      messagesContainerRef.current.scrollHeight
  }
}, [messages, isLoading, explainingMessageId])

  function updateActiveConversation(updater: (messages: Message[]) => Message[]) {
    setChatState((currentState) => ({
      ...currentState,
      conversations: currentState.conversations.map((conversation) => {
        if (conversation.id !== currentState.activeConversationId) return conversation
        const nextMessages = updater(conversation.messages)
        return { ...conversation, title: getConversationTitle(nextMessages), updatedAt: new Date().toISOString(), messages: nextMessages }
      }),
    }))
  }

  function updateConversation(conversationId: string, updater: (messages: Message[]) => Message[]) {
    setChatState((currentState) => ({
      ...currentState,
      conversations: currentState.conversations.map((conversation) => {
        if (conversation.id !== conversationId) return conversation
        const nextMessages = updater(conversation.messages)
        return { ...conversation, title: getConversationTitle(nextMessages), updatedAt: new Date().toISOString(), messages: nextMessages }
      }),
    }))
  }

  function startNewConversation() {
    if (isLoading) return
    const conversation = createConversation()
    setChatState((currentState) => ({ conversations: [conversation, ...currentState.conversations], activeConversationId: conversation.id }))
    setInput('')
    setError(null)
  }

  function selectConversation(conversationId: string) {
    if (isLoading) return
    setChatState((currentState) => ({ ...currentState, activeConversationId: conversationId }))
    setInput('')
    setError(null)
  }

  function deleteConversation(conversationId: string) {
    if (isLoading) return
    setChatState((currentState) => {
      const remainingConversations = currentState.conversations.filter((c) => c.id !== conversationId)
      if (remainingConversations.length === 0) {
        const conversation = createConversation()
        return { conversations: [conversation], activeConversationId: conversation.id }
      }
      const activeConversationId =
        currentState.activeConversationId === conversationId
          ? remainingConversations[0].id
          : currentState.activeConversationId
      return { conversations: remainingConversations, activeConversationId }
    })
    setInput('')
    setError(null)
  }

  async function sendMessage(messageText: string) {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage || isLoading) return

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: trimmedMessage }
    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: Message = { id: assistantMessageId, role: 'assistant', content: '' }
    const chatHistory = [...messages, userMessage].slice(-4).map((message) => ({ role: message.role, content: message.content }))
    const contextProductIds = getLatestRecommendedProductIds(messages)

    updateActiveConversation((currentMessages) => [...currentMessages, userMessage, assistantMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(apiUrl('/api/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage, history: chatHistory, contextProductIds }),
      })
      if (!response.ok) throw new Error('Die KI-Beratung konnte gerade nicht antworten.')
      if (!response.body) throw new Error('Live-Antworten werden von diesem Browser nicht unterstützt.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const eventText of events) {
          const parsedEvent = parseSseEvent(eventText)
          if (!parsedEvent) continue

          if (parsedEvent.event === 'delta' && parsedEvent.data.text) {
            updateActiveConversation((currentMessages) =>
              currentMessages.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: `${message.content}${parsedEvent.data.text}` }
                  : message
              )
            )
          }

          if (parsedEvent.event === 'done') {
            updateActiveConversation((currentMessages) =>
              currentMessages.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: parsedEvent.data.answer || message.content,
                      products: parsedEvent.data.products || [],
                      canExplainProducts: parsedEvent.data.canExplainProducts,
                    }
                  : message
              )
            )
          }

          if (parsedEvent.event === 'error') {
            throw new Error(parsedEvent.data.message || 'Die KI-Beratung konnte gerade nicht antworten.')
          }
        }

        if (done) break
      }
    } catch (err) {
      console.error(err)
      updateActiveConversation((currentMessages) =>
        currentMessages.filter((message) => message.id !== assistantMessageId || message.content.trim().length > 0)
      )
      setError('Die KI-Beratung ist gerade nicht erreichbar. Bitte versuche es gleich nochmal.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    sendMessage(input)
  }

  async function explainProduct(message: Message, product: ChatProduct) {
    if (explainingMessageId || isLoading || !activeConversation) return
    const conversationId = activeConversation.id
    const explanationId = `${message.id}-${product.id}`
    const lastUserMessage = messages
      .slice(0, messages.findIndex((currentMessage) => currentMessage.id === message.id))
      .reverse()
      .find((currentMessage) => currentMessage.role === 'user')

    setExplainingMessageId(explanationId)
    setError(null)

    try {
      const response = await fetch(apiUrl('/api/chat/explain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [product.id], message: lastUserMessage?.content || message.content }),
      })
      if (!response.ok) throw new Error('Die KI-Erklärung konnte gerade nicht erstellt werden.')
      const data: { answer: string } = await response.json()
      updateConversation(conversationId, (currentMessages) => [
        ...currentMessages,
        { id: crypto.randomUUID(), role: 'assistant', content: data.answer },
      ])
    } catch (err) {
      console.error(err)
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
      <h2 className="mb-4 text-2xl font-bold text-foreground">
        Chat löschen?
      </h2>

      <p className="mb-8 text-muted-foreground">
        Möchtest du diesen Chatverlauf wirklich löschen?
      </p>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setConversationToDelete(null)}
          className="flex-1 rounded-full border-border py-3 text-muted-foreground hover:bg-gray-50"
        >
          Abbrechen
        </Button>

        <Button
          type="button"
          onClick={() => {
            deleteConversation(conversationToDelete)
            setConversationToDelete(null)
          }}
          className="flex-1 rounded-full bg-[#D4A574] py-3 text-white hover:bg-[#C49464]"
        >
          Löschen
        </Button>
      </div>
    </div>
  </div>
)}

      {/* ── Haut-Analyse Modal ── */}
      {showAnalysis && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAnalysis(false) }}
        >
          <div style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
<SkinAnalysis
  onClose={() => setShowAnalysis(false)}
  onAnalysisComplete={(result) => {
    const content = `Deine Hautanalyse ist abgeschlossen.

Hauttyp: ${result.skinType}

Trockenheit: ${result.dryness}%
Rötungen: ${result.redness}%
Unreinheiten: ${result.blemishes}%
Sensibilität: ${result.sensitivity}%

${result.overall}

Du kannst mir jetzt Fragen zu deiner Hautanalyse, den Empfehlungen oder passenden Produkten stellen.`

    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'Hautanalyse',
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
        },
      ],
    }

    setChatState((currentState) => ({
      conversations: [conversation, ...currentState.conversations],
      activeConversationId: conversation.id,
    }))
  }}
/>          </div>
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
            <Button
              type="button"
              onClick={startNewConversation}
              disabled={isLoading}
              className="mb-3 h-9 w-full rounded-full bg-[#D4A574] text-sm text-white hover:bg-[#C49464]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Neue Beratung
            </Button>

            {/* ── Haut-Analyse Button in Sidebar ── */}
            <button
              type="button"
              onClick={() => setShowAnalysis(true)}
              className="mb-3 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#e0c9a8] bg-[#FDF6EE] text-sm font-medium text-[#A97745] transition-colors hover:bg-[#F5E6D3]"
            >
              <Camera className="h-4 w-4" />
              Haut analysieren
            </button>

            <h2 className="mb-3 text-sm font-semibold text-foreground">Chatverlauf</h2>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-18rem)]">
              {chatState.conversations.map((conversation) => {
                const isActive = conversation.id === chatState.activeConversationId
                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      'group flex w-full items-start gap-1 rounded-lg border p-1.5 transition-colors',
                      isActive ? 'border-[#D4A574] bg-[#FBFAF7]' : 'border-border hover:border-[#D4A574] hover:bg-[#FBFAF7]'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      disabled={isLoading}
                      className="min-w-0 flex-1 rounded-md px-1 py-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-start gap-2">
                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#A97745]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{conversation.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatConversationDate(conversation.updatedAt)}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
onClick={() => setConversationToDelete(conversation.id)}
                      disabled={isLoading}
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label="Chat löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>

          <main className="space-y-4">
<section className="flex h-[75vh] flex-col rounded-lg border border-border bg-background">             
<div
  ref={messagesContainerRef}
  className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4"
>                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {message.role === 'assistant' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                          <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                        </div>
                      )}
                      <div className={cn('max-w-[min(620px,85%)] rounded-lg px-3 py-2 text-sm leading-relaxed', message.role === 'user' ? 'bg-[#D4A574] text-white' : 'bg-[#F5F5F5] text-foreground')}>
                        {message.role === 'assistant' && message.content.trim().length === 0 ? (
                          <span className="text-muted-foreground">Denke nach...</span>
                        ) : (
                          renderMessageContent(message)
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground">
                          <User className="h-3.5 w-3.5 text-background" />
                        </div>
                      )}
                    </div>

                    {message.products && message.products.length > 0 && (
                      <div className="ml-9 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {message.products.slice(0, 3).map((product) => (
                          <div key={product.id} className="overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md">
                            <Link to={`/product/${product.id}?from=chatbot`} className="group block">
                              <div className="flex gap-2 p-2">
                                <img
                                  src={product.imageUrl || 'https://placehold.co/120x120?text=Kein+Bild'}
                                  alt={product.name}
                                  className="h-16 w-16 shrink-0 rounded-md bg-[#F5F5F5] object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">{product.category}</p>
                                  <h3 className="line-clamp-2 text-sm font-medium group-hover:text-[#D4A574]">{product.name}</h3>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>
                                  <p className="mt-1 text-sm font-semibold">€{product.price.toFixed(2)}</p>
                                  {product.recommendationBullets && product.recommendationBullets.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {product.recommendationBullets.slice(0, 4).map((bullet) => (
                                        <span
                                          key={bullet}
                                          className="rounded-full bg-[#FDF7F0] px-2 py-0.5 text-[11px] leading-4 text-[#7A5A3A]"
                                        >
                                          {bullet}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                            {message.canExplainProducts && (
                              <div className="border-t border-border px-2 py-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => explainProduct(message, product)}
                                  disabled={Boolean(explainingMessageId) || isLoading}
                                  className="h-8 w-full rounded-full border-[#E8D5C0] px-3 text-xs text-[#A97745] hover:bg-[#FDF7F0]"
                                >
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
                <div ref={messagesEndRef} />
              </div>

              {error && (
                <div className="border-t border-border px-3 py-2 text-sm text-red-600 md:px-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="border-t border-border p-3 md:p-4">
                <div className="flex gap-2">
                  {/* ── Kamera-Button im Input-Bereich ── */}
                  <button
                    type="button"
                    onClick={() => setShowAnalysis(true)}
                    title="Haut analysieren"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e0c9a8] bg-[#FDF6EE] text-[#A97745] transition-colors hover:bg-[#F5E6D3]"
                  >
                    <Camera className="h-4 w-4" />
                  </button>

                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Frag nach Hauttyp, Anliegen oder Produktwunsch..."
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-[#D4A574]"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || input.trim().length === 0}
                    className="h-10 w-10 shrink-0 rounded-full bg-[#D4A574] p-0 text-white hover:bg-[#C49464]"
                    aria-label="Nachricht senden"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </section>

            <section className="rounded-lg border border-border bg-background p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Schnell starten</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {starterQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-[#D4A574] hover:bg-[#FBFAF7] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {question}
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
