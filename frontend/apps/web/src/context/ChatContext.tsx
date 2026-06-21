import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { apiUrl } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export type ChatProduct = {
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

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: ChatProduct[]
  canExplainProducts?: boolean
  imageUrl?: string | null
}

export type Conversation = {
  id: string
  title: string
  updatedAt: string
  messages: Message[]
}

type ChatState = {
  conversations: Conversation[]
  activeConversationId: string
}

type ChatContextType = {
  chatState: ChatState
  setChatState: React.Dispatch<React.SetStateAction<ChatState>>
  activeConversation: Conversation
  messages: Message[]
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  startNewConversation: () => void
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => void
  applyMessages: (conversationId: string, updater: (msgs: Message[]) => Message[]) => Conversation | null
  saveConversationToDb: (conversation: Conversation) => void
  deleteConversationFromDb: (id: string) => void
  isLoadingHistory: boolean
  weather: object | null
  fetchWeather: () => void
}

export const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Wobei kann ich helfen?',
  },
]

function isWelcomeMessage(message: Pick<Message, 'id' | 'content'>) {
  return (
    message.id === 'welcome' ||
    message.content === initialMessages[0].content ||
    message.content.includes('SelfGlow KI-Beratung')
  )
}

export function createConversation(messages: Message[] = initialMessages): Conversation {
  return { id: crypto.randomUUID(), title: 'Neue Beratung', updatedAt: new Date().toISOString(), messages }
}

export function getConversationTitle(messages: Message[]) {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'Neue Beratung'
  return first.content.length > 42 ? `${first.content.slice(0, 42)}...` : first.content
}

function freshState(): ChatState {
  const c = createConversation()
  return { conversations: [c], activeConversationId: c.id }
}

