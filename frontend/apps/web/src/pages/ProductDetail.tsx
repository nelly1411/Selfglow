import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Star, ShoppingCart, ArrowLeft } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

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

export default function ProductDetail() {
  const { id } = useParams()
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
        <div className="bg-[#F5F5F5] rounded-2xl overflow-hidden">
          <img
            src={product.imageUrl || 'https://placehold.co/600x600?text=No+Image'}
            alt={product.name}
            className="w-full aspect-square object-cover"
          />
        </div>

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

          <Button className="bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0] rounded-full px-8">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}