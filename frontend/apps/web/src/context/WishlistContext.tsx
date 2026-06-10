import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiUrl } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export interface WishlistItem {
  id: number
  name: string
  category: string
  price: number
  image: string
  rating: number
  reviews: number

  skinTypes?: string | null
  concerns?: string | null
  vegan?: boolean
  alcoholFree?: boolean
  fragranceFree?: boolean
}

type BackendWishlistItem = {
  id: number
  product: {
    id: number
    name: string
    category: string
    price: number
    imageUrl?: string | null
    image?: string | null
    rating?: number | null
    reviews?: number | null
  }
}

interface WishlistContextType {
  items: WishlistItem[]
  addToWishlist: (item: WishlistItem) => Promise<void>
  removeFromWishlist: (id: number) => Promise<void>
  isInWishlist: (id: number) => boolean
  totalItems: number
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

function mapBackendItem(item: BackendWishlistItem): WishlistItem {
  return {
    id: item.product.id,
    name: item.product.name,
    category: item.product.category,
    price: item.product.price,
    image: item.product.imageUrl || item.product.image || '',
    rating: item.product.rating || 0,
    reviews: item.product.reviews || 0,
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { token, isLoggedIn, logout } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])

  useEffect(() => {
    async function loadWishlist() {
      if (!isLoggedIn || !token) {
        setItems([])
        return
      }

      const response = await fetch(apiUrl('/api/wishlist'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
        }

        setItems([])
        return
      }

      const data: BackendWishlistItem[] = await response.json()
      setItems(data.map(mapBackendItem))
    }

    loadWishlist()
  }, [isLoggedIn, token, logout])

  const addToWishlist = async (item: WishlistItem) => {
    if (!isLoggedIn || !token) {
      return
    }

    const response = await fetch(apiUrl(`/api/wishlist/${item.id}`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        logout()
        setItems([])
      }

      return
    }

    const data: BackendWishlistItem = await response.json()
    const newItem = mapBackendItem(data)

    setItems((prev) => {
      if (prev.some((i) => i.id === newItem.id)) return prev
      return [...prev, newItem]
    })
  }

  const removeFromWishlist = async (id: number) => {
    if (!isLoggedIn || !token) {
      return
    }

    const response = await fetch(apiUrl(`/api/wishlist/${id}`), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        logout()
        setItems([])
      }

      return
    }

    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const isInWishlist = (id: number) => {
    return items.some((item) => item.id === id)
  }

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        totalItems: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)

  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }

  return context
}
