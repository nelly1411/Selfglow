import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Heart,
  ShoppingCart,
  Trash2,
  Star,
  ArrowLeft,
} from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { useWishlist, type WishlistItem } from '@/context/WishlistContext'
import { useCart } from '@/context/CartContext'
import { cn } from '@workspace/ui/lib/utils'
import { useAuth } from '@/context/AuthContext'

export default function Wishlist() {
  const { items, removeFromWishlist } = useWishlist()
  const { addToCart } = useCart()
  const { isLoggedIn } = useAuth()

  const navigate = useNavigate()

  const [itemToDelete, setItemToDelete] =
    useState<WishlistItem | null>(null)

  const handleAddToCart = (item: WishlistItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      image: item.image,
    })
  }

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8">

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#5F5F5F] hover:text-[#D4A574] mb-10 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Zurück</span>
        </button>

        <div className="text-center py-16">
          <div className="w-24 h-24 bg-[#F5E6D3] rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-12 w-12 text-[#D4A574]" />
          </div>

          <h1 className="text-2xl font-bold mb-4">
            Bitte einloggen
          </h1>

          <p className="text-muted-foreground mb-8">
            Melde dich an, um deine Merkliste zu sehen und Produkte zu speichern.
          </p>

          <Link to="/login">
            <Button className="bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full px-8">
              Zum Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#5F5F5F] hover:text-[#D4A574] mb-10 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Zurück</span>
        </button>

        <div className="text-center py-16">
          <div className="w-24 h-24 bg-[#F5E6D3] rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-12 w-12 text-[#D4A574]" />
          </div>

          <h1 className="text-2xl font-bold mb-4">
            Deine Merkliste ist leer
          </h1>

          <p className="text-muted-foreground mb-8">
            Speichere deine Lieblingsprodukte, um sie später wiederzufinden.
          </p>

          <Link to="/shop">
            <Button className="bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full px-8">
              Produkte entdecken
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#5F5F5F] hover:text-[#D4A574] mb-6 transition"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Zurück</span>
      </button>

      <h1 className="text-2xl font-bold mb-2">
        Meine Merkliste
      </h1>

      <p className="text-muted-foreground mb-8">
        {items.length} Produkt{items.length !== 1 && 'e'} gespeichert
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const rating = item.rating ?? 0

          return (
            <div
              key={item.id}
              className="group bg-background rounded-xl border overflow-hidden hover:shadow-lg transition"
            >

              {/* IMAGE */}
              <div className="relative aspect-square bg-[#F5F5F5]">
                <Link to={`/product/${item.id}`}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </Link>

                {/* REMOVE */}
                <button
                  onClick={() => setItemToDelete(item)}
                  className="absolute top-3 right-3 p-2 bg-white rounded-full shadow hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-[#D4A574]" />
                </button>
              </div>

              {/* CONTENT */}
              <div className="p-4">

                <p className="text-xs text-muted-foreground mb-1">
                  {item.category}
                </p>

                <Link to={`/product/${item.id}`}>
                  <h3 className="text-sm font-medium mb-2 hover:text-[#D4A574]">
                    {item.name}
                  </h3>
                </Link>

                {/* RATING */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-3 w-3',
                          i < Math.floor(rating)
                            ? 'fill-[#D4A574] text-[#D4A574]'
                            : 'fill-muted text-muted'
                        )}
                      />
                    ))}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    ({item.reviews ?? 0})
                  </span>
                </div>

                {/* PRICE */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold">
                    €{item.price.toFixed(2)}
                  </span>
                </div>

                {/* CART BUTTON */}
                <Button
                  onClick={() => handleAddToCart(item)}
                  className="w-full bg-[#F5E6D3] hover:bg-[#E8D5C0] rounded-full"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  In den Warenkorb
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* DELETE MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm text-center shadow-lg">

            <h2 className="text-xl font-bold mb-3">
              Produkt entfernen?
            </h2>

            <p className="text-muted-foreground mb-6">
              Möchtest du dieses Produkt wirklich aus deiner Merkliste entfernen?
            </p>

            <div className="flex gap-3 justify-center">

              <Button
                onClick={() => setItemToDelete(null)}
                className="bg-gray-100 text-black hover:bg-gray-200 rounded-full px-6"
              >
                Abbrechen
              </Button>

              <Button
                onClick={() => {
                  removeFromWishlist(itemToDelete.id)
                  setItemToDelete(null)
                }}
                className="bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full px-6"
              >
                Entfernen
              </Button>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}