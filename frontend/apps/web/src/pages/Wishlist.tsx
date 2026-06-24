import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Heart,
  ShoppingCart,
  Trash2,
  Star,
  ArrowLeft,
  Check,
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

  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null)
  const [cartToastVisible, setCartToastVisible] = useState(false)
  const [cartToastLeaving, setCartToastLeaving] = useState(false)
  const [cartToastEntered, setCartToastEntered] = useState(false)

  const handleAddToCart = (item: WishlistItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      image: item.image,

      skinTypes: item.skinTypes,
      concerns: item.concerns,
      vegan: item.vegan,
      alcoholFree: item.alcoholFree,
      fragranceFree: item.fragranceFree,


    })

    setCartToastVisible(true)
    setCartToastLeaving(false)
    setCartToastEntered(false)

    setTimeout(() => setCartToastEntered(true), 100)
    setTimeout(() => setCartToastLeaving(true), 2200)
    setTimeout(() => setCartToastVisible(false), 2800)
  }

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#5F5F5F] hover:text-[#D4A574] mb-10 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Zurück</span>
        </button>

        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#F5E6D3] rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-10 w-10 sm:h-12 sm:w-12 text-[#D4A574]" />
          </div>

          <h1 className="text-2xl font-bold mb-4">Bitte einloggen</h1>

          <p className="text-muted-foreground mb-8">
            Melde dich an, um deine Merkliste zu sehen und Produkte zu speichern.
          </p>

          <Link to="/login">
            <Button className="bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full px-8">
              Zur Anmeldung
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#5F5F5F] hover:text-[#D4A574] mb-10 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Zurück</span>
        </button>

        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#F5E6D3] rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-10 w-10 sm:h-12 sm:w-12 text-[#D4A574]" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold mb-4">
            Deine Merkliste ist leer
          </h1>

          <p className="text-muted-foreground mb-8 text-sm sm:text-base">
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
      {cartToastVisible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none px-4 w-full sm:w-auto">
          <div
            className={cn(
              'flex items-center gap-3 rounded-2xl bg-[#D4A574] px-5 sm:px-6 py-3 sm:py-4 text-white shadow-2xl transition-all duration-500 ease-out mx-auto max-w-fit',
              !cartToastEntered && 'opacity-0 -translate-y-4 scale-95',
              cartToastEntered &&
                !cartToastLeaving &&
                'opacity-100 translate-y-0 scale-100',
              cartToastLeaving && 'opacity-0 -translate-y-3 scale-95'
            )}
          >
            <Check className="h-5 w-5 shrink-0" />

            <span className="text-xs sm:text-sm font-medium">
              Produkt wurde zum Warenkorb hinzugefügt
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#5F5F5F] hover:text-[#D4A574] mb-6 transition"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Zurück</span>
      </button>

      <h1 className="text-xl sm:text-2xl font-bold mb-2">Meine Merkliste</h1>

      <p className="text-muted-foreground mb-8 text-sm sm:text-base">
        {items.length} Produkt{items.length !== 1 && 'e'} gespeichert
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg: grid-cols-1 gap-4 sm:gap-5">
        {items.map((item) => {
          const rating = item.rating ?? 0

          return (
            <div
              key={item.id}
              className="group flex flex-col lg:flex-row gap-4 lg:gap-6 rounded-[20px] rounded-[28px] border border-[#F0DCC8] bg-white p-3 sm:p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-32 sm:h-40 lg:h-40 w-full lg:w-40 shrink-0 rounded-2xl bg-[#F8F2EC] overflow-hidden">
                <Link to={`/product/${item.id}`}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain p-3 sm:p-4 group-hover:scale-105 transition"
                  />
                </Link>

                <button
                  onClick={() => setItemToDelete(item)}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-white rounded-full shadow hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#D4A574]" />
                </button>
              </div>

              <div className="flex flex-1 flex-col p-1 sm:p-4 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {item.category}
                </p>

                <Link to={`/product/${item.id}`}>
                  <h3 className="min-h-[40px] sm:min-h-[56px] text-sm font-medium mb-2 hover:text-[#D4A574] line-clamp-2">
                    {item.name}
                  </h3>
                </Link>

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

                <div className="mt-auto flex items-center gap-2 mb-3">
                  <span className="font-bold text-sm sm:text-base">
                    {item.price.toFixed(2).replace('.', ',')} €
                  </span>
                </div>

                <Button
                  onClick={() => handleAddToCart(item)}
                  className="w-full bg-[#F5E6D3] hover:bg-[#E8D5C0] rounded-full text-xs sm:text-sm px-2 sm:px-4"
                >
                  <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                  <span className='truncate'>
                  In den Warenkorb
                  </span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-lg">
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