import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from "@workspace/ui/components/button"
import { useCart } from '@/context/CartContext'


export default function Cart() {
  const { items, removeFromCart, updateQuantity, updateSelected, clearCart } = useCart()

 // Auswahl eines Produkts ändern
  const toggleSelectItem = async (id: number) => {
    const item = items.find((item) => item.id === id)

    if (!item) return

    await updateSelected(id, item.selected === false)
  }
  // Alle Produkte auswählen oder abwählen
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
    if (window.confirm('Möchtest du dieses Produkt wirklich aus dem Warenkorb entfernen?')) {
      removeFromCart(id)
    }
  }  
  const handleClearCart = () => {
    if (window.confirm('Möchtest du wirklich den gesamten Warenkorb leeren?')) {
      clearCart()
    }
  } 

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)


  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#F5E6D3] flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-[#D4A574]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Dein Warenkorb ist leer</h1>
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
        <h1 className="text-3xl font-bold text-foreground">Warenkorb</h1>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleClearCart}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Warenkorb leeren
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
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
                <p className="text-xs text-muted-foreground mb-1">{item.category}</p>
                <Link to={`/product/${item.id}`}>
                  <h3 className="font-medium text-foreground mb-2 truncate hover:text-[#D4A574]">
                    {item.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{formatPrice(item.price * item.quantity)}</span>
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
                <div className="flex items-center gap-2 bg-[#F5E6D3] rounded-full px-2 py-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity === 1}
                    className="p-1 hover:bg-[#E8D5C0] rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    aria-label="Menge verringern"
                  >
                    <Minus className={`h-3 w-3 ${item.quantity === 1 ? 'text-gray-400' : 'text-foreground'}`} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-[#E8D5C0] rounded-full transition-colors"
                    aria-label="Menge erhöhen"
                  >
                    <Plus className="h-3 w-3 text-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-[#F5E6D3] rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Bestellübersicht</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zwischensumme</span>
                <span className="text-foreground">{formatPrice(selectedTotalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versand</span>
                <span className="text-foreground">Kostenlos</span>
              </div>
              <div className="border-t border-[#D4A574]/30 pt-3">
                <div className="flex justify-between font-bold">
                  <span className="text-foreground">Gesamt</span>
                  <span className="text-foreground">{formatPrice(selectedTotalPrice)}</span>
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
              <Button variant="outline" className="w-full rounded-full border-[#D4A574] text-[#D4A574] hover:bg-[#D4A574]/10">
                Weiter einkaufen
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

