import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bot, MessageCircle, Plus, Send, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { apiUrl } from '@/lib/api'
import { cn } from '@workspace/ui/lib/utils'

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
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  // Assistant messages can include retrieved products from the backend. The UI
  // renders these as clickable cards below the assistant answer.
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

// Example prompts help users discover what the keyword RAG MVP can answer well:
// skin type, concerns, and concrete product preferences.
const starterQuestions = [
  'Ich habe ölige Haut und suche etwas gegen Unreinheiten.',
  'Welche parfumfreien Produkte passen zu empfindlicher Haut?',
  'I need a simple vegan skincare routine.',
]

const chatStorageKey = 'selfglow-chatbot-conversations'
const legacyChatStorageKey = 'selfglow-chatbot-messages'
const medicalDisclaimer =
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

  if (!firstUserMessage) {
    return 'Neue Beratung'
  }

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

        return {
          conversations: parsedState.conversations,
          activeConversationId,
        }
      }
    }

    const legacyMessages = sessionStorage.getItem(legacyChatStorageKey)

    if (legacyMessages) {
      const messages = JSON.parse(legacyMessages) as Message[]
      const conversation = createConversation(messages)
      conversation.title = getConversationTitle(messages)

      return {
        conversations: [conversation],
        activeConversationId: conversation.id,
      }
    }
  } catch {
    // Fall back to a clean conversation when stored data is malformed.
  }

  const conversation = createConversation()

  return {
    conversations: [conversation],
    activeConversationId: conversation.id,
  }
}

function renderMessageContent(message: Message) {
  if (message.role !== 'assistant' || !message.content.includes(medicalDisclaimer)) {
    return renderStructuredText(message.content)
  }

  const mainContent = message.content.replace(medicalDisclaimer, '').trim()

  return (
    <>
      {mainContent && renderStructuredText(mainContent)}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        <span className="font-medium">Note:</span> {medicalDisclaimer}
      </p>
    </>
  )
}

function renderInlineText(text: string) {
  const match = text.match(/^\*\*(.+)\*\*$/)

  if (match) {
    return <span className="font-semibold">{match[1]}</span>
  }

  return text
}

function renderStructuredText(content: string) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return content
  }

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        if (line === '---') {
          return <hr key={`${line}-${index}`} className="border-border" />
        }

        if (line.startsWith('- ')) {
          return (
            <div key={`${line}-${index}`} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A574]" />
              <span>{renderInlineText(line.slice(2))}</span>
            </div>
          )
        }

        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={`${line}-${index}`} className="pt-1 font-semibold">
              {renderInlineText(line)}
            </p>
          )
        }

        return <p key={`${line}-${index}`}>{renderInlineText(line)}</p>
      })}
    </div>
  )
}

