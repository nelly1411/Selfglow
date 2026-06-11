import { createContext, useContext, useState, useEffect, type ReactNode, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/lib/api'

export interface CartItem {
  id: number
  name: string
  category: string
  price: number
  originalPrice?: number
  image: string
  quantity: number
  selected?: boolean

  skinTypes?: string | null
  concerns?: string | null
  vegan?: boolean
  alcoholFree?: boolean
  fragranceFree?: boolean
}

interface CartContextType {
  items: CartItem[]
  addToCart: (product: Omit<CartItem, 'quantity'>) => Promise<void>
  removeFromCart: (id: number) =>Promise<void>
  updateQuantity: (id: number, quantity: number) => Promise<void>
  updateSelected: (id: number, selected: boolean) => Promise<void>
  clearCart: () => Promise<void>
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isLoggedIn } = useAuth()
  const wasLoggedIn = useRef(isLoggedIn)

  const [items, setItems] = useState<CartItem[]>(() => {
  const stored = localStorage.getItem('cart')
  return stored ? JSON.parse(stored) : []
})

useEffect(() => {
    if (!isLoggedIn  && items.length > 0) {
      localStorage.setItem('cart', JSON.stringify(items))
    }
}, [items, isLoggedIn])

useEffect(() => {
  if (wasLoggedIn.current && !isLoggedIn) {
    setItems([])
    localStorage.removeItem('cart')
  }

  wasLoggedIn.current = isLoggedIn
}, [isLoggedIn])

  const addToCart =async (product: Omit<CartItem, 'quantity'>) => {
      // Wenn der User eingeloggt ist, wird das Produkt zusätzlich im Backend gespeichert.
    if (isLoggedIn && token) {
      await fetch(apiUrl(`/api/cart/items/${product.id}`), {        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }

    // Danach wird der Warenkorb im Frontend aktualisiert,
    // damit die Änderung sofort sichtbar ist.
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1, selected: true }]
    })
  }

 useEffect(() => {
  async function syncAndLoadBackendCart() {
    if (!isLoggedIn || !token) return

    const localCart = localStorage.getItem('cart')
    const localItems: CartItem[] = localCart ? JSON.parse(localCart) : []

    if (localItems.length > 0) {
      await fetch(apiUrl('/api/cart/sync'), {        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: localItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            selected: item.selected !== false,
          })),
        }),
      })

      localStorage.removeItem('cart')
    }

    const response = await fetch(apiUrl('/api/cart'), {      headers: {
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
      selected: cartItem.selected,
      skinTypes: cartItem.product.skinTypes,
      concerns: cartItem.product.concerns,
      vegan: cartItem.product.vegan,
      alcoholFree: cartItem.product.alcoholFree,
      fragranceFree: cartItem.product.fragranceFree,
     
    }))

    setItems(backendItems)
  }

  syncAndLoadBackendCart()
}, [isLoggedIn, token])

  const removeFromCart = async(id: number) => {
     if (isLoggedIn && token) {
      await fetch(apiUrl(`/api/cart/items/${id}`), {        method: 'DELETE',
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
      await fetch(apiUrl(`/api/cart/items/${id}/quantity`), {        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      })
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

  // Auswahl eines Produkts im Warenkorb ändern
  const updateSelected = async (id: number, selected: boolean) => {
    if (isLoggedIn && token) {
      await fetch(apiUrl(`/api/cart/items/${id}/selected`), {        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selected }),
      })
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected } : item
      )
    )
  }

  const clearCart = async () => {
    if (isLoggedIn && token) {
      await fetch(apiUrl('/api/cart'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }
    setItems([])
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
        updateSelected,
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