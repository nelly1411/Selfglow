import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Star,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Filter,
  X,
  Heart,
  Check,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { apiUrl } from '@/lib/api'
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
  skinTypes?: string | null
  concerns?: string | null
  vegan?: boolean
  alcoholFree?: boolean
  fragranceFree?: boolean
}

const PRODUCTS_PER_PAGE = 25

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price-asc', label: 'Preis (niedrig - hoch)' },
  { value: 'price-desc', label: 'Preis (hoch - niedrig)' },
]

const skinTypes = [
  { name: 'Combination', label: 'Mischhaut' },
  { name: 'Dry', label: 'Trockene Haut' },
  { name: 'Oily', label: 'Fettige Haut' },
  { name: 'Normal', label: 'Normale Haut' },
  { name: 'Sensitive', label: 'Sensible Haut' },
]

const concerns = [
  { name: 'Acne', label: 'Akne' },
  { name: 'Anti-Aging', label: 'Anti-Aging' },
  { name: 'Grosse Poren', label: 'Große Poren' },
  { name: 'Rötungen', label: 'Rötungen' },
]

const productTypes = [
  { name: 'Gesichtsreinigung' },
  { name: 'Serum' },
  { name: 'Toner' },
  { name: 'Feuchtigkeitspflege' },
  { name: 'Sonnenschutz' },
]

