import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050'

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
  addToCart: (product: Omit<CartItem, 'quantity'>) => Promise<void>
  removeFromCart: (id: number) =>Promise<void>
  updateQuantity: (id: number, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isLoggedIn } = useAuth()

  const [items, setItems] = useState<CartItem[]>(() => {
  const stored = localStorage.getItem('cart')
  return stored ? JSON.parse(stored) : []
})

useEffect(() => {
  localStorage.setItem('cart', JSON.stringify(items))
}, [items])

  const addToCart =async (product: Omit<CartItem, 'quantity'>) => {
      // Wenn der User eingeloggt ist, wird das Produkt zusätzlich im Backend gespeichert.
    if (isLoggedIn && token) {
      await fetch(`${API_BASE_URL}/api/cart/items/${product.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }

    // Danach wird der Warenkorb im Frontend aktualisiert,
    // damit die Änderung sofort sichtbar ist.
    setItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id)
      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  useEffect(() => {
  async function loadBackendCart() {
    if (!isLoggedIn || !token) return

    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) return

    const cart = await response.json()

    const backendItems = cart.items.map((cartItem: any) => ({
      id: cartItem.product.id,
      name: cartItem.product.name,
      category: cartItem.product.category,
      price: cartItem.product.price,
      originalPrice: undefined,
      image: cartItem.product.imageUrl || '',
      quantity: cartItem.quantity,
    }))

    setItems(backendItems)
  }

  loadBackendCart()
}, [isLoggedIn, token]) //Wenn User eingeloggt ist → Cart aus Backend laden

  const removeFromCart = async(id: number) => {
     if (isLoggedIn && token) {
      await fetch(`${API_BASE_URL}/api/cart/items/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }

    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) {
      return
    }

    if (isLoggedIn && token) {
      await fetch(`${API_BASE_URL}/api/cart/items/${id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      })
    }

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    )
  }

  const clearCart = async () => {
    if (isLoggedIn && token) {
      await fetch(`${API_BASE_URL}/api/cart`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
