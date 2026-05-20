import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, Sparkles, User } from 'lucide-react'
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
}

// Example prompts help users discover what the keyword RAG MVP can answer well:
// skin type, concerns, and concrete product preferences.
const starterQuestions = [
  'Ich habe ölige Haut und suche etwas gegen Unreinheiten.',
  'Welche parfumfreien Produkte passen zu empfindlicher Haut?',
  'I need a simple vegan skincare routine.',
]

const medicalDisclaimer =
  'Das ist keine medizinische Diagnose, sondern eine Produktempfehlung auf Basis deiner Anfrage.'

function renderMessageContent(message: Message) {
  if (message.role !== 'assistant' || !message.content.includes(medicalDisclaimer)) {
    return message.content
  }

  const mainContent = message.content.replace(medicalDisclaimer, '').trim()

  return (
    <>
      {mainContent && <p>{mainContent}</p>}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        <span className="font-medium">Note:</span> {medicalDisclaimer}
      </p>
    </>
  )
}

export default function Chatbot() {
  // The chat is kept as local component state for Phase 1. There is no persisted
  // chat history yet, so refreshing the page starts a fresh conversation.
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi, ich bin deine SelfGlow KI-Beratung. Sag mir deinen Hauttyp, dein Anliegen oder welche Eigenschaften dir wichtig sind.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    setMessages((currentMessages) => [...currentMessages, userMessage])
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
        body: JSON.stringify({ message: trimmedMessage }),
      })

      if (!response.ok) {
        throw new Error('Die KI-Beratung konnte gerade nicht antworten.')
      }

      const data: { answer: string; products?: ChatProduct[] } = await response.json()

      // Store the assistant answer together with the retrieved products. This is
      // why the user can read the explanation and jump directly to product pages.
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
          products: data.products || [],
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

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#FBFAF7]">
      <div className="container mx-auto px-4 py-8 lg:py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5E6D3]">
            <Sparkles className="h-5 w-5 text-[#A97745]" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">KI-Beratung</h1>
            <p className="text-sm text-muted-foreground">
              Produktempfehlungen aus dem SelfGlow Sortiment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-[620px] flex-col rounded-lg border border-border bg-background">
            <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {/* Chat bubbles are aligned by role so users can scan the conversation quickly. */}
                  <div
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                        <Bot className="h-4 w-4 text-[#A97745]" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[min(680px,85%)] rounded-lg px-4 py-3 text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'bg-[#D4A574] text-white'
                          : 'bg-[#F5F5F5] text-foreground'
                      )}
                    >
                      {renderMessageContent(message)}
                    </div>

                    {message.role === 'user' && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground">
                        <User className="h-4 w-4 text-background" />
                      </div>
                    )}
                  </div>

                  {/* Product cards are rendered only for assistant messages that include retrieved products. */}
                  {message.products && message.products.length > 0 && (
                    <div className="ml-11 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {message.products.slice(0, 3).map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          className="group overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md"
                        >
                          <div className="flex gap-3 p-3">
                            <img
                              src={product.imageUrl || 'https://placehold.co/120x120?text=No+Image'}
                              alt={product.name}
                              className="h-20 w-20 shrink-0 rounded-md bg-[#F5F5F5] object-cover"
                            />

                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">{product.category}</p>
                              <h3 className="line-clamp-2 text-sm font-medium group-hover:text-[#D4A574]">
                                {product.name}
                              </h3>
                              <p className="mt-1 text-xs text-muted-foreground">{product.brand}</p>
                              <p className="mt-2 text-sm font-semibold">
                                €{product.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading state appears inside the conversation area to make the wait feel conversational. */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3]">
                    <Bot className="h-4 w-4 text-[#A97745]" />
                  </div>
                  <div className="rounded-lg bg-[#F5F5F5] px-4 py-3 text-sm text-muted-foreground">
                    Ich suche passende Produkte...
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="border-t border-border px-4 py-3 text-sm text-red-600 md:px-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="border-t border-border p-4 md:p-6">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Frag nach Hauttyp, Anliegen oder Produktwunsch..."
                  className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-[#D4A574]"
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  disabled={isLoading || input.trim().length === 0}
                  className="h-12 w-12 shrink-0 rounded-full bg-[#D4A574] p-0 text-white hover:bg-[#C49464]"
                  aria-label="Nachricht senden"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </section>

          <aside className="rounded-lg border border-border bg-background p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Schnell starten</h2>
            <div className="space-y-3">
              {starterQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  // Starter questions use the same submit path as typed messages,
                  // so they test the exact same backend RAG flow.
                  onClick={() => sendMessage(question)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-border px-3 py-3 text-left text-sm transition-colors hover:border-[#D4A574] hover:bg-[#FBFAF7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {question}
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Die Beratung nutzt Produktdaten aus dem Shop und ersetzt keine medizinische Beratung.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
