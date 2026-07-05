import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Package } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
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

function parseOrderItems(items: string): OrderItem[] {
  try {
    const parsed = JSON.parse(items)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
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
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    fetch(apiUrl('/api/checkout/orders'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        const foundOrder = data.orders?.find(
          (o: Order) => String(o.id) === orderId
        )

        setOrder(foundOrder || null)
      })
      .finally(() => setLoading(false))
  }, [token, orderId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        Bestellung wird geladen...
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-10">
        Bestellung nicht gefunden.
      </div>
    )
  }

  const items = parseOrderItems(order.items)

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 text-[#5F5F5F] hover:text-[#D4A574] mb-6 sm:mb-8"
      >
        <ArrowLeft className="h-5 w-5" />
        Zurück zum Profil
      </button>

      <div className="rounded-2xl border border-[#F0DCC8] bg-white p-4 sm:p-6 mb-6 !font-sans">
        <h1 className="text-3xl font-bold mb-2">
          Bestellung #{order.id}
        </h1>

        <p className="text-muted-foreground mb-4">
          {formatDate(order.createdAt)}
        </p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          {order.address}, {order.postal} {order.city}, {order.country}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4 shrink-0" />
          Zahlungsart: {order.paymentMethod}
        </div>
      </div>

      <div className="rounded-2xl border border-[#F0DCC8] bg-white p-4 sm:p-6 !font-sans">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
          Bestellte Produkte
        </h2>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={`${order.id}-${item.id}`}
              className="flex items-center gap-3 sm:gap-4 border-b border-[#F0DCC8] pb-4"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#F5F5F5] shrink-0">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link
to={`/product/${item.id}?from=order&orderId=${order.id}`}
                  className="font-medium hover:text-[#D4A574] line-clamp-2 block"
                >
                  {item.name}
                </Link>

                <p className="text-sm text-muted-foreground">
                  Menge: {item.quantity || 1}
                </p>
              </div>

              <div className="font-bold text-sm sm:text-base shrink-0">
                {formatCurrency(item.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-[#F0DCC8] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
          <span className="font-medium">Gesamtbetrag</span>

          <span className="text-lg sm:text-xl font-bold text-[#D4A574]">
            {formatCurrency(order.totalPrice)}
          </span>
        </div>
      </div>
    </div>
  )
}