const productFeatures = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'alcoholFree', label: 'Alkoholfrei' },
  { key: 'fragranceFree', label: 'Parfümfrei' },
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

  const { addToCart, updateQuantity, removeFromCart, items } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { isLoggedIn } = useAuth()

  const cartItem = items.find((item) => item.id === product.id)
  const isInCart = Boolean(cartItem)
  const inWishlist = isInWishlist(product.id)

  const [showLoginHint, setShowLoginHint] = useState(false)
  const [cartToastVisible, setCartToastVisible] = useState(false)
  const [cartToastLeaving, setCartToastLeaving] = useState(false)
  const [cartToastEntered, setCartToastEntered] = useState(false)

  const handleAddToCart = async () => {
    await addToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.imageUrl || 'https://placehold.co/300x300?text=Kein+Bild',
    })

    setCartToastVisible(true)
    setCartToastLeaving(false)
    setCartToastEntered(false)

    setTimeout(() => {
      setCartToastEntered(true)
    }, 100)

    setTimeout(() => {
      setCartToastLeaving(true)
    }, 2200)

    setTimeout(() => {
      setCartToastVisible(false)
    }, 2800)
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      setShowLoginHint(true)
      return
    }

    if (inWishlist) {
      removeFromWishlist(product.id)
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        image: product.imageUrl || 'https://placehold.co/300x300?text=Kein+Bild',
        rating: product.rating ?? 0,
        reviews: 0,
      })
    }
  }

  return (
    <>
      {cartToastVisible && (
       <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
         <div
  className={cn(
    'flex items-center gap-3 rounded-2xl bg-[#D4A574] px-6 py-4 text-white shadow-2xl transition-all duration-500 ease-out',
    !cartToastEntered && 'opacity-0 -translate-y-4 scale-95',
    cartToastEntered && !cartToastLeaving && 'opacity-100 translate-y-0 scale-100',
    cartToastLeaving && 'opacity-0 -translate-y-3 scale-95'
  )}
>
  <Check className="h-5 w-5" />

  <span className="text-sm font-medium">
    Produkt wurde zum Warenkorb hinzugefügt
  </span>
</div>
        </div>
      )}

      <div className="group bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative">
          <Link to={`/product/${product.id}`} className="block">
            <div className="aspect-square overflow-hidden bg-[#F5F5F5]">
              <img
                src={product.imageUrl || 'https://placehold.co/300x300?text=Kein+Bild'}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>

          <button
            onClick={handleWishlistToggle}
            className={cn(
              'absolute top-3 right-3 p-2 rounded-full shadow-md transition-colors z-10',
              inWishlist
                ? 'bg-red-50 hover:bg-red-100'
                : 'bg-white hover:bg-gray-50'
            )}
            aria-label={
              inWishlist
                ? 'Aus Merkliste entfernen'
                : 'Zur Merkliste hinzufügen'
            }
          >
            <Heart
              className={cn(
                'h-4 w-4',
                inWishlist
                  ? 'fill-[#D4A574] text-[#D4A574]'
                  : 'text-gray-500'
              )}
            />
          </button>

          {showLoginHint && (
            <div className="absolute top-12 left-3 right-3 z-20 rounded-xl bg-white p-3 text-xs shadow-lg border border-border">
              <p className="mb-2 text-foreground">
                Bitte einloggen, um Produkte zu speichern.
              </p>

              <Link
                to="/login"
                className="font-medium text-[#D4A574] hover:underline"
              >
                Zur Anmeldung
              </Link>
            </div>
          )}
        </div>

        <Link to={`/product/${product.id}`} className="block">
          <div className="p-4 pb-2">
            <p className="text-xs text-muted-foreground mb-1">
              {product.category}
            </p>

            <h3 className="font-medium text-foreground text-sm mb-1 line-clamp-2 hover:text-[#D4A574] transition-colors">
              {product.name}
            </h3>

            <p className="text-xs text-muted-foreground mb-2">
              {product.brand}
            </p>

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
                {product.price.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </span>
            </div>
          </div>
        </Link>

        <div className="px-4 pb-4">
          {isInCart && cartItem ? (
            <div className="w-full flex items-center justify-center gap-4 bg-[#D4A574] text-white rounded-full py-2 text-sm">
              <button
                onClick={() => {
                  if (cartItem.quantity === 1) {
                    removeFromCart(product.id)
                  } else {
                    updateQuantity(product.id, cartItem.quantity - 1)
                  }
                }}
                className="px-2"
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
              className="w-full rounded-full text-sm transition-colors bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0]"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              In den Warenkorb
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()

  const searchQuery = searchParams.get('search')?.toLowerCase().trim() || ''
  const categoryQuery = searchParams.getAll('category')
  const skinTypeQuery = searchParams.getAll('skinType')
  const concernQuery = searchParams.getAll('concern')

  const [products, setProducts] = useState<Product[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200])
  const [minPriceInput, setMinPriceInput] = useState('0')
  const [maxPriceInput, setMaxPriceInput] = useState('200')

  const [selectedSkinType, setSelectedSkinType] =
    useState<string[]>(() => skinTypeQuery)

  const [selectedConcern, setSelectedConcern] =
    useState<string[]>(() => concernQuery)

  const [selectedCategory, setSelectedCategory] =
    useState<string[]>(() => categoryQuery)

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE)
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  }, [
    searchQuery,
    categoryQuery.join(','),
    skinTypeQuery.join(','),
    concernQuery.join(','),
  ])

  useEffect(() => {
    setSelectedCategory(categoryQuery)
    setSelectedSkinType(skinTypeQuery)
    setSelectedConcern(concernQuery)
  }, [
    categoryQuery.join(','),
    skinTypeQuery.join(','),
    concernQuery.join(','),
  ])

  const toggleQueryValue = (
    key: string,
    value: string,
    selectedValues: string[],
    setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const params = new URLSearchParams(searchParams)
    params.delete(key)

    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value]

    nextValues.forEach((item) => {
      params.append(key, item)
    })

    setSelectedValues(nextValues)
    setSearchParams(params)
  }

  const resetAllFilters = () => {
    const params = new URLSearchParams(searchParams)

    params.delete('category')
    params.delete('skinType')
    params.delete('concern')

    setSelectedCategory([])
    setSelectedSkinType([])
    setSelectedConcern([])
    setSelectedFeatures([])

    setPriceRange([0, 200])
    setMinPriceInput('0')
    setMaxPriceInput('200')

    setSearchParams(params)
  }

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()

        if (searchQuery) {
          params.set('search', searchQuery)
        }

        selectedCategory.forEach((category) => {
          params.append('category', category)
        })

        selectedSkinType.forEach((skinType) => {
          params.append('skinType', skinType)
        })

        selectedConcern.forEach((concern) => {
          params.append('concern', concern)
        })

        selectedFeatures.forEach((feature) => {
          params.set(feature, 'true')
        })

        const queryString = params.toString()

        const response = await fetch(
          apiUrl(`/api/products${queryString ? `?${queryString}` : ''}`)
        )

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
  }, [
    searchQuery,
    selectedCategory,
    selectedSkinType,
    selectedConcern,
    selectedFeatures,
  ])

  const filteredProducts = products.filter((product) => {
    return (
      product.price >= priceRange[0] &&
      product.price <= priceRange[1]
    )
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name, 'de')
      case 'name-desc':
        return b.name.localeCompare(a.name, 'de')
      case 'price-asc':
        return a.price - b.price
      case 'price-desc':
        return b.price - a.price
      default:
        return 0
    }
  })

  const visibleProducts = sortedProducts.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE)
  }, [
    priceRange,
    searchQuery,
    selectedSkinType,
    selectedConcern,
    selectedCategory,
    selectedFeatures,
    sortBy,
  ])

  const renderFilterContent = () => (
    <>
      <FilterSection title="Hauttyp">
        {skinTypes.map((type) => (
          <label key={type.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selectedSkinType.includes(type.name)}
              onCheckedChange={() =>
                toggleQueryValue(
                  'skinType',
                  type.name,
                  selectedSkinType,
                  setSelectedSkinType
                )
              }
            />
            <span className="text-sm text-foreground">
              {type.label}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Hautanliegen">
        {concerns.map((concern) => (
          <label key={concern.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selectedConcern.includes(concern.name)}
              onCheckedChange={() =>
                toggleQueryValue(
                  'concern',
                  concern.name,
                  selectedConcern,
                  setSelectedConcern
                )
              }
            />
            <span className="text-sm text-foreground">
              {concern.label}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Produkteigenschaften">
        {productFeatures.map((feature) => (
          <label key={feature.key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selectedFeatures.includes(feature.key)}
              onCheckedChange={() =>
                setSelectedFeatures((prev) =>
                  prev.includes(feature.key)
                    ? prev.filter((item) => item !== feature.key)
                    : [...prev, feature.key]
                )
              }
            />
            <span className="text-sm text-foreground">
              {feature.label}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Produkttyp">
        {productTypes.map((type) => (
          <label key={type.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selectedCategory.includes(type.name)}
              onCheckedChange={() =>
                toggleQueryValue(
                  'category',
                  type.name,
                  selectedCategory,
                  setSelectedCategory
                )
              }
            />
            <span className="text-sm text-foreground">
              {type.name}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Preis">
        <div className="px-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">
                Min. Preis
              </label>

              <input
                type="number"
                min={0}
                max={200}
                value={minPriceInput}
                onChange={(e) => {
                  const val = e.target.value
                  setMinPriceInput(val)

                  const num = Number(val)

                  if (!Number.isNaN(num) && num >= 0 && num <= 200) {
                    setPriceRange([
                      Math.min(num, priceRange[1]),
                      priceRange[1],
                    ])
                  }
                }}
                onBlur={() => {
                  const num = Number(minPriceInput)

                  if (Number.isNaN(num) || num < 0) {
                    setMinPriceInput(String(priceRange[0]))
                  } else {
                    const clamped = Math.min(Math.max(0, num), priceRange[1])
                    setMinPriceInput(String(clamped))
                    setPriceRange([clamped, priceRange[1]])
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">
                Max. Preis
              </label>

              <input
                type="number"
                min={0}
                max={200}
                value={maxPriceInput}
                onChange={(e) => {
                  const val = e.target.value
                  setMaxPriceInput(val)

                  const num = Number(val)

                  if (!Number.isNaN(num) && num >= 0 && num <= 200) {
                    setPriceRange([
                      priceRange[0],
                      Math.max(num, priceRange[0]),
                    ])
                  }
                }}
                onBlur={() => {
                  const num = Number(maxPriceInput)

                  if (Number.isNaN(num) || num > 200) {
                    setMaxPriceInput(String(priceRange[1]))
                  } else {
                    const clamped = Math.max(Math.min(200, num), priceRange[0])
                    setMaxPriceInput(String(clamped))
                    setPriceRange([priceRange[0], clamped])
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={resetAllFilters}
            className="w-full rounded-full"
          >
            Alles Zurücksetzen
          </Button>
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
          Filter
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
              <h2 className="text-lg font-bold text-foreground">
                Filter
              </h2>

              <button onClick={() => setMobileFiltersOpen(false)}>
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {renderFilterContent()}
          </div>
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain border border-border rounded-xl p-6">
            {renderFilterContent()}
          </div>
        </aside>

        <div className="flex-1">
          {loading && <p>Produkte werden geladen...</p>}

          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && searchQuery && (
            <p className="mb-4 text-sm text-muted-foreground">
              Suchergebnisse für:{' '}
              <span className="font-medium text-foreground">
                {searchQuery}
              </span>
            </p>
          )}

          {!loading && !error && sortedProducts.length === 0 && (
            <p className="text-muted-foreground">
              Keine Produkte gefunden.
            </p>
          )}

          {!loading && !error && sortedProducts.length > 0 && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  {sortedProducts.length} Produkte
                </p>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="sort"
                    className="text-sm text-muted-foreground"
                  >
                    Sortieren:
                  </label>

                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as SortOption)
                    }
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Zeige 1 - {Math.min(visibleCount, sortedProducts.length)} von{' '}
                  {sortedProducts.length} Produkten
                </p>

                {visibleCount < sortedProducts.length && (
                  <Button
                    onClick={() =>
                      setVisibleCount((prev) => prev + PRODUCTS_PER_PAGE)
                    }
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