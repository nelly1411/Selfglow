import { useState } from 'react'
import { Star, ChevronDown, ChevronUp, ShoppingCart, Filter, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Slider } from '@workspace/ui/components/slider'
import { cn } from '@workspace/ui/lib/utils'

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

const products = [
  {
    id: 1,
    name: 'Hydra-Burst Serum',
    category: 'Serum',
    price: 45.00,
    originalPrice: 55.00,
    rating: 4.5,
    reviews: 128,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop',
  },
  {
    id: 2,
    name: 'Vitamin C Glow Cream',
    category: 'Moisturizer',
    price: 38.00,
    rating: 4.8,
    reviews: 245,
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&h=300&fit=crop',
  },
  {
    id: 3,
    name: 'Anti-Aging Eye Cream',
    category: 'Eyecream',
    price: 52.00,
    rating: 4.3,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=300&h=300&fit=crop',
  },
  {
    id: 4,
    name: 'Gentle Cleansing Foam',
    category: 'Cleanser',
    price: 24.00,
    rating: 4.6,
    reviews: 312,
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=300&h=300&fit=crop',
  },
  {
    id: 5,
    name: 'Hydrating Face Mask',
    category: 'Mask',
    price: 32.00,
    rating: 4.7,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=300&h=300&fit=crop',
  },
  {
    id: 6,
    name: 'Retinol Night Serum',
    category: 'Serum',
    price: 58.00,
    rating: 4.9,
    reviews: 423,
    image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b17?w=300&h=300&fit=crop',
  },
  {
    id: 7,
    name: 'Niacinamide Pore Refiner',
    category: 'Serum',
    price: 29.00,
    rating: 4.4,
    reviews: 178,
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=300&h=300&fit=crop',
  },
  {
    id: 8,
    name: 'Aloe Vera Soothing Gel',
    category: 'Moisturizer',
    price: 19.00,
    rating: 4.2,
    reviews: 267,
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&h=300&fit=crop',
  },
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

function ProductCard({ product }: { product: typeof products[0] }) {
  return (
    <div className="group bg-background rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden bg-[#F5F5F5]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
        <h3 className="font-medium text-foreground text-sm mb-2 line-clamp-2">{product.name}</h3>
        <div className="flex items-center gap-1 mb-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < Math.floor(product.rating)
                    ? 'fill-[#D4A574] text-[#D4A574]'
                    : 'fill-muted text-muted'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">({product.reviews})</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-foreground">€{product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              €{product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        <Button className="w-full bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0] rounded-full text-sm">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  )
}

export default function Shop() {
  const [priceRange, setPriceRange] = useState([3, 199])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

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
            min={3}
            max={199}
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
      {/* Mobile Filter Button */}
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

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
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
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 border border-border rounded-xl p-6">
            <FilterContent />
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
