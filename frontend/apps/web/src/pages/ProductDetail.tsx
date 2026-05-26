import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Star,
  ShoppingCart,
  ArrowLeft,
  Heart,
  User,
  CheckCircle,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/lib/api'
import { useReviews, type Review } from '@/context/ReviewsContext'
import ReviewForm from '@/components/ReviewForm'

type Product = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  imageUrl?: string | null
  description?: string | null
  ingredients?: string | null
  rating?: number | null
  application?: string | null
}

export default function ProductDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  const { items, addToCart, updateQuantity, removeFromCart } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { isLoggedIn, user, token } = useAuth()
  const { reviews, getProductReviews, getAverageRating, deleteReview } = useReviews();
  const [showLoginHint, setShowLoginHint] = useState(false)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<string[]>(['description'])
  const [addedToCart, setAddedToCart] = useState(false)
  const [averageRating, setAverageRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(apiUrl(`/api/products/${id}`))

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

  useEffect(() => {
    async function fetchReviews() {
      if (!id) return
      const productId = Number(id)
      await getProductReviews(productId)
      const ratingData = await getAverageRating(productId)
      setAverageRating(ratingData.average)
      setReviewCount(ratingData.count)
    }
    fetchReviews()
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

  function toggleSection(sectionId: string) {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  async function handleDeleteReview(reviewId: number) {
    if (!token) return
    setDeleteConfirmId(reviewId)
  }
  async function confirmDeleteReview() {
    if (!token || !deleteConfirmId) return
    setDeletingReviewId(deleteConfirmId)

    const success = await deleteReview(deleteConfirmId, token)

    if (success && id) {
      const productId = Number(id)
      await getProductReviews(productId)
      const ratingData = await getAverageRating(productId)
      setAverageRating(ratingData.average)
      setReviewCount(ratingData.count)
  }

    setDeletingReviewId(null)
    setDeleteConfirmId(null)
  }

  function handleReviewAdded() {
    if (!id) return
    const productId = Number(id)
    getProductReviews(productId)
    getAverageRating(productId).then((data) => {
      setAverageRating(data.average)
      setReviewCount(data.count)
    })
  }

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
        <p className="text-red-500 mb-4">
          {error || 'Produkt nicht gefunden.'}
        </p>

        <Link to="/shop">
          <Button variant="outline">Zurück zum Shop</Button>
        </Link>
      </div>
    )
  }

  const displayRating = averageRating > 0 ? averageRating : product.rating ?? 0
  const inWishlist = isInWishlist(product.id)
  const cartItem = items.find((item) => item.id === product.id)
  const isInCart = Boolean(cartItem)
  const fromChatbot = searchParams.get('from') === 'chatbot'

  const detailSections = [
    {
      id: 'description',
      title: 'Beschreibung',
      content: product.description || 'Keine Beschreibung vorhanden.',
    },
    {
      id: 'usage',
      title: 'Anwendung',
      content: product.application || 'Keine Anwendungshinweise vorhanden.',
    },
    {
      id: 'ingredients',
      title: 'Inhaltsstoffe',
      content: product.ingredients || 'Keine Inhaltsstoffe vorhanden.',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Shop
        </Link>

        {fromChatbot && (
          <Link
            to="/chatbot"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8D5C0] px-4 py-2 text-sm text-[#A97745] transition-colors hover:bg-[#FDF7F0]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur KI-Beratung
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="rounded-2xl overflow-hidden flex items-start justify-center">
          <img
            src={product.imageUrl || 'https://placehold.co/600x600?text=No+Image'}
            alt={product.name}
            className="max-h-[620px] w-auto object-contain"
          />
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {product.category}
          </p>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {product.name}
          </h1>

          <p className="text-muted-foreground mb-4">{product.brand}</p>

          <div className="flex items-center gap-2 mb-5">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-5 w-5',
                    i < Math.floor(displayRating)
                      ? 'fill-[#D4A574] text-[#D4A574]'
                      : 'fill-muted text-muted'
                  )}
                />
              ))}
            </div>

            <span className="text-sm text-muted-foreground">
              {displayRating.toFixed(1)} ({reviewCount}{' '})
              {reviewCount === 1 ? 'Bewertung' : 'Bewertungen'}
            </span>
          </div>

          <p className="text-3xl font-bold mb-6">
            €{product.price.toFixed(2)}
          </p>

          <div className="mb-8 space-y-3">
            {detailSections.map((section) => {
              const isOpen = openSections.includes(section.id)

              return (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[#E8D5C0] bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left font-medium hover:bg-[#FDF7F0] transition"
                  >
                    {section.title}

                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-[#D4A574] transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-muted-foreground leading-relaxed text-sm">
                      {section.content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="relative flex gap-4">
           {isInCart && cartItem ? (
              <div className="flex-1 flex items-center justify-center gap-4 bg-[#D4A574] text-white rounded-full py-2">
                <span className="text-sm ">Menge</span>

                <button
                  onClick={() => {
                  if (cartItem.quantity === 1) {
                    removeFromCart(product.id)
                  } else {
                    updateQuantity(product.id, cartItem.quantity - 1)
                  }
                }}
                  className="px-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Menge verringern"
                >
                  -
                </button>

                <span>{cartItem.quantity}</span>

                <button
                  onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                  className="px-2"
                  aria-label="Menge erhöhen"
                >
                  +
                </button>
              </div>
            ) : (
              <Button
                onClick={handleAddToCart}
                className="flex-1 rounded-full px-8 text-foreground transition-colors bg-[#F5E6D3] hover:bg-[#E8D5C0]"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                In den Warenkorb
              </Button>
            )}

            <Button
              onClick={handleWishlistToggle}
              variant="outline"
              className={cn(
                'rounded-full px-4 border-2 transition-colors',
                inWishlist
                  ? 'border-[#D4A574] hover:bg-red-100'
                  : 'border-[#D4A574] hover:bg-[#F5E6D3]'
              )}
              aria-label={
                inWishlist
                  ? 'Aus Merkliste entfernen'
                  : 'Zur Merkliste hinzufügen'
              }
            >
              <Heart
                className={cn(
                  'h-5 w-5',
                  inWishlist
                    ? 'fill-[#D4A574] text-[#D4A574]'
                    : 'text-[#D4A574]'
                )}
              />
            </Button>

            {showLoginHint && (
              <div className="absolute top-14 right-0 z-20 w-64 rounded-xl bg-white p-3 text-xs shadow-lg border border-border">
                <p className="mb-2 text-foreground">
                  Bitte einloggen, um Produkte zu speichern.
                </p>

                <Link
                  to="/login"
                  className="font-medium text-[#D4A574] hover:underline"
                >
                  Zum Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*reviews*/}
      <div className="mt-12 border-t pt-10 px-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Kundenbewertungen</h2>

          <Button
            onClick={() => setIsReviewFormOpen(true)}
            className="bg-[#D4A574] text-white hover:bg-[#C69563] px-6 py-3 text-base font-semibold"
          >
            Bewertung schreiben
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Noch keine Bewertungen.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review: Review) => (
              <div key={review.id} className="border-b pb-5 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-[#F5E6D3] flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-[#D4A574]" />
                    </div>
 
                    <div className="flex-1">
                      <span className="font-medium text-foreground">
                        {review.user?.name || 'Anonymer Benutzer'}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
 
                  {/*Delete button*/}
                  {user && review.userId === user.id && (
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deletingReviewId === review.id}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all p-2 rounded-lg"
                      aria-label="Bewertung löschen"
                      title="Bewertung löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
 
                {/* Sterne */}
                <div className="flex mb-2">
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
 
                <p className="text-muted-foreground text-sm">{review.reviewText}</p>
              </div>
            ))}
          </div>
        )}
 
        <ReviewForm
          productId={product.id}
          isOpen={isReviewFormOpen}
          onClose={() => setIsReviewFormOpen(false)}
          onReviewAdded={handleReviewAdded}
        />
        {/*delete confirm modal*/}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-[560px] rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-[#EFE6DC] px-10 py-9 text-center">
              <h3 className="text-2xl font-bold mb-3">
                Bewertung löschen?
              </h3>

              <p className="text-muted-foreground mb-8">
                Möchten Sie diese bewertung wirklich löschen?
              </p>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 rounded-full hover:bg-[#F5E6D3] hover:border-[#D4A574]"
                >
                  Abbrechen
                </Button>

                <Button
                  onClick={confirmDeleteReview}
                  className="flex-1 rounded-full bg-[#D4A574] text-white hover:bg-[#C69563]"
                  disabled={deletingReviewId !== null}
                >
                  Löschen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
