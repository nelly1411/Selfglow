import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bot, MessageCircle, Send, User, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { apiUrl } from '@/lib/api'
import { useChat, type ChatProduct, type Message } from '@/context/ChatContext'
import { useAuth } from '@/context/AuthContext'

type CurrentProduct = {
  id: number
  name: string
  brand: string
  category: string
  imageUrl?: string | null
}

type ChatResponseData = {
  answer?: string
  products?: ChatProduct[]
  canExplainProducts?: boolean
  message?: string
  text?: string
}

const PRODUCT_HISTORY_PAGE_SIZE = 8
const SHORT_WELCOME_MESSAGE = 'Wobei kann ich helfen?'

function parseSseEvent(eventText: string) {
  const eventType = eventText.split('\n').find((line) => line.startsWith('event:'))?.slice(6).trim()
  const dataText = eventText
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')

  if (!eventType || !dataText) return null

  try {
    return { event: eventType, data: JSON.parse(dataText) as ChatResponseData }
  } catch {
    return null
  }
}

function renderStructuredText(content: string) {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean)

  if (lines.length <= 1) return content

  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        if (line === '---') return <hr key={index} className="border-border" />

        if (line.startsWith('- ')) {
          return (
            <p key={index} className="pl-3">
              <span aria-hidden="true">- </span>
              {line.slice(2)}
            </p>
          )
        }

        const strong = line.match(/^\*\*(.+)\*\*$/)
        if (strong) return <p key={index} className="font-semibold">{strong[1]}</p>

        return <p key={index}>{line.replace(/\*\*/g, '')}</p>
      })}
    </div>
  )
}

function getLatestRecommendedProductIds(messages: Message[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role === 'assistant' && message.products?.length) {
      return message.products.slice(0, 3).map((product) => product.id)
    }
  }

  return []
}

function getProductChatStorageKey(productId: number) {
  return `selfglow.product-chat.${productId}`
}

function isStoredWelcomeMessage(message: Message) {
  return (
    message.id === 'welcome' ||
    message.content === SHORT_WELCOME_MESSAGE ||
    message.content.includes('SelfGlow KI-Beratung')
  )
}

function loadProductMessages(productId: number) {
  try {
    const raw = localStorage.getItem(getProductChatStorageKey(productId))
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as Message[]).filter((message) => !isStoredWelcomeMessage(message))
  } catch {
    return []
  }
}

function saveProductMessages(productId: number, messages: Message[]) {
  try {
    localStorage.setItem(
      getProductChatStorageKey(productId),
      JSON.stringify(messages.filter((message) => !isStoredWelcomeMessage(message)))
    )
  } catch {
    // Local storage can be unavailable in private browsing.
  }
}

