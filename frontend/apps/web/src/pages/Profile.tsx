import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays, Mail, MapPin, ShoppingBag, X,
  UserRound, Star, Trash2, ExternalLink, Heart,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { useReviews, type Review } from '@/context/ReviewsContext'
import { apiUrl } from '@/lib/api'

type OrderItem = { id: number; name: string; price: number; quantity?: number; image?: string }
type Order = { id: number; totalPrice: number; paymentMethod: string; address: string; city: string; postal: string; country: string; items: string; createdAt: string }
type Gender = 'male' | 'female' | 'diverse' | null

function formatCurrency(value: number) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) }
function formatPaymentMethod(value: string) { return ({ klarna: 'Klarna', paypal: 'PayPal' })[value.toLowerCase()] || value }
function parseOrderItems(items: string): OrderItem[] { try { const p = JSON.parse(items); return Array.isArray(p) ? p : [] } catch { return [] } }
function genderLabel(g: Gender) { return g === 'female' ? '👩 Frau' : g === 'male' ? '👨 Mann' : g === 'diverse' ? '🧑 Divers' : 'Nicht angegeben' }

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => <Star key={i} size={size} style={{ fill: i <= rating ? '#D4A574' : '#F0DCC8', color: i <= rating ? '#D4A574' : '#F0DCC8' }} />)}
    </div>
  )
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .profile-root * { box-sizing: border-box; }
  .profile-root { font-family: 'Outfit', sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .p-fade { animation: fadeUp 0.45s ease forwards; }
  .p-card { background:#fff; border:1px solid #F0DCC8; border-radius:20px; transition:all 0.2s ease; }
  .p-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(212,165,116,0.12); }
  .p-tab { cursor:pointer; padding:10px 20px; border-radius:100px; font-size:14px; font-weight:500; transition:all 0.2s; border:none; background:transparent; font-family:'Outfit',sans-serif; }
  .p-tab.active { background:#D4A574; color:#fff; }
  .p-tab:not(.active) { color:#9a7a5a; }
  .p-tab:not(.active):hover { background:#FDF6EE; color:#1c1209; }
  .p-stat { background:linear-gradient(135deg,#fff 0%,#FFF9F3 100%); border:1.5px solid #E2B98F; border-radius:22px; padding:26px; box-shadow:0 10px 28px rgba(111,78,55,0.08); transition:all 0.2s ease; }
  .p-stat:hover { border-color:#D4A574; box-shadow:0 14px 36px rgba(111,78,55,0.14); transform:translateY(-2px); }
  .p-review-card { background:#FDFAF6; border:1px solid #F0DCC8; border-radius:16px; padding:18px; transition:all 0.2s; }
  .p-review-card:hover { border-color:#D4A574; box-shadow:0 4px 16px rgba(212,165,116,0.12); }
  .p-order-card { background:#fff; border:1px solid #E8D5C0; border-radius:16px; padding:20px; transition:all 0.2s; }
  .p-order-card:hover { border-color:#D4A574; box-shadow:0 4px 16px rgba(212,165,116,0.1); }
  .p-delete-btn { background:none; border:none; cursor:pointer; color:#c4a882; transition:color 0.2s; padding:4px; border-radius:8px; }
  .p-delete-btn:hover { color:#c47a5a; background:#fff0f0; }
  .p-input { width:100%; border:1px solid #F0DCC8; border-radius:12px; padding:12px 16px; font-size:14px; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.2s; }
  .p-input:focus { border-color:#D4A574; }
  .p-input:disabled { background:#f9f9f9; color:#aaa; cursor:not-allowed; }
  .p-btn-primary { width:100%; padding:13px; border-radius:12px; border:none; background:#D4A574; color:#fff; font-weight:600; font-size:14px; cursor:pointer; font-family:'Outfit',sans-serif; transition:background 0.2s; }
  .p-btn-primary:hover { background:#C49464; }
  .p-btn-dark { width:100%; padding:13px; border-radius:12px; border:none; background:#1c1209; color:#fff; font-weight:600; font-size:14px; cursor:pointer; font-family:'Outfit',sans-serif; transition:background 0.2s; }
  .p-btn-dark:hover { background:#2e1e0e; }
  .p-btn-outline { width:100%; padding:13px; border-radius:12px; border:1px solid #F0DCC8; background:transparent; color:#9a7a5a; font-weight:600; font-size:14px; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; }
  .p-btn-outline:hover { background:#FDF6EE; color:#1c1209; }
  .p-close-btn { background:none; border:none; cursor:pointer; color:#9a7a5a; padding:6px; border-radius:8px; display:flex; align-items:center; transition:all 0.2s; }
  .p-close-btn:hover { color:#1c1209; background:#F0DCC8; }
  .p-gender-btn { flex:1; padding:10px 8px; border-radius:12px; cursor:pointer; transition:all 0.15s ease; display:flex; flex-direction:column; align-items:center; gap:4px; font-family:'Outfit',sans-serif; }
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
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#D4A574', fontWeight: 600, textAlign: 'left', padding: '4px 0', fontFamily: "'Outfit',sans-serif" }}>
          {expanded ? '▲ Weniger anzeigen' : `▼ +${items.length - 3} weitere anzeigen`}
        </button>
      )}
    </div>
  )
}

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Ja, bestätigen', danger = false }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; danger?: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: danger ? '#fff0f0' : '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ fontSize: 22 }}>{danger ? '🗑️' : '✏️'}</span>
        </div>
        <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700, color: '#1c1209', textAlign: 'center', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#9a7a5a', textAlign: 'center', margin: '0 0 24px', fontWeight: 300, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #F0DCC8', background: 'transparent', color: '#9a7a5a', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
            Abbrechen
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: danger ? '#c47a5a' : '#D4A574', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function GenderPicker({ value, onChange }: { value: Gender; onChange: (g: Gender) => void }) {
  const options: { val: Gender; label: string; emoji: string }[] = [
    { val: 'female',  label: 'Frau',   emoji: '👩' },
    { val: 'male',    label: 'Mann',   emoji: '👨' },
    { val: 'diverse', label: 'Divers', emoji: '🧑' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(o => (
        <button key={o.val} type="button"
          className="p-gender-btn"
          onClick={() => onChange(value === o.val ? null : o.val)}
          style={{
            border: value === o.val ? '2px solid #D4A574' : '1.5px solid #e0c9a8',
            background: value === o.val ? '#FDF6EE' : '#fff',
          }}>
          <span style={{ fontSize: 20 }}>{o.emoji}</span>
          <span style={{ fontSize: 12, fontWeight: value === o.val ? 600 : 400, color: value === o.val ? '#D4A574' : '#7a5c42' }}>{o.label}</span>
          {value === o.val && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A574' }} />}
        </button>
      ))}
    </div>
  )
}

export default function Profile() {
  const { user, token, updateUser } = useAuth()
  const navigate = useNavigate()
  const { totalItems: wishlistTotal } = useWishlist()
  const { deleteReview } = useReviews()

  const [orders,          setOrders]         = useState<Order[]>([])
  const [userReviews,     setUserReviews]     = useState<Review[]>([])
  const [isLoading,       setIsLoading]       = useState(true)
  const [reviewsLoad,     setReviewsLoad]     = useState(true)
  const [error,           setError]           = useState('')
  const [activeTab,       setActiveTab]       = useState<'orders' | 'reviews' | 'account'>('orders')
  const [showEditProfile, setShowEditProfile] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmSaveName, setConfirmSaveName] = useState(false)
  const [confirmSavePw,   setConfirmSavePw]   = useState(false)
  const [confirmSaveGender, setConfirmSaveGender] = useState(false)

  const [editName,     setEditName]     = useState(user?.name || '')
  const [editGender,   setEditGender]   = useState<Gender>((user?.gender as Gender) ?? null)
  const [currentPw,    setCurrentPw]    = useState('')
  const [newPw,        setNewPw]        = useState('')
  const [nameMsg,      setNameMsg]      = useState('')
  const [pwMsg,        setPwMsg]        = useState('')
  const [pwSuccess,    setPwSuccess]    = useState('')
  const [nameSuccess,  setNameSuccess]  = useState('')
  const [genderMsg,    setGenderMsg]    = useState('')
  const [,setGenderSuccess]             = useState('')
  const [genderSaved,  setGenderSaved]  = useState(true)  // starts true = already saved

  const styleInjected = useState(false)
  if (!styleInjected[0]) {
    styleInjected[1](true)
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
  }

  useEffect(() => {
    if (!token) { setIsLoading(false); return }
    fetch(apiUrl('/api/checkout/orders'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setOrders(data.orders || []))
      .catch(() => setError('Bestellungen konnten nicht geladen werden.'))
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) { setReviewsLoad(false); return }
    fetch(apiUrl('/api/reviews/user/my-reviews'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(data => setUserReviews(Array.isArray(data) ? data : []))
      .catch(() => {}).finally(() => setReviewsLoad(false))
  }, [token])

  const latestOrder = orders[0]
  const avgRating   = userReviews.length
    ? (userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(1) : '—'

  const handleDeleteReview = async (reviewId: number) => {
    if (!token) return
    const ok = await deleteReview(reviewId, token)
    if (ok) setUserReviews(prev => prev.filter(r => r.id !== reviewId))
    setConfirmDeleteId(null)
  }

  const handleSaveName = async () => {
    setNameMsg(''); setNameSuccess(''); setConfirmSaveName(false)
    try {
      const res  = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName }),
      })
      const data = await res.json()
      if (res.ok && data.user) { updateUser({ ...data.user, token }); setNameSuccess('✓ Name gespeichert') }
      else setNameMsg(data.message || 'Fehler beim Speichern')
    } catch { setNameMsg('Netzwerkfehler') }
  }

  const handleSaveGender = async () => {
    setGenderMsg(''); setGenderSuccess(''); setConfirmSaveGender(false)
    try {
      const res  = await fetch(apiUrl('/api/auth/gender'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gender: editGender }),
      })
      const data = await res.json()
      if (res.ok && data.user) { updateUser({ ...data.user, token }); setGenderSuccess('✓ Gespeichert'); setGenderSaved(true) }
      else setGenderMsg(data.message || 'Fehler beim Speichern')
    } catch { setGenderMsg('Netzwerkfehler') }
  }

  const handleUpdatePassword = async () => {
    setPwMsg(''); setPwSuccess(''); setConfirmSavePw(false)
    if (!currentPw || !newPw) { setPwMsg('Beide Felder ausfüllen'); return }
    try {
      const res  = await fetch(apiUrl('/api/auth/update-password'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (res.ok) { setPwSuccess('✓ Passwort erfolgreich geändert'); setCurrentPw(''); setNewPw('') }
      else setPwMsg(data.message || 'Fehler beim Ändern')
    } catch { setPwMsg('Netzwerkfehler') }
  }

  const closeModal = () => {
    setShowEditProfile(false)
    setNameMsg(''); setNameSuccess(''); setPwMsg(''); setPwSuccess('')
    setGenderMsg(''); setGenderSuccess('')
  }

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Nutzer'

  return (
    <div className="profile-root" style={{ background: '#FDFAF6', minHeight: '100vh', padding: '0 0 60px' }}>

      {/* ── Hero Banner ── */}
      <div style={{ background: 'linear-gradient(135deg, #3A2416 0%, #6F4E37 100%)', padding: '72px 0 96px', marginBottom: -48 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div className="p-fade" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(212,165,116,0.2)', border: '2px solid rgba(212,165,116,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#D4A574' }}>{firstName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Willkommen, {firstName}
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontWeight: 300 }}>{user?.email}</p>
            </div>
           
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Stats ── */}
        <div className="p-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { icon: ShoppingBag, label: 'Bestellungen', value: orders.length,  onClick: () => setActiveTab('orders') },
            { icon: Heart,       label: 'Merkliste',    value: wishlistTotal,   onClick: () => navigate('/wishlist') },
            { icon: Star,        label: 'Ø Bewertung',  value: avgRating,       onClick: () => setActiveTab('reviews') },
          ].map(s => (
            <div key={s.label} className="p-stat" onClick={s.onClick} style={{ cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1.5px solid #D4A574', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
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
            <button key={tab} className={`p-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
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
                const items     = parseOrderItems(order.items)
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
                      <MapPin size={12} />{order.address}, {order.postal} {order.city}, {order.country}
                    </div>
                    <div style={{ borderTop: '1px solid #F0DCC8', paddingTop: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5c42', margin: '0 0 8px' }}>{itemCount} Artikel</p>
                      <ExpandableItems items={items} orderId={order.id} />
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
                      <Link to={`/product/${review.productId}`} style={{ color: '#c4a882', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={14} />
                      </Link>
                      <button className="p-delete-btn" onClick={() => setConfirmDeleteId(review.id)} title="Bewertung löschen">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {review.reviewText && (
                    <p style={{ fontSize: 13, color: '#7a5c42', margin: 0, lineHeight: 1.6, fontWeight: 300 }}>"{review.reviewText}"</p>
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
                  { icon: UserRound, label: 'Name',      value: user?.name   || 'Nicht angegeben' },
                  { icon: Mail,      label: 'E-Mail',    value: user?.email  || '' },
                  { icon: UserRound, label: 'Geschlecht', value: genderLabel((user?.gender as Gender) ?? null) },
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
              <button onClick={() => { setEditName(user?.name || ''); setEditGender((user?.gender as Gender) ?? null); setGenderSaved(true); setGenderSuccess(''); setShowEditProfile(true) }}
                style={{ marginTop: 24, width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#D4A574', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 14 }}>
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
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#D4A574', margin: '12px 0 0', letterSpacing: '-0.02em' }}>{formatCurrency(latestOrder.totalPrice)}</p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9a7a5a', fontWeight: 300 }}>Noch keine Bestellungen.</p>
              )}
            </div>

            <div className="p-card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: '#1c1209', margin: '0 0 12px' }}>Merkliste</h2>
              <p style={{ fontSize: 13, color: '#9a7a5a', fontWeight: 300, margin: '0 0 16px', lineHeight: 1.6 }}>
                Du hast <strong style={{ color: '#1c1209' }}>{wishlistTotal}</strong> {wishlistTotal === 1 ? 'Produkt' : 'Produkte'} auf deiner Merkliste.
              </p>
              <Link to="/wishlist" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#D4A574', textDecoration: 'none' }}>
                <Heart size={13} /> Merkliste anzeigen
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Modals ── */}
      {confirmDeleteId !== null && (
        <ConfirmModal title="Bewertung löschen?" message="Diese Aktion kann nicht rückgängig gemacht werden."
          confirmLabel="Ja, löschen" danger={true}
          onConfirm={() => handleDeleteReview(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)} />
      )}
      {confirmSaveName && (
        <ConfirmModal title="Name ändern?" message={`Möchtest du deinen Namen wirklich zu "${editName}" ändern?`}
          confirmLabel="Ja, ändern" onConfirm={handleSaveName} onCancel={() => setConfirmSaveName(false)} />
      )}
      {confirmSavePw && (
        <ConfirmModal title="Passwort ändern?" message="Möchtest du dein Passwort wirklich ändern?"
          confirmLabel="Ja, ändern" onConfirm={handleUpdatePassword} onCancel={() => setConfirmSavePw(false)} />
      )}
      {confirmSaveGender && (
        <ConfirmModal title="Geschlecht ändern?" message={`Möchtest du dein Geschlecht wirklich auf "${genderLabel(editGender)}" ändern?`}
          confirmLabel="Ja, ändern" onConfirm={handleSaveGender} onCancel={() => setConfirmSaveGender(false)} />
      )}

      {/* ── Edit Profile Modal ── */}
      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 28, padding: 36, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: '#1c1209', margin: 0 }}>Profil bearbeiten</h2>
              <button className="p-close-btn" onClick={closeModal} title="Schließen"><X size={20} /></button>
            </div>

            {/* ── Name ── */}
            <p style={{ fontSize: 12, color: '#9a7a5a', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</p>
            <input className="p-input" placeholder="Name eingeben" value={editName}
              onChange={(e) => setEditName(e.target.value)} style={{ marginBottom: 8 }} />
            {nameMsg     && <p style={{ fontSize: 12, color: '#c47a5a', margin: '0 0 8px' }}>{nameMsg}</p>}
            {nameSuccess && <p style={{ fontSize: 12, color: '#7ab87a', margin: '0 0 8px' }}>{nameSuccess}</p>}
            <button className="p-btn-primary" onClick={() => {
              if (!editName.trim()) { setNameMsg('Name darf nicht leer sein'); return }
              if (editName.trim() === (user?.name || '').trim()) { setNameMsg('Bitte einen anderen Namen eingeben'); return }
              setNameMsg(''); setConfirmSaveName(true)
            }} style={{ marginBottom: 28 }}>
              Name speichern
            </button>

            {/* ── Geschlecht ── */}
            <p style={{ fontSize: 12, color: '#9a7a5a', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Geschlecht</p>
            <GenderPicker value={editGender} onChange={(g) => { setEditGender(g); setGenderSaved(false); setGenderSuccess('') }} />
            <div style={{ marginTop: 12, marginBottom: 28 }}>
              {genderMsg && <p style={{ fontSize: 12, color: '#c47a5a', margin: '0 0 8px' }}>{genderMsg}</p>}
              {genderSaved ? (
                <p style={{ fontSize: 12, color: '#7ab87a', margin: 0, fontWeight: 600 }}>✓ Gespeichert</p>
              ) : (
                <button className="p-btn-primary" onClick={() => setConfirmSaveGender(true)}>
                  Geschlecht speichern
                </button>
              )}
            </div>

            {/* ── E-Mail (readonly) ── */}
            <p style={{ fontSize: 12, color: '#9a7a5a', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>E-Mail</p>
            <input className="p-input" value={user?.email || ''} disabled style={{ marginBottom: 28 }} />

            {/* ── Passwort ── */}
            <p style={{ fontSize: 12, color: '#9a7a5a', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Passwort ändern</p>
            <input className="p-input" type="password" placeholder="Aktuelles Passwort" value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)} style={{ marginBottom: 10 }} />
            <input className="p-input" type="password" placeholder="Neues Passwort (mind. 8 Zeichen, Groß, Zahl, Sonderzeichen)" value={newPw}
              onChange={(e) => setNewPw(e.target.value)} style={{ marginBottom: 8 }} />
            {pwMsg     && <p style={{ fontSize: 12, color: '#c47a5a', margin: '0 0 8px' }}>{pwMsg}</p>}
            {pwSuccess && <p style={{ fontSize: 12, color: '#7ab87a', margin: '0 0 8px' }}>{pwSuccess}</p>}
            <button className="p-btn-dark" onClick={() => {
              if (!currentPw || !newPw) { setPwMsg('Beide Felder ausfüllen'); return }
              if (currentPw === newPw) { setPwMsg('Neues Passwort muss sich vom aktuellen unterscheiden'); return }
              setPwMsg(''); setConfirmSavePw(true)
            }}>
              Passwort ändern
            </button>
          </div>
        </div>
      )}
    </div>
  )
}