export default function Chatbot() {
  // Keep all conversations in sessionStorage so product detail navigation does
  // not wipe the current consultation in this browser tab.
  const [chatState, setChatState] = useState<ChatState>(loadStoredChatState)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [explainingMessageId, setExplainingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeConversation =
    chatState.conversations.find(
      (conversation) => conversation.id === chatState.activeConversationId
    ) || chatState.conversations[0]
  const messages = activeConversation?.messages || initialMessages

  useEffect(() => {
    sessionStorage.setItem(chatStorageKey, JSON.stringify(chatState))
  }, [chatState])

  function updateActiveConversation(updater: (messages: Message[]) => Message[]) {
    setChatState((currentState) => ({
      ...currentState,
      conversations: currentState.conversations.map((conversation) => {
        if (conversation.id !== currentState.activeConversationId) {
          return conversation
        }

        const nextMessages = updater(conversation.messages)

        return {
          ...conversation,
          title: getConversationTitle(nextMessages),
          updatedAt: new Date().toISOString(),
          messages: nextMessages,
        }
      }),
    }))
  }

  function updateConversation(
    conversationId: string,
    updater: (messages: Message[]) => Message[]
  ) {
    setChatState((currentState) => ({
      ...currentState,
      conversations: currentState.conversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation
        }

        const nextMessages = updater(conversation.messages)

        return {
          ...conversation,
          title: getConversationTitle(nextMessages),
          updatedAt: new Date().toISOString(),
          messages: nextMessages,
        }
      }),
    }))
  }

  function startNewConversation() {
    if (isLoading) return

    const conversation = createConversation()

    setChatState((currentState) => ({
      conversations: [conversation, ...currentState.conversations],
      activeConversationId: conversation.id,
    }))
    setInput('')
    setError(null)
  }

  function selectConversation(conversationId: string) {
    if (isLoading) return

    setChatState((currentState) => ({
      ...currentState,
      activeConversationId: conversationId,
    }))
    setInput('')
    setError(null)
  }

  function deleteConversation(conversationId: string) {
    if (isLoading) return

    setChatState((currentState) => {
      const remainingConversations = currentState.conversations.filter(
        (conversation) => conversation.id !== conversationId
      )

      if (remainingConversations.length === 0) {
        const conversation = createConversation()

        return {
          conversations: [conversation],
          activeConversationId: conversation.id,
        }
      }

      const activeConversationId =
        currentState.activeConversationId === conversationId
          ? remainingConversations[0].id
          : currentState.activeConversationId

      return {
        conversations: remainingConversations,
        activeConversationId,
      }
    })
    setInput('')
    setError(null)
  }

  // Send one customer message to the backend. The backend performs retrieval
  // over the Product table and optionally asks OpenAI to generate the answer.
  async function sendMessage(messageText: string) {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage || isLoading) return

    // Add the user's message immediately so the chat feels responsive while the
    // backend searches products and generates the assistant answer.
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedMessage,
    }
    const chatHistory = [...messages, userMessage].slice(-4).map((message) => ({
      role: message.role,
      content: message.content,
    }))
    const contextProductIds = Array.from(
      new Set(
        messages
          .flatMap((message) => message.products || [])
          .map((product) => product.id)
      )
    ).slice(-3)

    updateActiveConversation((currentMessages) => [...currentMessages, userMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      // The frontend never calls OpenAI directly. It only talks to our backend,
      // which keeps API keys private and controls the product context.
      const response = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          history: chatHistory,
          contextProductIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Die KI-Beratung konnte gerade nicht antworten.')
      }

      const data: {
        answer: string
        products?: ChatProduct[]
        canExplainProducts?: boolean
      } = await response.json()

      // Store the assistant answer together with the retrieved products. This is
      // why the user can read the explanation and jump directly to product pages.
      updateActiveConversation((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
          products: data.products || [],
          canExplainProducts: data.canExplainProducts,
        },
      ])
    } catch (err) {
      console.error(err)
      // A user-facing error is enough here because the backend logs the detailed
      // server/model failure.
      setError('Die KI-Beratung ist gerade nicht erreichbar. Bitte versuche es gleich nochmal.')
    } finally {
      setIsLoading(false)
    }
  }

  // The form handles Enter/click submit in one place, then delegates to the same
  // sendMessage function used by starter-question buttons.
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: [product.id],
          message: lastUserMessage?.content || message.content,
        }),
      })

      if (!response.ok) {
        throw new Error('Die AI-Erklärung konnte gerade nicht erstellt werden.')
      }

      const data: { answer: string } = await response.json()

      updateConversation(conversationId, (currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
        },
      ])
    } catch (err) {
      console.error(err)
      setError('Die AI-Erklärung ist gerade nicht erreichbar. Bitte versuche es gleich nochmal.')
    } finally {
      setExplainingMessageId(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#FBFAF7]">
      <div className="container mx-auto max-w-6xl px-4 pb-5 lg:pb-6">
        <div className="sticky top-0 z-20 mb-4 flex items-center gap-3 bg-[#FBFAF7] py-4 lg:py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5E6D3]">
            <Sparkles className="h-4 w-4 text-[#A97745]" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">KI-Beratung</h1>
            <p className="text-xs text-muted-foreground">
              Produktempfehlungen aus dem SelfGlow Sortiment
            </p>
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

            <h2 className="mb-3 text-sm font-semibold text-foreground">Chatverlauf</h2>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-14rem)]">
              {chatState.conversations.map((conversation) => {
                const isActive = conversation.id === chatState.activeConversationId

                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      'group flex w-full items-start gap-1 rounded-lg border p-1.5 transition-colors',
                      isActive
                        ? 'border-[#D4A574] bg-[#FBFAF7]'
                        : 'border-border hover:border-[#D4A574] hover:bg-[#FBFAF7]'
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
                          <p className="truncate text-sm font-medium text-foreground">
                            {conversation.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatConversationDate(conversation.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteConversation(conversation.id)}
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
            <section className="flex min-h-[520px] flex-col rounded-lg border border-border bg-background">
              <div className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    {/* Chat bubbles are aligned by role so users can scan the conversation quickly. */}
                    <div
                      className={cn(
                        'flex gap-2',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                          <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                        </div>
                      )}

                      <div
                        className={cn(
                          'max-w-[min(620px,85%)] rounded-lg px-3 py-2 text-sm leading-relaxed',
                          message.role === 'user'
                            ? 'bg-[#D4A574] text-white'
                            : 'bg-[#F5F5F5] text-foreground'
                        )}
                      >
                        {renderMessageContent(message)}
                      </div>

                      {message.role === 'user' && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground">
                          <User className="h-3.5 w-3.5 text-background" />
                        </div>
                      )}
                    </div>

                    {/* Product cards are rendered only for assistant messages that include retrieved products. */}
                    {message.products && message.products.length > 0 && (
                      <div className="ml-9 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {message.products.slice(0, 3).map((product) => (
                          <div
                            key={product.id}
                            className="overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md"
                          >
                            <Link to={`/product/${product.id}?from=chatbot`} className="group block">
                              <div className="flex gap-2 p-2">
                                <img
                                  src={
                                    product.imageUrl ||
                                    'https://placehold.co/120x120?text=No+Image'
                                  }
                                  alt={product.name}
                                  className="h-16 w-16 shrink-0 rounded-md bg-[#F5F5F5] object-cover"
                                />

                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">
                                    {product.category}
                                  </p>
                                  <h3 className="line-clamp-2 text-sm font-medium group-hover:text-[#D4A574]">
                                    {product.name}
                                  </h3>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {product.brand}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold">
                                    €{product.price.toFixed(2)}
                                  </p>
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
                                  {explainingMessageId === `${message.id}-${product.id}`
                                    ? 'AI erklärt...'
                                    : 'AI erklären'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading state appears inside the conversation area to make the wait feel conversational. */}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                      <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                    </div>
                    <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-muted-foreground">
                      Thinking...
                    </div>
                  </div>
                )}

                {explainingMessageId && !isLoading && (
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                      <Bot className="h-3.5 w-3.5 text-[#A97745]" />
                    </div>
                    <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-muted-foreground">
                      AI erklärt das Produkt...
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="border-t border-border px-3 py-2 text-sm text-red-600 md:px-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="border-t border-border p-3 md:p-4">
                <div className="flex gap-2">
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
                    // Starter questions use the same submit path as typed messages,
                    // so they test the exact same backend RAG flow.
                    onClick={() => sendMessage(question)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-[#D4A574] hover:bg-[#FBFAF7] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Die Beratung nutzt Produktdaten aus dem Shop und ersetzt keine medizinische Beratung.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
