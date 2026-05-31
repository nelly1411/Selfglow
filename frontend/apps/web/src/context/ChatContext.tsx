import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

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
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: ChatProduct[]
  canExplainProducts?: boolean
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
  selectConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
}

const chatStorageKey = 'selfglow-chatbot-conversations'

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

function loadStoredChatState(): ChatState {
  try {
    const storedState = sessionStorage.getItem(chatStorageKey)

    if (storedState) {
      const parsedState = JSON.parse(storedState) as ChatState

      if (parsedState.conversations?.length && parsedState.activeConversationId) {
        return parsedState
      }
    }
  } catch {
    // Falls etwas kaputt ist, starten wir sauber neu
  }

  const conversation = createConversation()

  return {
    conversations: [conversation],
    activeConversationId: conversation.id,
  }
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatState, setChatState] = useState<ChatState>(loadStoredChatState)
  const [input, setInput] = useState('')

  const activeConversation =
    chatState.conversations.find(
      (conversation) => conversation.id === chatState.activeConversationId
    ) || chatState.conversations[0]

  const messages = activeConversation.messages

  useEffect(() => {
    sessionStorage.setItem(chatStorageKey, JSON.stringify(chatState))
  }, [chatState])

  function startNewConversation() {
    const conversation = createConversation()

    setChatState((currentState) => ({
      conversations: [conversation, ...currentState.conversations],
      activeConversationId: conversation.id,
    }))

    setInput('')
  }

  function selectConversation(conversationId: string) {
    setChatState((currentState) => ({
      ...currentState,
      activeConversationId: conversationId,
    }))

    setInput('')
  }

  function deleteConversation(conversationId: string) {
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

      return {
        conversations: remainingConversations,
        activeConversationId:
          currentState.activeConversationId === conversationId
            ? remainingConversations[0].id
            : currentState.activeConversationId,
      }
    })

    setInput('')
  }

  return (
    <ChatContext.Provider
      value={{
        chatState,
        setChatState,
        activeConversation,
        messages,
        input,
        setInput,
        startNewConversation,
        selectConversation,
        deleteConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)

  if (!context) {
    throw new Error('useChat muss innerhalb von ChatProvider verwendet werden')
  }

  return context
}