import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, Mail, MapPin, Package, ShoppingBag,
  UserRound, Star, Trash2, ExternalLink, Heart, Sparkles
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { useReviews, type Review } from '@/context/ReviewsContext'
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
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatPaymentMethod(value: string) {
  return ({ klarna: 'Klarna', paypal: 'PayPal' })[value.toLowerCase()] || value
}

function parseOrderItems(items: string): OrderItem[] {
  try { const p = JSON.parse(items); return Array.isArray(p) ? p : [] } catch { return [] }
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          style={{ fill: i <= rating ? '#D4A574' : '#F0DCC8', color: i <= rating ? '#D4A574' : '#F0DCC8' }} />
      ))}
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .profile-root * { box-sizing: border-box; }
  .profile-root { font-family: 'Outfit', sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .p-fade { animation: fadeUp 0.45s ease forwards; }
  .p-card { background:#fff; border:1px solid #F0DCC8; border-radius:20px; transition:box-shadow 0.2s; }
  .p-card:hover { box-shadow: 0 8px 32px rgba(212,165,116,0.12); }
  .p-tab { cursor:pointer; padding:10px 20px; border-radius:100px; font-size:14px; font-weight:500; transition:all 0.2s; border:none; background:transparent; font-family:'Outfit',sans-serif; }
.p-tab.active { background:#D4A574; color:#fff; }
  .p-tab:not(.active) { color:#9a7a5a; }
  .p-tab:not(.active):hover { background:#FDF6EE; color:#1c1209; }
.p-stat { background:linear-gradient(135deg,#fff 0%,#FFF8F1 100%);
  border:1px solid #F0DCC8; border-radius:20px; padding:24px; }
  .p-review-card { background:#FDFAF6; border:1px solid #F0DCC8; border-radius:16px; padding:18px; transition:all 0.2s; }
  .p-review-card:hover { border-color:#D4A574; box-shadow:0 4px 16px rgba(212,165,116,0.12); }
.p-order-card {
  background:#fff;
  border:1px solid #E8D5C0; border-radius:16px; padding:20px; transition:all 0.2s; }
  .p-order-card:hover { border-color:#D4A574; box-shadow:0 4px 16px rgba(212,165,116,0.1); }
  .p-delete-btn { background:none; border:none; cursor:pointer; color:#c4a882; transition:color 0.2s; padding:4px; border-radius:8px; }
  .p-delete-btn:hover { color:#c47a5a; background:#fff0f0; }
`

function ExpandableItems({ items, orderId }: { items: OrderItem[], orderId: number }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, 3)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {visible.map(item => (
        <div key={`${orderId}-${item.id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#7a5c42' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 12 }}>{item.name}</span>
          <span style={{ color: '#c4a882', flexShrink: 0 }}>×{item.quantity || 1}</span>
        </div>
      ))}
      {items.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#D4A574', fontWeight: 600, textAlign: 'left', padding: '4px 0', fontFamily: "'Outfit',sans-serif" }}>
          {expanded ? '▲ Weniger anzeigen' : `▼ +${items.length - 3} weitere anzeigen`}
        </button>
      )}
    </div>
  )
}

export default function Profile() {
  const { user, token, updateUser } = useAuth()
  const { totalItems: wishlistTotal } = useWishlist()
  const { deleteReview } = useReviews()

  const [orders,       setOrders]       = useState<Order[]>([])
  const [userReviews,  setUserReviews]  = useState<Review[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [reviewsLoad,  setReviewsLoad]  = useState(true)
  const [error,        setError]        = useState('')
  const [activeTab,    setActiveTab]    = useState<'orders' | 'reviews' | 'account'>('orders')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')

  // Inject CSS
  const styleInjected = useState(false)
  if (!styleInjected[0]) {
    styleInjected[1](true)
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
  }

  // Load orders
  useEffect(() => {
    if (!token) { setIsLoading(false); return }
    fetch(apiUrl('/api/checkout/orders'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setOrders(data.orders || []))
      .catch(() => setError('Bestellungen konnten nicht geladen werden.'))
      .finally(() => setIsLoading(false))
  }, [token])

  // Load user reviews
  useEffect(() => {
    if (!token) { setReviewsLoad(false); return }
    fetch(apiUrl('/api/reviews/user/my-reviews'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUserReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setReviewsLoad(false))
  }, [token])

  const totalSpent  = useMemo(() => orders.reduce((s, o) => s + o.totalPrice, 0), [orders])
  const latestOrder = orders[0]
  const avgRating   = userReviews.length
    ? (userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(1)
    : '—'

  const handleDeleteReview = async (reviewId: number) => {
    if (!token) return
    const ok = await deleteReview(reviewId, token)
    if (ok) setUserReviews(prev => prev.filter(r => r.id !== reviewId))
  }

const handleSaveProfile = async () => {
  try {
    const res = await fetch(apiUrl('/api/auth/profile'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: editName,
      }),
    })

    const data = await res.json()

    if (res.ok && data.user) {
      updateUser(data.user)
    }

    setShowEditProfile(false)
  } catch (error) {
    console.error(error)
  }
}

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Nutzer'

  return (
    <div className="profile-root" style={{ background: '#FDFAF6', minHeight: '100vh', padding: '0 0 60px' }}>

      {/* ── Hero Banner ── */}
      <div style={{ background: 'linear-gradient(135deg, #3A2416 0%, #6F4E37 100%)', padding: '72px 0 96px', marginBottom: -48 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div className="p-fade" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(212,165,116,0.2)', border: '2px solid rgba(212,165,116,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#D4A574' }}>
                {firstName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D4A574', margin: '0 0 4px', fontWeight: 600 }}>
               
              </p>
              <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Willkommen, {firstName}
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontWeight: 300 }}>{user?.email}</p>
            </div>
            <Link to="/shop" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8,background: 'linear-gradient(135deg, #D4A574 0%, #C49464 100%)',
boxShadow: '0 6px 16px rgba(212,165,116,0.25)', color: '#fff', padding: '12px 24px', borderRadius: 100, fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }}>
              <Sparkles size={14} /> Produkte
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Stats ── */}
        <div className="p-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { icon: ShoppingBag, label: 'Bestellungen', value: orders.length },
            { icon: Package,     label: 'Ausgegeben',   value: formatCurrency(totalSpent) },
            { icon: Heart,       label: 'Merkliste',    value: wishlistTotal },
            { icon: Star,        label: 'Ø Bewertung',  value: avgRating },
          ].map(s => (
            <div key={s.label} className="p-stat">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid #e8c9a0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <s.icon size={16} color="#D4A574" />
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#1c1209', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{s.value}</p>
              <p style={{ fontSize: 12, color: '#9a7a5a', margin: 0, fontWeight: 300 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: '#fff', borderRadius: 100, padding: 4, border: '1px solid #F0DCC8', width: 'fit-content' }}>
          {(['orders', 'reviews', 'account'] as const).map(tab => (
            <button key={tab} className={`p-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'orders' ? `Bestellungen (${orders.length})` : tab === 'reviews' ? `Bewertungen (${userReviews.length})` : 'Konto'}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <div className="p-fade">
            {isLoading && <p style={{ color: '#9a7a5a', fontSize: 14 }}>Wird geladen…</p>}
            {error && <div style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#c47a5a', marginBottom: 16 }}>{error}</div>}
            {!isLoading && orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9a7a5a' }}>
                <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontWeight: 500 }}>Noch keine Bestellungen</p>
                <Link to="/shop" style={{ color: '#D4A574', fontSize: 13, textDecoration: 'none' }}>Jetzt einkaufen →</Link>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {orders.map(order => {
                const items    = parseOrderItems(order.items)
                const itemCount = items.reduce((s, i) => s + (i.quantity || 1), 0)
                return (
                  <div key={order.id} className="p-order-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 2px', color: '#1c1209' }}>Bestellung #{order.id}</p>
                        <p style={{ fontSize: 12, color: '#9a7a5a', margin: 0 }}>{formatDate(order.createdAt)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 2px', color: '#1c1209' }}>{formatCurrency(order.totalPrice)}</p>
                        <span style={{ fontSize: 11, background: '#FDF6EE', color: '#D4A574', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                          {formatPaymentMethod(order.paymentMethod)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9a7a5a', marginBottom: 12 }}>
                      <MapPin size={12} />
                      {order.address}, {order.postal} {order.city}, {order.country}
                    </div>
                    <div style={{ borderTop: '1px solid #F0DCC8', paddingTop: 12 }}>
  <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5c42', margin: '0 0 8px' }}>
    {itemCount} Artikel
  </p>

  <ExpandableItems items={items} orderId={order.id} />

  <Link
    to={`/profile/orders/${order.id}`}
    style={{
      display: 'inline-flex',
      marginTop: 12,
      padding: '8px 14px',
      borderRadius: 999,
      background: '#D4A574',
      color: '#fff',
      fontSize: 12,
      fontWeight: 600,
      textDecoration: 'none',
    }}
  >
    Details anzeigen
  </Link>
</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <div className="p-fade">
            {reviewsLoad && <p style={{ color: '#9a7a5a', fontSize: 14 }}>Wird geladen…</p>}
            {!reviewsLoad && userReviews.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9a7a5a' }}>
                <Star size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontWeight: 500 }}>Noch keine Bewertungen</p>
                <p style={{ fontSize: 13, fontWeight: 300 }}>Kaufe Produkte und teile deine Erfahrung.</p>
                <Link to="/shop" style={{ color: '#D4A574', fontSize: 13, textDecoration: 'none' }}>Produkte entdecken →</Link>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {userReviews.map(review => (
                <div key={review.id} className="p-review-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <StarRow rating={review.rating} />
                      <p style={{ fontSize: 11, color: '#c4a882', margin: '6px 0 0', fontWeight: 300 }}>{formatDate(review.createdAt)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link to={`/product/${review.productId}`}
                        style={{ color: '#c4a882', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={14} />
                      </Link>
                      <button className="p-delete-btn" onClick={() => handleDeleteReview(review.id)} title="Bewertung löschen">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {review.reviewText && (
                    <p style={{ fontSize: 13, color: '#7a5c42', margin: 0, lineHeight: 1.6, fontWeight: 300 }}>
                      "{review.reviewText}"
                    </p>
                  )}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0DCC8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#c4a882', fontWeight: 300 }}>Produkt #{review.productId}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#D4A574' }}>{review.rating}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {activeTab === 'account' && (
          <div className="p-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>

            <div className="p-card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: '#1c1209', margin: '0 0 20px' }}>Kontodaten</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: UserRound, label: 'Name', value: user?.name || 'Nicht angegeben' },
                  { icon: Mail,      label: 'E-Mail', value: user?.email || '' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FDF6EE', border: '1px solid #e8c9a0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <row.icon size={14} color="#D4A574" />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#c4a882', margin: '0 0 2px', fontWeight: 500 }}>{row.label}</p>
                      <p style={{ fontSize: 14, color: '#1c1209', margin: 0, fontWeight: 500 }}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
  onClick={() => setShowEditProfile(true)}
  style={{
    marginTop: 24,
    width: '100%',
    padding: '12px',
    borderRadius: 12,
    border: 'none',
    background: '#D4A574',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Outfit',sans-serif",
  }}
>
  Profil bearbeiten
</button>
            </div>

            <div className="p-card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: '#1c1209', margin: '0 0 20px' }}>Letzte Bestellung</h2>
              {latestOrder ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CalendarDays size={14} color="#D4A574" />
                    <span style={{ fontSize: 13, color: '#7a5c42' }}>{formatDate(latestOrder.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <MapPin size={14} color="#D4A574" />
                    <span style={{ fontSize: 13, color: '#7a5c42' }}>{latestOrder.city}, {latestOrder.country}</span>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#D4A574', margin: '12px 0 0', letterSpacing: '-0.02em' }}>
                    {formatCurrency(latestOrder.totalPrice)}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9a7a5a', fontWeight: 300 }}>Noch keine Bestellungen.</p>
              )}
            </div>

            {showEditProfile && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-2xl">
      <h2 className="mb-6 text-2xl font-bold text-[#1c1209]">
        Profil bearbeiten
      </h2>

      <input
  placeholder="Name"
  value={editName}
  onChange={(e) => setEditName(e.target.value)}
  className="mb-4 w-full rounded-xl border border-[#F0DCC8] px-4 py-3"
/>

      <input
        value={user?.email || ''}
        disabled
        className="mb-4 w-full rounded-xl border border-[#F0DCC8] bg-gray-100 px-4 py-3"
      />

      <input
        type="password"
        placeholder="Aktuelles Passwort"
        className="mb-4 w-full rounded-xl border border-[#F0DCC8] px-4 py-3"
      />

      <input
        type="password"
        placeholder="Neues Passwort"
        className="mb-6 w-full rounded-xl border border-[#F0DCC8] px-4 py-3"
      />

      <div className="flex gap-3">
        <button
          onClick={() => setShowEditProfile(false)}
          className="flex-1 rounded-xl border border-[#F0DCC8] py-3 font-semibold"
        >
          Abbrechen
        </button>

       <button
  onClick={handleSaveProfile}
  className="flex-1 rounded-xl bg-[#D4A574] py-3 font-semibold text-white"
>
  Speichern
</button>
      </div>
    </div>
  </div>
)}

            <div className="p-card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: '#1c1209', margin: '0 0 12px' }}>Merkliste</h2>
              <p style={{ fontSize: 13, color: '#9a7a5a', fontWeight: 300, margin: '0 0 16px', lineHeight: 1.6 }}>
                Du hast <strong style={{ color: '#1c1209' }}>{wishlistTotal}</strong> {wishlistTotal === 1 ? 'Produkt' : 'Produkte'} auf deiner Merkliste gespeichert.
              </p>
              <Link to="/wishlist" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#D4A574', textDecoration: 'none' }}>
                <Heart size={13} /> Merkliste anzeigen
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