async function compressImage(base64: string, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(base64); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      } catch { resolve(base64) }
    }
    img.onerror = () => resolve(base64)
    img.src = base64
  })
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { token, isLoggedIn } = useAuth()
  const [chatState, setChatState] = useState<ChatState>(freshState)
  const [input, setInput] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [weather, setWeather] = useState<object | null>(null)

  // Wetter erst beim Button-Klick holen — nicht beim App-Start
  const fetchWeather = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(apiUrl(`/api/weather?lat=${lat}&lon=${lon}`))
          if (!res.ok) return
          const data = await res.json()
          if (data.weather) setWeather(data.weather)
        } catch { /* ignore */ }
      },
      () => { /* Standort abgelehnt */ }
    )
  }, [])

  const loadedForToken = useRef<string | null>(null)
  const saving = useRef<Record<string, boolean>>({})
  const pending = useRef<Record<string, Conversation>>({})
  const chatStateRef = useRef<ChatState>(chatState)
  useEffect(() => { chatStateRef.current = chatState }, [chatState])

  const activeConversation =
    chatState.conversations.find((c) => c.id === chatState.activeConversationId) ??
    chatState.conversations[0]

  const messages = activeConversation?.messages ?? initialMessages

  // ── DB laden wenn eingeloggt ──────────────────────────────────────────────
  useEffect(() => {
    if (!token || !isLoggedIn) {
      loadedForToken.current = null
      saving.current = {}
      pending.current = {}
      setChatState(freshState)
      return
    }

    if (loadedForToken.current === token) return
    loadedForToken.current = token
    saving.current = {}
    pending.current = {}

    const controller = new AbortController()
    setIsLoadingHistory(true)

    fetch(apiUrl('/api/chat-history'), {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<any[]>
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setChatState(freshState)
          return
        }

        const dbConversations: Conversation[] = data.map((c) => {
          const dbMessages: Message[] = (c.messages ?? [])
            .filter((m: any) => !isWelcomeMessage({ id: m.id, content: m.content }))
            .map((m: any) => ({
              id:                m.id,
              role:              m.role,
              content:           m.content,
              imageUrl:          m.imageData ?? null,
              products:          Array.isArray(m.products) ? m.products : [],
              canExplainProducts: Array.isArray(m.products) && m.products.length > 0,
            }))

          return {
            id:        c.id,
            title:     c.title,
            updatedAt: c.updatedAt,
            messages:  [initialMessages[0], ...dbMessages],
          }
        })

        setChatState({
          conversations:        dbConversations,
          activeConversationId: dbConversations[0].id,
        })
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('[Chat] DB laden fehlgeschlagen:', err)
        loadedForToken.current = null
      })
      .finally(() => setIsLoadingHistory(false))

    return () => { controller.abort(); loadedForToken.current = null }
  }, [token, isLoggedIn])

  // ── applyMessages ─────────────────────────────────────────────────────────
  const applyMessages = useCallback(
    (conversationId: string, updater: (msgs: Message[]) => Message[]): Conversation | null => {
      const current = chatStateRef.current
      const conv = current.conversations.find((c) => c.id === conversationId)
      if (!conv) return null

      const nextMsgs = updater(conv.messages)
      const updated: Conversation = {
        ...conv,
        title:     getConversationTitle(nextMsgs),
        updatedAt: new Date().toISOString(),
        messages:  nextMsgs,
      }

      setChatState((s) => ({
        ...s,
        conversations: s.conversations.map((c) => c.id === conversationId ? updated : c),
      }))

      return updated
    },
    []
  )

  // ── HTTP Save ─────────────────────────────────────────────────────────────
  const execSave = useCallback(async (conv: Conversation, tok: string) => {
    const messagesToSave = conv.messages.filter((m) => !isWelcomeMessage(m))

    const processedMessages = await Promise.all(
      messagesToSave.map(async (m) => {
        let imageData: string | null = null
        if (m.imageUrl) {
          try {
            const compressed = await compressImage(m.imageUrl)
            imageData = compressed.length < 5_000_000 ? compressed : null
          } catch { imageData = null }
        }
        return { role: m.role, content: m.content, imageData, products: m.products ?? [] }
      })
    )

    const res = await fetch(apiUrl('/api/chat-history'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body:    JSON.stringify({ id: conv.id, title: conv.title, messages: processedMessages }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Save fehlgeschlagen: ${res.status} ${body}`)
    }
  }, [])

  // ── Save-Queue ────────────────────────────────────────────────────────────
  const saveConversationToDb = useCallback(async (conv: Conversation) => {
    if (!token) return
    const id = conv.id

    if (saving.current[id]) {
      pending.current[id] = conv
      return
    }

    saving.current[id] = true
    delete pending.current[id]

    try {
      await execSave(conv, token)
    } catch (err) {
      console.error('[Chat] Save fehlgeschlagen:', err)
    } finally {
      saving.current[id] = false
      const next = pending.current[id]
      if (next) {
        delete pending.current[id]
        saveConversationToDb(next)
      }
    }
  }, [token, execSave])

  // ── DB löschen ────────────────────────────────────────────────────────────
  const deleteConversationFromDb = useCallback((id: string) => {
    if (!token) return
    fetch(apiUrl(`/api/chat-history/${id}`), {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    }).catch((err) => console.error('[Chat] Löschen fehlgeschlagen:', err))
  }, [token])

  function startNewConversation() {
    const c = createConversation()
    setChatState((s) => ({ conversations: [c, ...s.conversations], activeConversationId: c.id }))
    setInput('')
  }

  function selectConversation(id: string) {
    setChatState((s) => ({ ...s, activeConversationId: id }))
    setInput('')
  }

  function deleteConversation(id: string) {
    deleteConversationFromDb(id)
    setChatState((s) => {
      const remaining = s.conversations.filter((c) => c.id !== id)
      if (remaining.length === 0) {
        const c = createConversation()
        return { conversations: [c], activeConversationId: c.id }
      }
      return {
        conversations:        remaining,
        activeConversationId: s.activeConversationId === id ? remaining[0].id : s.activeConversationId,
      }
    })
    setInput('')
  }

  return (
    <ChatContext.Provider value={{
      chatState, setChatState,
      activeConversation, messages,
      input, setInput,
      startNewConversation, selectConversation, deleteConversation,
      applyMessages, saveConversationToDb, deleteConversationFromDb,
      isLoadingHistory,
      weather,
      fetchWeather,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat muss innerhalb von ChatProvider verwendet werden')
  return ctx
}
