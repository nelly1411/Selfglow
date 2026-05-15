import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Star, ChevronDown, ChevronUp, ShoppingCart, Filter, X, Heart, Check } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Slider } from '@workspace/ui/components/slider'
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
  { name: 'Gesischtsreinigung' },
  { name: 'Serum' },
  { name: 'Toner' },
  { name: 'Feuchtigkeitspflege' },
  { name: 'Sonnenschutz' },
]

const productFeatures = [
  { key: 'vegan', label: 'Vegan'},
  { key: 'alcoholFree', label: 'Alcohol Free'},
  { key: 'fragranceFree', label: 'Fragrance Free'},
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
  const { addToCart, items } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const [justAdded, setJustAdded] = useState(false)
  const isInCart = items.some((item) => item.id === product.id)
  const inWishlist = isInWishlist(product.id)
  const { isLoggedIn } = useAuth()
  const [showLoginHint, setShowLoginHint] = useState(false)

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.imageUrl || 'https://placehold.co/300x300?text=No+Image',
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      // alert('Bitte melde dich an, um Produkte in deiner Merkliste zu speichern.')
      // navigate('/login')
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
        image: product.imageUrl || 'https://placehold.co/300x300?text=No+Image',
        rating: product.rating ?? 0,
        reviews: 0,
      })
    }
  }

  return (
    <div className="group bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <Link to={`/product/${product.id}`} className="block">
          <div className="aspect-square overflow-hidden bg-[#F5F5F5]">
            <img
              src={product.imageUrl || 'https://placehold.co/300x300?text=No+Image'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
        
        <button
          onClick={handleWishlistToggle}
          className={cn(
            "absolute top-3 right-3 p-2 rounded-full shadow-md transition-colors z-10",
            inWishlist 
              ? "bg-red-50 hover:bg-red-100" 
              : "bg-white hover:bg-gray-50"
          )}
          aria-label={inWishlist ? "Aus Merkliste entfernen" : "Zur Merkliste hinzufügen"}
        >
          <Heart className={cn("h-4 w-4", inWishlist ? 'fill-[#D4A574] text-[#D4A574]' : "text-gray-500")} />
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
            Zum Login
          </Link>
        </div>
        )}
      </div>

      <Link to={`/product/${product.id}`} className="block">
        <div className="p-4 pb-2">
          <p className="text-xs text-muted-foreground mb-1">{product.category}</p>

          <h3 className="font-medium text-foreground text-sm mb-1 line-clamp-2 hover:text-[#D4A574] transition-colors">
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
        <Button 
          onClick={handleAddToCart}
          className={cn(
            "w-full rounded-full text-sm transition-colors",
            justAdded 
              ? "bg-[#D4A574] text-white hover:bg-[#C49464]"
              : isInCart 
                ? "bg-[#D4A574] text-white hover:bg-[#C49464]"
                : "bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0]"
          )}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Hinzugefügt!
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isInCart ? 'Nochmal hinzufügen' : 'In den Warenkorb'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [priceRange, setPriceRange] = useState([0, 200])
  const [selectedSkinType, setSelectedSkinType] = useState<string | null>(null)
  const [selectedConcern, setSelectedConcern] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search')?.toLowerCase().trim() || ''
  const categoryQuery = searchParams.get('category') || ''
  const skinTypeQuery = searchParams.get('skinType') || ''

  useEffect(() => {
    setSelectedCategory(categoryQuery || null)
  }, [categoryQuery])

  useEffect(() => {
    setSelectedSkinType(skinTypeQuery || null)
  }, [skinTypeQuery])

  const handleCategoryChange = (categoryName: string) => {
    const params = new URLSearchParams(searchParams)

    if (selectedCategory === categoryName) {
      setSelectedCategory(null)
      params.delete('category')
    } else {
      setSelectedCategory(categoryName)
      params.set('category', categoryName)
    }

    setSearchParams(params)
  }

  const handleSkinTypeChange = (skinTypeName: string) => {
    const params = new URLSearchParams(searchParams)

    if (selectedSkinType === skinTypeName) {
      setSelectedSkinType(null)
      params.delete('skinType')
    } else {
      setSelectedSkinType(skinTypeName)
      params.set('skinType', skinTypeName)
    }

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

        if (selectedCategory) {
          params.set('category', selectedCategory)
        }

        if (selectedSkinType) {
          params.set('skinType', selectedSkinType)
        }

        if (selectedConcern) {
          params.set('concern', selectedConcern)
        }

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


  const visibleProducts = filteredProducts.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE)
  }, [priceRange, searchQuery, selectedSkinType, selectedConcern, selectedCategory, selectedFeatures ])

  const FilterContent = () => (
    <>
      <FilterSection title="Skin Type">
        {skinTypes.map((type) => (
          <label key={type.name} className="flex items-center gap-2 cursor-pointer">
           <Checkbox
              checked={selectedSkinType === type.name}
              onCheckedChange={() =>
                handleSkinTypeChange(
                 type.name
                )
              }
            />
            <span className="text-sm text-foreground">{type.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">({type.count})</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Concerns">
        {concerns.map((concern) => (
          <label key={concern.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
            checked={selectedConcern === concern.name}
            onCheckedChange={() =>
              setSelectedConcern(selectedConcern === concern.name ? null : concern.name)
              }
            />
            <span className="text-sm text-foreground">{concern.name}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Product Features">
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
          <span className="text-sm text-foreground">{feature.label}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Product Type">
        {productTypes.map((type) => (
          <label key={type.name} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
            checked={selectedCategory === type.name}
            onCheckedChange={() =>
              handleCategoryChange(type.name)
              }
            />
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
              <h2 className="text-lg font-bold text-foreground">Filter</h2>
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
