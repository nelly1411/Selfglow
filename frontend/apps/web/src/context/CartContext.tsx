import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'

export interface CartItem {
  id: number
  name: string
  category: string
  price: number
  originalPrice?: number
  image: string
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (product: Omit<CartItem, 'quantity'>) => void
  removeFromCart: (id: number) => void
  updateQuantity: (id: number, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

const getCartKey = (user: any): string | undefined =>
  user?.id ? `cart_user_${user.id}` : undefined

 const [items, setItems] = useState<CartItem[]>(() => {
  const key = getCartKey(user)
  if (!key) return []

  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
})

  // Load cart when user changes
  useEffect(() => {
  if (!user?.id) {
    setItems([]) // GAST = IMMER LEER
    return
  }

  const key = `cart_user_${user.id}`
  const stored = localStorage.getItem(key)

  setItems(stored ? JSON.parse(stored) : [])
}, [user])

  // Save cart
  useEffect(() => {
  const key = getCartKey(user)
  if (!key) return

  localStorage.setItem(key, JSON.stringify(items))
}, [items, user])

  const addToCart = (product: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) return removeFromCart(id)

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

 const clearCart = () => {
  setItems([])

  const key = getCartKey(user)
  if (key) {
    localStorage.removeItem(key)
  }
}

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}