import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Button } from "@workspace/ui/components/button"
import { useCart } from '@/context/CartContext'

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#F5E6D3] flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-[#D4A574]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven&apos;t added any products to your cart yet.
          </p>
          <Link to="/shop">
            <Button className="bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full px-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>d
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={clearCart}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Cart
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 bg-background border border-border rounded-xl"
            >
              <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#F5F5F5]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">{item.category}</p>
                <h3 className="font-medium text-foreground mb-2 truncate">{item.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">${item.price.toFixed(2)}</span>
                  {item.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${item.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 bg-[#F5E6D3] rounded-full px-2 py-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 hover:bg-[#E8D5C0] rounded-full transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3 text-foreground" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-[#E8D5C0] rounded-full transition-colors"
                    aria-label="Increase quantity"
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
            <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">${(totalPrice * 0.19).toFixed(2)}</span>
              </div>
              <div className="border-t border-[#D4A574]/30 pt-3">
                <div className="flex justify-between font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">${(totalPrice * 1.19).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <Link to="/checkout">
          <Button className="w-full bg-[#D4A574] text-white hover:bg-[#C49464] rounded-full mb-3">
          Proceed to Checkout
            </Button>
          </Link>
            <Link to="/shop" className="block">
              <Button variant="outline" className="w-full rounded-full border-[#D4A574] text-[#D4A574] hover:bg-[#D4A574]/10">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
