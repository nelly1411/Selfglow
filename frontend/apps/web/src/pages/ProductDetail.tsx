import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Star, ShoppingCart, ArrowLeft, Heart, User, CheckCircle } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'

type Product = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  imageUrl?: string | null
  description?: string | null
  rating?: number | null
}
const mockReviews = [
  {
    id: 1,
    userName: 'Maria S.',
    rating: 5,
    title: 'Absolut top!',
    comment: 'Meine Haut hat sich extrem verbessert.',
    date: '2026-01-10',
    verified: true,
  },
  {
    id: 2,
    userName: 'Tom K.',
    rating: 4,
    title: 'Sehr gut',
    comment: 'Zieht schnell ein und riecht angenehm.',
    date: '2026-01-08',
    verified: false,
  },
]

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { isLoggedIn } = useAuth()
  const [showLoginHint, setShowLoginHint] = useState(false)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`http://localhost:5050/api/products/${id}`)

        if (!response.ok) {
          throw new Error('Produkt konnte nicht geladen werden')
        }

        const data: Product = await response.json()
        setProduct(data)
      } catch (err) {
        console.error(err)
        setError('Fehler beim Laden des Produkts')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  function handleAddToCart() {
    if (!product) return
  
    addToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.imageUrl || 'https://placehold.co/300x300?text=No+Image',
    })

    navigate('/cart')
  }

  function handleWishlistToggle() {
    if (!product) return

      if (!isLoggedIn) {
      setShowLoginHint(true)
      return
    }

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id)
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        image: product.imageUrl || 'https://placehold.co/300x300?text=No+Image',
        rating: product.rating ?? 0,
        reviews: 0,
      })
    }
  }

  const inWishlist = product ? isInWishlist(product.id) : false

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        Produkt wird geladen...
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-red-500 mb-4">{error || 'Produkt nicht gefunden.'}</p>

        <Link to="/shop">
          <Button variant="outline">
            Zurück zum Shop
          </Button>
        </Link>
      </div>
    )
  }

  const rating = product.rating ?? 0

  return (
    <div className="container mx-auto px-4 py-10">
      <Link
        to="/shop"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Bild */}
        <div className="bg-[#F5F5F5] rounded-2xl overflow-hidden">
          <img
            src={product.imageUrl || 'https://placehold.co/600x600?text=No+Image'}
            alt={product.name}
            className="w-full aspect-square object-cover"
          />
        </div>

        {/* Infos */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {product.category}
          </p>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {product.name}
          </h1>

          <p className="text-muted-foreground mb-4">
            {product.brand}
          </p>

          <div className="flex items-center gap-2 mb-5">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-5 w-5',
                    i < Math.floor(rating)
                      ? 'fill-[#D4A574] text-[#D4A574]'
                      : 'fill-muted text-muted'
                  )}
                />
              ))}
            </div>

            <span className="text-sm text-muted-foreground">
              {rating.toFixed(1)}
            </span>
          </div>

          <p className="text-3xl font-bold mb-6">
            €{product.price.toFixed(2)}
          </p>

          <p className="text-muted-foreground leading-relaxed mb-8">
            {product.description || 'Keine Beschreibung vorhanden.'}
          </p>

          {/* Buttons */}
          <div className="relative flex gap-4">
            <Button
              onClick={handleAddToCart}
              className="flex-1 bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0] rounded-full px-8"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              In den Warenkorb
            </Button>
            
            <Button
              onClick={handleWishlistToggle}
              variant="outline"
              className={cn(
                "rounded-full px-4 border-2 transition-colors",
                inWishlist 
                  ? "border-[#D4A574]  hover:bg-red-100" 
                  : "border-[#D4A574] hover:bg-[#F5E6D3]"
              )}
              aria-label={inWishlist ? "Aus Merkliste entfernen" : "Zur Merkliste hinzufügen"}
            >
              <Heart className={cn("h-5 w-5", inWishlist ? 'fill-[#D4A574] text-[#D4A574]' : "text-[#D4A574]")} />
            </Button>

            {showLoginHint && (
              <div className="absolute top-14 right-0 z-20 w-64 rounded-xl bg-white p-3 text-xs shadow-lg border border-border">
                <p className="mb-2 text-foreground">
                  Bitte einloggen, um Produkte zu speichern.
                </p>

                <Link to="/login" className="font-medium text-[#D4A574] hover:underline">
                  Zum Login
                </Link>
              </div>
            )}
          </div>
          
        </div>
      </div>
    {/* REVIEWS SECTION */}
<div className="mt-12 border-t pt-10">
  <h2 className="text-2xl font-bold mb-6">
    Kundenbewertungen
  </h2>

  <div className="space-y-6">
    {mockReviews.map((review) => (
      <div key={review.id} className="border-b pb-5">

        <div className="flex items-center justify-between mb-2">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F5E6D3] flex items-center justify-center">
              <User className="h-5 w-5 text-[#D4A574]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{review.userName}</span>

                {review.verified && (
                  <span className="text-xs flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Kauf bestätigt
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {review.date}
              </p>
            </div>
          </div>

          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i < review.rating
                    ? 'fill-[#D4A574] text-[#D4A574]'
                    : 'fill-muted text-muted'
                )}
              />
            ))}
          </div>

        </div>

        <h4 className="font-semibold mb-1">
          {review.title}
        </h4>

        <p className="text-muted-foreground text-sm">
          {review.comment}
        </p>

      </div>
    ))}
  </div>
</div>
</div>

  )
}
