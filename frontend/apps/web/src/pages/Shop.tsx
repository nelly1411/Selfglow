import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Star, ChevronDown, ChevronUp, ShoppingCart, Filter, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Slider } from '@workspace/ui/components/slider'
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

const PRODUCTS_PER_PAGE = 25

const skinTypes = [
  { name: 'Combination', count: 18 },
  { name: 'Dry', count: 5 },
  { name: 'Oily', count: 20 },
  { name: 'Normal', count: 12 },
  { name: 'Sensitive', count: 8 },
]

const concerns = [
  { name: 'Acne' },
  { name: 'Anti-Aging' },
  { name: 'Grosse Poren' },
  { name: 'Rötungen' },
]

const productTypes = [
  { name: 'Cleansers' },
  { name: 'Serums' },
  { name: 'Moisturizers' },
  { name: 'Eyecream' },
  { name: 'Gesichtsmasken' },
]

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border pb-4 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-medium text-foreground">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-[#D4A574]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#D4A574]" />
        )}
      </button>

      {isOpen && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const rating = product.rating ?? 0

  return (
    <div className="group bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/product/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden bg-[#F5F5F5]">
          <img
            src={product.imageUrl || 'https://placehold.co/300x300?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="p-4 pb-2">
          <p className="text-xs text-muted-foreground mb-1">{product.category}</p>

          <h3 className="font-medium text-foreground text-sm mb-1 line-clamp-2">
            {product.name}
          </h3>

          <p className="text-xs text-muted-foreground mb-2">{product.brand}</p>

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
              {rating.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">
              €{product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <Button className="w-full bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0] rounded-full text-sm">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  )
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [priceRange, setPriceRange] = useState([0, 200])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search')?.toLowerCase().trim() || ''

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('http://localhost:5050/api/products')

        if (!response.ok) {
          throw new Error('Produkte konnten nicht geladen werden')
        }

        const data: Product[] = await response.json()
        setProducts(data)
      } catch (err) {
        console.error(err)
        setError('Fehler beim Laden der Produkte')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const filteredProducts = products.filter((product) => {
    const matchesPrice =
      product.price >= priceRange[0] &&
      product.price <= priceRange[1]

    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery) ||
      product.brand.toLowerCase().includes(searchQuery) ||
      product.category.toLowerCase().includes(searchQuery) ||
      product.description?.toLowerCase().includes(searchQuery)

    return matchesPrice && matchesSearch
  })

  const visibleProducts = filteredProducts.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE)
  }, [priceRange, searchQuery])

  const FilterContent = () => (
    <>
      <FilterSection title="Skin Type">
        {skinTypes.map((type) => (
          <label key={type.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox />
            <span className="text-sm text-foreground">{type.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">({type.count})</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Concerns">
        {concerns.map((concern) => (
          <label key={concern.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox />
            <span className="text-sm text-foreground">{concern.name}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Product Type">
        {productTypes.map((type) => (
          <label key={type.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox />
            <span className="text-sm text-foreground">{type.name}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Price">
        <div className="px-2">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={0}
            max={200}
            step={1}
            className="mb-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>€{priceRange[0]}</span>
            <span>€{priceRange[1]}</span>
          </div>
        </div>
      </FilterSection>
    </>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="lg:hidden mb-4">
        <Button
          onClick={() => setMobileFiltersOpen(true)}
          variant="outline"
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 bg-background p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)}>
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>

            <FilterContent />
          </div>
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 border border-border rounded-xl p-6">
            <FilterContent />
          </div>
        </aside>

        <div className="flex-1">
          {loading && <p>Produkte werden geladen...</p>}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && searchQuery && (
            <p className="mb-4 text-sm text-muted-foreground">
              Suchergebnisse für:{' '}
              <span className="font-medium text-foreground">{searchQuery}</span>
            </p>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <p className="text-muted-foreground">Keine Produkte gefunden.</p>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Zeige 1 - {Math.min(visibleCount, filteredProducts.length)} von{' '}
                  {filteredProducts.length} Produkten
                </p>

                {visibleCount < filteredProducts.length && (
                  <Button
                    onClick={() => setVisibleCount((prev) => prev + PRODUCTS_PER_PAGE)}
                    className="bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0] rounded-full px-8"
                  >
                    Weitere Produkte laden
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}