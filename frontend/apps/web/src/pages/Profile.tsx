import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Mail, MapPin, Package, ShoppingBag, UserRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { apiUrl } from '@/lib/api'

type OrderItem = {
  id: number
  name: string
  price: number
  quantity?: number
  image?: string
}

type Order = {
  id: number
  totalPrice: number
  paymentMethod: string
  address: string
  city: string
  postal: string
  country: string
  items: string
  createdAt: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function parseOrderItems(items: string): OrderItem[] {
  try {
    const parsed = JSON.parse(items)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function Profile() {
  const { user, token } = useAuth()
  const { totalItems: wishlistTotal } = useWishlist()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrders() {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(apiUrl('/api/checkout/orders'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data: { orders?: Order[]; message?: string } = await response.json()

        if (!response.ok) {
          setError(data.message || 'Could not load your orders.')
          return
        }

        setOrders(data.orders || [])
      } catch {
        setError('Could not reach the backend. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [token])

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalPrice, 0),
    [orders]
  )

  const latestOrder = orders[0]

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#8A6337]">Customer account</p>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center justify-center rounded-full bg-[#D4A574] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#C19660]"
        >
          Continue shopping
        </Link>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5E6D3] text-[#A9733F]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-sm text-muted-foreground">Orders placed</p>
        </div>

        <div className="rounded-lg border border-border bg-background p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5E6D3] text-[#A9733F]">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
          <p className="text-sm text-muted-foreground">Total order value</p>
        </div>

        <div className="rounded-lg border border-border bg-background p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5E6D3] text-[#A9733F]">
            <CalendarDays className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">{latestOrder ? formatDate(latestOrder.createdAt) : '-'}</p>
          <p className="text-sm text-muted-foreground">Last order</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="space-y-6">
          <div className="rounded-lg border border-border bg-background p-6">
            <h2 className="mb-5 text-xl font-semibold">Account details</h2>

            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <UserRound className="mt-0.5 h-5 w-5 text-[#A9733F]" />
                <div>
                  <p className="font-medium text-foreground">User name</p>
                  <p className="text-muted-foreground">{user?.name || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-[#A9733F]" />
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-6">
            <h2 className="mb-3 text-xl font-semibold">Saved shopping</h2>
            <p className="text-sm text-muted-foreground">
              You currently have {wishlistTotal} product{wishlistTotal === 1 ? '' : 's'} in your wishlist.
            </p>
            <Link to="/wishlist" className="mt-4 inline-flex text-sm font-medium text-[#8A6337] hover:underline">
              View wishlist
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Order history</h2>
            {isLoading && <span className="text-sm text-muted-foreground">Loading...</span>}
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {!isLoading && !error && orders.length === 0 && (
            <div className="rounded-md bg-[#F8F1EA] p-5 text-sm text-muted-foreground">
              No orders yet. Once you place an order while logged in, it will appear here.
            </div>
          )}

          <div className="space-y-4">
            {orders.map((order) => {
              const orderItems = parseOrderItems(order.items)
              const itemCount = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0)

              return (
                <article key={order.id} className="rounded-md border border-border p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="font-semibold">{formatCurrency(order.totalPrice)}</p>
                      <p className="capitalize text-muted-foreground">{order.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="mb-4 flex gap-3 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {order.address}, {order.postal} {order.city}, {order.country}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {itemCount} item{itemCount === 1 ? '' : 's'}
                    </p>
                    {orderItems.slice(0, 3).map((item) => (
                      <div key={`${order.id}-${item.id}`} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-4">{item.name}</span>
                        <span className="text-muted-foreground">x{item.quantity || 1}</span>
                      </div>
                    ))}
                    {orderItems.length > 3 && (
                      <p className="text-sm text-muted-foreground">+{orderItems.length - 3} more products</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
