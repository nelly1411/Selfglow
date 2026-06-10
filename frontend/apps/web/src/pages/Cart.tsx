import { useState, useEffect, useMemo  } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShoppingCart  } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { useCart } from '@/context/CartContext'
import { apiUrl } from '@/lib/api'

export default function Cart() {
  const [showClearCartModal, setShowClearCartModal] = useState(false)
  const [itemToRemove, setItemToRemove] = useState<number | null>(null)

  const { items, addToCart, removeFromCart, updateQuantity, updateSelected, clearCart } = useCart()

  type Product = {
    id: number
    name: string
    brand: string
    category: string
    price: number
    imageUrl?: string | null
    skinTypes?: string | null
    concerns?: string | null
    vegan?: boolean
    alcoholFree?: boolean
    fragranceFree?: boolean
  }

  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(apiUrl('/api/products'))

        if (!response.ok) {
          throw new Error('Produkte konnten nicht geladen werden')
        }

        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('Fehler beim Laden der Produkte:', error)
      }
    }

    loadProducts()
  }, [])

  const toggleSelectItem = async (id: number) => {
    const item = items.find((item) => item.id === id)
    if (!item) return

    await updateSelected(id, item.selected === false)
  }

  const toggleSelectAll = async () => {
    const allSelected = items.every((item) => item.selected !== false)

    await Promise.all(
      items.map((item) => updateSelected(item.id, !allSelected))
    )
  }

  const selectedCartItems = items.filter((item) => item.selected !== false)

  const selectedTotalPrice = selectedCartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const handleRemoveItem = (id: number) => {
    setItemToRemove(id)
  }

  const confirmRemoveItem = async () => {
    if (!itemToRemove) return

    await removeFromCart(itemToRemove)
    setItemToRemove(null)
  }

  const handleClearCart = () => {
    setShowClearCartModal(true)
  }

  const confirmClearCart = async () => {
    await clearCart()
    setShowClearCartModal(false)
  }

  const formatPrice = (price: number) =>
    `${price.toFixed(2).replace('.', ',')} €`

  const routineCategories = [
    'Gesichtsreinigung',
    'Toner',
    'Serum',
    'Feuchtigkeitspflege',
    'Sonnenschutz',
  ]

  // Analysiert gemeinsame Eigenschaften der Produkte im Warenkorb
  const cartAnalysis = useMemo(() => {
    // Häufigkeiten für Hauttypen und Hautanliegen zählen
    const skinTypes = new Map<string, number>()
    const concerns = new Map<string, number>()

    // Produkteigenschaften zählen
    let veganCount = 0
    let alcoholFreeCount = 0
    let fragranceFreeCount = 0

    items.forEach((item) => {
      if (item.skinTypes) {
        item.skinTypes.split(',').forEach((type) => {
          const key = type.trim()
          skinTypes.set(key, (skinTypes.get(key) || 0) + 1)
        })
      }

      if (item.concerns) {
        item.concerns.split(',').forEach((concern) => {
          const key = concern.trim()
          concerns.set(key, (concerns.get(key) || 0) + 1)
        })
      }

      if (item.vegan) veganCount++
      if (item.alcoholFree) alcoholFreeCount++
      if (item.fragranceFree) fragranceFreeCount++
  })

    return {
      preferredSkinType: [...skinTypes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      preferredConcern: [...concerns.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      veganPreferred: veganCount >= Math.ceil(items.length / 2),
      alcoholFreePreferred: alcoholFreeCount >= Math.ceil(items.length / 2),
      fragranceFreePreferred: fragranceFreeCount >= Math.ceil(items.length / 2),
    }
  }, [items])

  // Berechnet Produktempfehlungen basierend auf fehlenden Kategorien und Warenkorb-Analyse
  const recommendedProducts = useMemo(() => {
    const cartProductIds = items.map((item) => item.id)
    const cartCategories = items.map((item) => item.category)

    const missingCategories = routineCategories.filter(
      (category) => !cartCategories.includes(category)
    )

    return missingCategories
      .map((category) => {
        const matchingProducts = products
          .filter((product) => product.category === category)
          .filter((product) => !cartProductIds.includes(product.id))
          .map((product) => {
            // Bewertet, wie gut das Produkt zum Warenkorb passt:
            // Hauttyp +3, Hautanliegen +2, vegan/alkoholfrei/parfümfrei jeweils +1
            let score = 0

            if (
              cartAnalysis.preferredSkinType &&
              product.skinTypes?.toLowerCase().includes(cartAnalysis.preferredSkinType.toLowerCase())
            ) {
              score += 3
            }

            if (
              cartAnalysis.preferredConcern &&
              product.concerns?.toLowerCase().includes(cartAnalysis.preferredConcern.toLowerCase())
            ) {
              score += 2
            }

            if (cartAnalysis.veganPreferred && product.vegan) score += 1
            if (cartAnalysis.alcoholFreePreferred && product.alcoholFree) score += 1
            if (cartAnalysis.fragranceFreePreferred && product.fragranceFree) score += 1

            return { product, score }
          })
          .sort((a, b) => b.score - a.score)

        return matchingProducts[0]?.product
      })
      .filter((product): product is Product => Boolean(product))
      .slice(0, 4)
  }, [items, products, cartAnalysis])

    const skinTypeLabels: Record<string, string> = {
      Oily: 'fettige Haut',
      Dry: 'trockene Haut',
      Sensitive: 'sensible Haut',
      Combination: 'Mischhaut',
      Normal: 'normale Haut',
    }

    const concernLabels: Record<string, string> = {
      Acne: 'Akne',
      'Anti-Aging': 'Anti-Aging',
      'Grosse Poren': 'große Poren',
      'Rötungen': 'Rötungen',
    }
  const getRecommendationReasons = (product: Product) => {
    const reasons: string[] = []

    if (
      cartAnalysis.preferredSkinType &&
      product.skinTypes?.toLowerCase().includes(cartAnalysis.preferredSkinType.toLowerCase())
    ) {
      reasons.push(
        `Für ${skinTypeLabels[cartAnalysis.preferredSkinType] ?? cartAnalysis.preferredSkinType} geeignet`
      )
    }

    if (
      cartAnalysis.preferredConcern &&
      product.concerns?.toLowerCase().includes(cartAnalysis.preferredConcern.toLowerCase())
    ) {
      reasons.push(
        `Unterstützt bei ${concernLabels[cartAnalysis.preferredConcern] ?? cartAnalysis.preferredConcern}`
      )
    }

    if (cartAnalysis.veganPreferred && product.vegan) {
      reasons.push('Vegan')
    }

    if (cartAnalysis.alcoholFreePreferred && product.alcoholFree) {
      reasons.push('Alkoholfrei')
    }

    if (cartAnalysis.fragranceFreePreferred && product.fragranceFree) {
      reasons.push('Parfümfrei')
    }

    if (reasons.length === 0) {
      reasons.push('Passende Ergänzung für deine Routine')
    }
    return reasons
  }
  
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#F5E6D3] flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-[#D4A574]" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-4">
            Dein Warenkorb ist leer
          </h1>

          <p className="text-muted-foreground mb-8">
            Du hast noch keine Produkte in deinen Warenkorb gelegt.
          </p>

          <Link to="/shop">
            <Button className="bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full px-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Weiter einkaufen
            </Button>
          </Link>
        </div>
      </div>
    )
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Warenkorb
        </h1>

        <Button
          onClick={handleClearCart}
          className="rounded-full border border-[#E8D5C0] bg-white px-5 py-2 text-[#8A6337] shadow-sm hover:bg-[#FDF7F0] hover:border-[#D4A574]"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Warenkorb leeren
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={items.length > 0 && items.every((item) => item.selected !== false)}
              onChange={toggleSelectAll}
              className="h-4 w-4 cursor-pointer appearance-none rounded border border-[#D4A574] bg-white transition-colors checked:bg-[#D4A574] checked:after:content-['✓'] checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-white checked:after:text-xs checked:after:font-bold"
            />

            <span className="text-sm text-muted-foreground">
              Alle auswählen ({selectedCartItems.length} ausgewählt)
            </span>
          </label>

          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 bg-background border border-border rounded-xl"
            >
              <input
                type="checkbox"
                checked={item.selected !== false}
                onChange={() => toggleSelectItem(item.id)}
                className="h-4 w-4 cursor-pointer appearance-none rounded border border-[#D4A574] bg-white transition-colors checked:bg-[#D4A574] checked:after:content-['✓'] checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-white checked:after:text-xs checked:after:font-bold"
              />

              <Link
                to={`/product/${item.id}`}
                className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#F5F5F5]"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {item.category}
                </p>

                <Link to={`/product/${item.id}`}>
                  <h3 className="font-medium text-foreground mb-2 truncate hover:text-[#D4A574]">
                    {item.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">
                    {formatPrice(item.price * item.quantity)}
                  </span>

                  {item.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(item.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Produkt entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-3 bg-[#F5E6D3] rounded-full px-3 py-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity === 1}
                    className="flex h-7 w-7 items-center justify-center hover:bg-[#E8D5C0] rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    aria-label="Menge verringern"
                  >
                    <Minus
                      className={`h-3 w-3 ${
                        item.quantity === 1 ? 'text-gray-400' : 'text-foreground'
                      }`}
                    />
                  </button>

                  <span className="w-8 text-center text-base font-semibold text-foreground">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center hover:bg-[#E8D5C0] rounded-full transition-colors"
                    aria-label="Menge erhöhen"
                  >
                    <Plus className="h-3 w-3 text-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Produktempfehlungen basierend auf Warenkorb-Analyse */}
          {recommendedProducts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Ergänze deine Hautpflegeroutine
              </h2>

              <p className="text-sm text-muted-foreground mb-4">
                Basierend auf deinem Warenkorb empfehlen wir Produkte, die deine Hautpflegeroutine sinnvoll ergänzen.              </p>

              <div className="w-full max-w-full overflow-x-auto pb-3">
                <div className="flex w-max gap-4 snap-x scroll-smooth">
                  {recommendedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="min-w-[240px] max-w-[240px] sm:min-w-[280px] sm:max-w-[280px] lg:min-w-[300px] lg:max-w-[300px] snap-start rounded-xl border border-border bg-background p-4 hover:shadow-lg hover:-translate-y-1 transition-all">
                      <Link to={`/product/${product.id}`}>
                        <img
                          src={product.imageUrl || 'https://placehold.co/300x300?text=Kein+Bild'}
                          alt={product.name}
                          className="h-44 sm:h-56 lg:h-64 w-full rounded-lg object-contain mb-3 hover:scale-[1.02] transition-transform"                      />

                        <p className="text-xs text-muted-foreground">
                          {product.category}
                        </p>

                        <h3 className="font-medium mb-2 min-h-[72px] line-clamp-3 hover:text-[#D4A574]">
                          {product.name}
                        </h3>
                      </Link>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {getRecommendationReasons(product).slice(0, 3).map((reason) => (
                        <span
                          key={reason}
                          className="inline-flex items-center gap-1 rounded-full border border-[#E8D5C0] bg-[#FDF7F0] px-2 py-0.5 text-[11px] text-[#8A6337]"
                        >
                          <span className="text-[#D4A574]">✓</span>
                          {reason}
                        </span>
                      ))}
                    </div>

                        <div className="mt-4 border-t border-[#E8D5C0] pt-3 flex items-center gap-3">
                          <p className="text-xl font-bold whitespace-nowrap">
                            {product.price.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </p>

                          <Button
                            onClick={() =>
                              addToCart({
                                id: product.id,
                                name: product.name,
                                category: product.category,
                                price: product.price,
                                image: product.imageUrl || 'https://placehold.co/300x300?text=Kein+Bild',
                                skinTypes: product.skinTypes,
                                concerns: product.concerns,
                                vegan: product.vegan,
                                alcoholFree: product.alcoholFree,
                                fragranceFree: product.fragranceFree,
                              })
                            }
                            className="flex-1 rounded-full bg-[#D4A574] text-white hover:bg-[#C49464]"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Hinzufügen
                          </Button>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1 pt-9">
          <div className="sticky top-24 bg-[#F5E6D3] rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Bestellübersicht
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zwischensumme</span>
                <span className="text-foreground">
                  {formatPrice(selectedTotalPrice)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versand</span>
                <span className="text-foreground">Kostenlos</span>
              </div>

              <div className="border-t border-[#D4A574]/30 pt-3">
                <div className="flex justify-between font-bold">
                  <span className="text-foreground">Gesamt</span>
                  <span className="text-foreground">
                    {formatPrice(selectedTotalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {selectedCartItems.length > 0 ? (
              <Link to="/checkout" className="block">
                <Button className="w-full bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full mb-3">
                  Zur Kasse
                </Button>
              </Link>
            ) : (
              <Button
                disabled
                className="w-full bg-[#D4A574] text-white rounded-full mb-3 opacity-50 cursor-not-allowed"
              >
                Zur Kasse
              </Button>
            )}

            <Link to="/shop" className="block">
              <Button
                variant="outline"
                className="w-full rounded-full border-[#D4A574] text-[#8A6337] hover:bg-[#F5E6D3]"
              >
                Weiter einkaufen
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {showClearCartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              Warenkorb leeren?
            </h2>

            <p className="mb-8 text-muted-foreground">
              Möchtest du wirklich alle Produkte aus deinem Warenkorb entfernen?
            </p>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowClearCartModal(false)}
                className="flex-1 rounded-full border-border py-3 text-muted-foreground hover:bg-gray-50"
              >
                Abbrechen
              </Button>

              <Button
                type="button"
                onClick={confirmClearCart}
                className="flex-1 rounded-full bg-[#D4A574] py-3 text-white hover:bg-[#C49464]"
              >
                Leeren
              </Button>
            </div>
          </div>
        </div>
      )}

      {itemToRemove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold text-foreground">
              Produkt entfernen?
            </h2>

            <p className="mb-8 text-muted-foreground">
              Möchtest du dieses Produkt wirklich aus dem Warenkorb entfernen?
            </p>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemToRemove(null)}
                className="flex-1 rounded-full border-border py-3 text-muted-foreground hover:bg-gray-50"
              >
                Abbrechen
              </Button>

              <Button
                type="button"
                onClick={confirmRemoveItem}
                className="flex-1 rounded-full bg-[#D4A574] py-3 text-white hover:bg-[#C49464]"
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