function HistoryDivider() {
  return (
    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-[#E8D5C0]" />
      <span>--- Chatverlauf ---</span>
      <span className="h-px flex-1 bg-[#E8D5C0]" />
    </div>
  )
}

export default function FloatingChat({
  currentProductId,
  routeKey,
}: {
  currentProductId?: number | null
  routeKey: string
}) {
  const {
    chatState,
    setChatState,
    activeConversation,
    messages,
    applyMessages,
    saveConversationToDb,
    weather,
  } = useChat()
  const { token } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentProduct, setCurrentProduct] = useState<CurrentProduct | null>(null)
  const [productMessages, setProductMessages] = useState<Message[]>([])
  const [productHistoryCount, setProductHistoryCount] = useState(0)
  const [productVisibleCount, setProductVisibleCount] = useState(PRODUCT_HISTORY_PAGE_SIZE)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const preserveScrollRef = useRef(false)
  const previousScrollHeightRef = useRef(0)
  const isProductChat = Boolean(currentProductId)
  const productHistoryMessages = useMemo(
    () => productMessages.slice(0, productHistoryCount),
    [productHistoryCount, productMessages]
  )
  const productSessionMessages = useMemo(
    () => productMessages.slice(productHistoryCount),
    [productHistoryCount, productMessages]
  )
  const visibleProductHistoryMessages = useMemo(
    () => productHistoryMessages.slice(-productVisibleCount),
    [productHistoryMessages, productVisibleCount]
  )
  const visibleMessages = useMemo(
    () => isProductChat ? productSessionMessages : messages,
    [isProductChat, messages, productSessionMessages]
  )
  const hasOlderProductMessages =
    isProductChat && productHistoryMessages.length > productVisibleCount

  useEffect(() => {
    setIsOpen(false)
  }, [routeKey])

  useEffect(() => {
    if (!currentProductId) {
      setCurrentProduct(null)
      setProductMessages([])
      setProductHistoryCount(0)
      setProductVisibleCount(PRODUCT_HISTORY_PAGE_SIZE)
      return
    }

    const loadedMessages = loadProductMessages(currentProductId)
    setProductMessages(loadedMessages)
    setProductHistoryCount(loadedMessages.length)
    setProductVisibleCount(PRODUCT_HISTORY_PAGE_SIZE)
    const controller = new AbortController()

    fetch(apiUrl(`/api/products/${currentProductId}`), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Produkt konnte nicht geladen werden')
        return response.json() as Promise<CurrentProduct>
      })
      .then((product) => setCurrentProduct(product))
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.warn('Floating chat product context failed:', err)
        setCurrentProduct(null)
      })

    return () => controller.abort()
  }, [currentProductId])

  useEffect(() => {
    if (!messagesRef.current) return

    if (preserveScrollRef.current) {
      const nextScrollHeight = messagesRef.current.scrollHeight
      messagesRef.current.scrollTop = nextScrollHeight - previousScrollHeightRef.current
      preserveScrollRef.current = false
      previousScrollHeightRef.current = 0
      return
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [visibleMessages, visibleProductHistoryMessages, isLoading, isOpen])

  function loadOlderProductMessages() {
    if (!currentProductId || !messagesRef.current || !hasOlderProductMessages) return

    preserveScrollRef.current = true
    previousScrollHeightRef.current = messagesRef.current.scrollHeight
    setProductVisibleCount((count) =>
      Math.min(count + PRODUCT_HISTORY_PAGE_SIZE, productHistoryMessages.length)
    )
  }

  function handleMessagesScroll() {
    if (!isProductChat || !hasOlderProductMessages || !messagesRef.current) return

    if (messagesRef.current.scrollTop <= 12) {
      loadOlderProductMessages()
    }
  }

  function updateProductMessagesForProduct(
    productId: number,
    updater: (msgs: Message[]) => Message[]
  ) {
    const isCurrentProduct = currentProductId === productId

    if (isCurrentProduct) {
      setProductMessages((currentMessages) => {
        const nextMessages = updater(currentMessages)
        saveProductMessages(productId, nextMessages)
        return nextMessages
      })
      return
    }

    const currentMessages = loadProductMessages(productId)
    const nextMessages = updater(currentMessages)
    saveProductMessages(productId, nextMessages)
  }

  useEffect(() => {
    setInput('')
    setError(null)
  }, [currentProductId])

  useEffect(() => {
    if (!currentProductId) return

    const syncFromStorage = () => {
      const loadedMessages = loadProductMessages(currentProductId)
      setProductMessages(loadedMessages)
      setProductHistoryCount(loadedMessages.length)
      setProductVisibleCount(PRODUCT_HISTORY_PAGE_SIZE)
    }

    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [currentProductId])

  function updateUiOnly(conversationId: string, updater: (msgs: Message[]) => Message[]) {
    setChatState((state) => ({
      ...state,
      conversations: state.conversations.map((conversation) =>
        conversation.id !== conversationId
          ? conversation
          : { ...conversation, messages: updater(conversation.messages) }
      ),
    }))
  }

  async function sendMessage(messageText: string) {
    const trimmed = messageText.trim()
    const productIdForRequest = currentProductId ?? null
    const isProductChatForRequest = Boolean(productIdForRequest)

    if (!trimmed || isLoading || (!isProductChatForRequest && !activeConversation)) return

    const conversationId = chatState.activeConversationId
    const sourceMessages = isProductChatForRequest ? productMessages : messages
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const assistantMessageId = crypto.randomUUID()
    const assistantMessage: Message = { id: assistantMessageId, role: 'assistant', content: '' }
    const chatHistory = [...sourceMessages, userMessage]
      .slice(-4)
      .map((message) => ({ role: message.role, content: message.content }))
    const contextProductIds = productIdForRequest
      ? [productIdForRequest]
      : getLatestRecommendedProductIds(sourceMessages)

    if (isProductChatForRequest) {
      updateProductMessagesForProduct(productIdForRequest!, (msgs) => [
        ...msgs,
        userMessage,
        assistantMessage,
      ])
    } else {
      updateUiOnly(conversationId, (msgs) => [...msgs, userMessage, assistantMessage])
    }
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
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory,
          contextProductIds,
          weather,
        }),
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
            if (isProductChatForRequest) {
              updateProductMessagesForProduct(productIdForRequest!, (msgs) =>
                msgs.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, content: message.content + parsed.data.text! }
                    : message
                )
              )
            } else {
              updateUiOnly(conversationId, (msgs) =>
                msgs.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, content: message.content + parsed.data.text! }
                    : message
                )
              )
            }
          }

          if (parsed.event === 'done') {
            finalAnswer = parsed.data.answer ?? ''
            finalProducts = parsed.data.products ?? []
            finalCanExplain = parsed.data.canExplainProducts ?? false
          }

          if (parsed.event === 'error') {
            throw new Error(parsed.data.message ?? 'Fehler beim Streamen.')
          }
        }

        if (done) break
      }

      if (isProductChatForRequest) {
        updateProductMessagesForProduct(productIdForRequest!, (msgs) =>
          msgs.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: finalAnswer || message.content,
                  products: finalProducts,
                  canExplainProducts: finalCanExplain,
                }
              : message
          )
        )
      } else {
        const updated = applyMessages(conversationId, (msgs) =>
          msgs.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: finalAnswer || message.content,
                  products: finalProducts,
                  canExplainProducts: finalCanExplain,
                }
              : message
          )
        )

        if (updated) saveConversationToDb(updated)
      }
    } catch (err) {
      console.error(err)
      if (isProductChatForRequest) {
        updateProductMessagesForProduct(productIdForRequest!, (msgs) =>
          msgs.filter((message) => message.id !== assistantMessageId || message.content.trim().length > 0)
        )
      } else {
        updateUiOnly(conversationId, (msgs) =>
          msgs.filter((message) => message.id !== assistantMessageId || message.content.trim().length > 0)
        )
      }
      setError('Die KI-Beratung ist gerade nicht erreichbar. Bitte versuche es gleich nochmal.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  function askAboutCurrentProduct() {
    if (!currentProduct || isLoading) return

    void sendMessage(
      `Bitte bewerte dieses Produkt für mich: ${currentProduct.brand} ${currentProduct.name}. Passt es zu meiner Haut und worauf soll ich achten?`
    )
  }

  function renderChatMessage(message: Message) {
    return (
      <div key={message.id} className="space-y-2">
        <div className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
          {message.role === 'assistant' && (
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
              <Bot className="h-3.5 w-3.5 text-[#A97745]" />
            </div>
          )}

          <div
            className={cn(
              'max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed',
              message.role === 'user'
                ? 'bg-[#D4A574] text-white'
                : 'bg-white text-foreground shadow-sm'
            )}
          >
            {message.role === 'assistant' && message.content.trim().length === 0
              ? <span className="text-muted-foreground">Denke nach...</span>
              : renderStructuredText(message.content)}
          </div>

          {message.role === 'user' && (
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground">
              <User className="h-3.5 w-3.5 text-background" />
            </div>
          )}
        </div>

        {message.products && message.products.length > 0 && (
          <div className="ml-9 space-y-2">
            {message.products.slice(0, 2).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}?from=chatbot`}
                onClick={() => setIsOpen(false)}
                className="flex gap-2 rounded-lg border border-border bg-white p-2 transition-shadow hover:shadow-md"
              >
                <img
                  src={product.imageUrl || 'https://placehold.co/120x120?text=Kein+Bild'}
                  alt={product.name}
                  className="h-14 w-14 shrink-0 rounded-md bg-[#F5F5F5] object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{product.category}</p>
                  <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {isOpen && (
        <section className="fixed bottom-24 right-5 z-50 flex h-[min(620px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#E8D5C0] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#EFE6DC] bg-[#FFFBF6] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5E6D3]">
                <Bot className="h-4 w-4 text-[#A97745]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">KI-Beratung</h2>
                <p className="text-xs text-muted-foreground">Direkt auf dieser Seite</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F5E6D3] hover:text-foreground"
              aria-label="KI-Beratung schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={messagesRef}
            onScroll={handleMessagesScroll}
            className="flex-1 space-y-3 overflow-y-auto bg-[#FBFAF7] p-3"
          >
            {isProductChat && hasOlderProductMessages && (
              <button
                type="button"
                onClick={loadOlderProductMessages}
                className="mx-auto flex rounded-full border border-[#E8D5C0] bg-white px-4 py-1.5 text-xs font-medium text-[#8A5D2F] shadow-sm transition hover:bg-[#FFFBF6]"
              >
                Historische Nachrichten
              </button>
            )}

            {isProductChat && visibleProductHistoryMessages.map((message) =>
              renderChatMessage(message)
            )}

            {isProductChat && productHistoryMessages.length > 0 && <HistoryDivider />}

            {isProductChat && (
              <div className="space-y-2">
                <div className="flex gap-2 justify-start">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                    <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                  </div>
                  <div className="max-w-[82%] rounded-lg bg-white px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm">
                    {SHORT_WELCOME_MESSAGE}
                  </div>
                </div>
              </div>
            )}

            {isProductChat && visibleMessages.map((message) =>
              renderChatMessage(message)
            )}

            {!isProductChat && visibleMessages.map((message, index) => (
              <div key={message.id} className="space-y-3">
                {index === 1 && visibleMessages[0]?.id === 'welcome' && (
                  <HistoryDivider />
                )}
                {renderChatMessage(message)}
              </div>
            ))}

            {isLoading && visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
              <div className="flex gap-2">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                  <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
                  Denke nach...
                </div>
              </div>
            )}
          </div>

          {currentProduct && (
            <div className="border-t border-[#EFE6DC] bg-[#FFFBF6] p-3">
              <button
                type="button"
                onClick={askAboutCurrentProduct}
                disabled={isLoading}
                className="flex w-full gap-3 rounded-xl border border-[#E8D5C0] bg-white p-3 text-left shadow-sm transition hover:border-[#D4A574] hover:bg-[#FFFBF6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <img
                  src={currentProduct.imageUrl || 'https://placehold.co/120x120?text=Kein+Bild'}
                  alt={currentProduct.name}
                  className="h-14 w-14 shrink-0 rounded-lg bg-[#F5F5F5] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#A97745]">Dieses Produkt fragen</p>
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {currentProduct.name}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {currentProduct.brand} · {currentProduct.category}
                  </p>
                </div>
              </button>
            </div>
          )}

          {error && (
            <div className="border-t border-border px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="border-t border-border bg-white p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={currentProductId ? 'Frag etwas zu diesem Produkt...' : 'Frag nach Hautpflege oder Produkten...'}
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
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-40 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A574] text-white shadow-lg transition hover:bg-[#C49464] hover:scale-105"
        aria-label="KI-Beratung öffnen"
        title="KI-Beratung öffnen"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  )
}
