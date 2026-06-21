import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays, Mail, MapPin, ShoppingBag, X,
  UserRound, Star, Trash2, ExternalLink, Heart,
  Droplets, Activity, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { useReviews, type Review } from '@/context/ReviewsContext'
import { apiUrl } from '@/lib/api'

type OrderItem = { id: number; name: string; price: number; quantity?: number; image?: string }
type Order = { id: number; totalPrice: number; paymentMethod: string; address: string; city: string; postal: string; country: string; items: string; createdAt: string }
type Gender = 'male' | 'female' | 'diverse' | null
type SkinFact = { key: string; value: string; confidence?: number; source?: string; updatedAt?: string }
type SkinAnalysisSnapshot = { id: number; skinType: string; dryness: number; redness: number; blemishes: number; sensitivity: number; overall: string; imageData?: string | null; createdAt: string }
type ProfileImageSnapshot = { id?: string; imageData: string; source: 'skin_analysis' | 'chat'; createdAt: string }
type SkinProfile = { skinType: string | null; gender?: string | null; facts: SkinFact[]; latestAnalysis?: SkinAnalysisSnapshot | null; latestProfileImage?: ProfileImageSnapshot | null; profileImages?: ProfileImageSnapshot[] }
type EditableSkinFacts = Record<string, string[]>

function formatCurrency(value: number) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) }
function formatPaymentMethod(value: string) { return ({ klarna: 'Klarna', paypal: 'PayPal' })[value.toLowerCase()] || value }
function parseOrderItems(items: string): OrderItem[] { try { const p = JSON.parse(items); return Array.isArray(p) ? p : [] } catch { return [] } }
function genderLabel(g: Gender) { return g === 'female' ? '👩 Frau' : g === 'male' ? '👨 Mann' : g === 'diverse' ? '🧑 Divers' : 'Nicht angegeben' }
function skinTypeLabel(s?: string | null) { return ({ Normal: 'Normale Haut', Oily: 'Fettige Haut', Dry: 'Trockene Haut', Combination: 'Mischhaut', Sensitive: 'Sensible Haut' } as Record<string, string>)[s || ''] || 'Nicht angegeben' }
function factKeyLabel(key: string) {
  return ({
    concern: 'Hautthemen',
    skin_state: 'Hautzustand',
    sensitivity: 'Empfindlichkeit',
    product_reaction: 'Reaktionen',
    ingredient_avoidance: 'Meiden',
    allergy: 'Allergien',
    goal: 'Ziele',
    preference: 'Vorlieben',
    skin_type: 'Hauttyp',
  } as Record<string, string>)[key] || key
}
function factLabel(value: string) {
  return ({
    acne: 'Akne', blemishes: 'Unreinheiten', redness: 'Rötungen', pores: 'Große Poren',
    blackheads: 'Mitesser', dark_spots: 'Pigmentflecken', dark_circles: 'Augenringe', wrinkles: 'Falten',
    balanced: 'Ausgeglichen', oily: 'Fettig', oily_t_zone: 'Ölige T-Zone', shine: 'Glanz',
    dryness: 'Trockenheit', dehydration: 'Feuchtigkeitsarm', tightness: 'Spannungsgefühl', flakiness: 'Schuppig',
    rough_texture: 'Raue Textur', matte: 'Matt',
    sensitive: 'Empfindlich', tolerant: 'Robust', fragrance: 'Parfum',
    burning: 'Brennen', too_greasy: 'Wird fettig', drying: 'Trocknet aus', breakout: 'Pickelreaktion',
    alcohol: 'Alkohol', retinol: 'Retinol', vitamin_c: 'Vitamin C', niacinamide: 'Niacinamid',
    hydration: 'Mehr Feuchtigkeit', calming: 'Beruhigung', glow: 'Glow', anti_aging: 'Anti-Aging',
    barrier_support: 'Hautbarriere', sun_protection: 'Sonnenschutz', brightening: 'Aufhellung',
    light_texture: 'Leichte Textur', rich_texture: 'Reichhaltige Textur', fragrance_free: 'Parfümfrei',
    alcohol_free: 'Alkoholfrei', vegan: 'Vegan', non_comedogenic: 'Nicht komedogen',
    oil_free: 'Ölfrei', cruelty_free: 'Tierversuchsfrei', natural_ingredients: 'Natürliche Inhaltsstoffe',
  } as Record<string, string>)[value] || value
}
const skinTypeOptions = [
  { value: 'Normal', label: 'Normal', tone: '#7ab87a' },
  { value: 'Oily', label: 'Fettig', tone: '#D4A574' },
  { value: 'Dry', label: 'Trocken', tone: '#7aa7b8' },
  { value: 'Combination', label: 'Mischhaut', tone: '#b88bd4' },
  { value: 'Sensitive', label: 'Sensibel', tone: '#c47a5a' },
]

const editableFactGroups = [
  { key: 'concern', label: 'Hautthemen', values: ['acne', 'blemishes', 'blackheads', 'redness', 'pores', 'dark_spots', 'dark_circles', 'wrinkles'] },
  { key: 'skin_state', label: 'Aktueller Zustand', values: ['balanced', 'oily', 'oily_t_zone', 'shine', 'dryness', 'dehydration', 'tightness', 'flakiness', 'rough_texture', 'matte'] },
  { key: 'sensitivity', label: 'Empfindlichkeit', values: ['sensitive', 'tolerant'] },
  { key: 'preference', label: 'Produkt-Vorlieben', values: ['light_texture', 'rich_texture', 'fragrance_free', 'alcohol_free', 'vegan', 'non_comedogenic', 'oil_free', 'cruelty_free', 'natural_ingredients'] },
  { key: 'product_reaction', label: 'Reaktionen', values: ['burning', 'too_greasy', 'drying', 'breakout'] },
  { key: 'ingredient_avoidance', label: 'Meiden', values: ['fragrance', 'alcohol', 'retinol', 'vitamin_c'] },
  { key: 'allergy', label: 'Allergien', values: ['fragrance', 'alcohol', 'retinol', 'niacinamide', 'vitamin_c'] },
  { key: 'goal', label: 'Ziele', values: ['hydration', 'calming', 'glow', 'anti_aging', 'barrier_support', 'sun_protection', 'brightening'] },
]

const editableFactValuesByKey = Object.fromEntries(
  editableFactGroups.map(group => [group.key, new Set(group.values)])
)

function emptyEditableFacts(): EditableSkinFacts {
  return Object.fromEntries(editableFactGroups.map(group => [group.key, []]))
}

function factsFromProfile(profile: SkinProfile | null): EditableSkinFacts {
  const next = emptyEditableFacts()
  if (!profile) return next
  for (const fact of profile.facts) {
    if (next[fact.key] && editableFactValuesByKey[fact.key]?.has(fact.value) && !next[fact.key].includes(fact.value)) {
      next[fact.key].push(fact.value)
    }
  }
  return next
}

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
  .p-card { background:#fff; border:1px solid #F0DCC8; border-radius:18px; transition:all 0.2s ease; }
  .p-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(212,165,116,0.12); }
  .p-tab { cursor:pointer; padding:10px 20px; border-radius:100px; font-size:14px; font-weight:500; transition:all 0.2s; border:none; background:transparent; font-family:'Outfit',sans-serif; }
  .p-tab.active { background:#D4A574; color:#fff; }
  .p-tab:not(.active) { color:#9a7a5a; }
  .p-tab:not(.active):hover { background:#FDF6EE; color:#1c1209; }
  .p-stat { background:linear-gradient(135deg,#fff 0%,#FFF9F3 100%); border:1.5px solid #E2B98F; border-radius:18px; padding:18px 20px; box-shadow:0 10px 28px rgba(111,78,55,0.08); transition:all 0.2s ease; }
  .p-stat:hover { border-color:#D4A574; box-shadow:0 14px 36px rgba(111,78,55,0.14); transform:translateY(-2px); }
  .p-review-card { background:#FDFAF6; border:1px solid #F0DCC8; border-radius:14px; padding:14px 16px; transition:all 0.2s; }
  .p-review-card:hover { border-color:#D4A574; box-shadow:0 4px 16px rgba(212,165,116,0.12); }
  .p-order-card { background:#fff; border:1px solid #E8D5C0; border-radius:14px; padding:15px 18px; transition:all 0.2s; }
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
  .p-skin-option { border:1.5px solid #E8D5C0; background:#fff; border-radius:12px; padding:8px 9px; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s ease; text-align:left; }
  .p-skin-option:hover { border-color:#D4A574; background:#FDF6EE; }
  .p-chip { border:1px solid #E8D5C0; background:#fff; color:#7a5c42; border-radius:999px; padding:8px 11px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s ease; }
  .p-chip.active { border-color:#D4A574; background:#FDF6EE; color:#1c1209; box-shadow:0 0 0 2px rgba(212,165,116,0.12); }
  .p-fact-pill { display:inline-flex; align-items:center; gap:6px; border:1px solid #F0DCC8; background:#FDF6EE; color:#7a5c42; border-radius:999px; padding:7px 10px; font-size:12px; font-weight:600; font-family:'Outfit',sans-serif; }
  .p-fact-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:8px; }
  .p-fact-group { border:1px solid #F0DCC8; border-radius:14px; padding:10px; background:#fff; }
  .p-fact-group-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:7px; }
  .p-fact-value-btn { min-height:34px; border:1px solid #E8D5C0; background:#fff; color:#7a5c42; border-radius:10px; padding:6px 8px; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s ease; text-align:left; display:flex; justify-content:space-between; align-items:center; gap:6px; }
  .p-fact-value-btn.active { border-color:#D4A574; background:#FDF6EE; color:#1c1209; box-shadow:0 0 0 2px rgba(212,165,116,0.12); }
  .p-meter { height:7px; border-radius:999px; background:#F3E4D2; overflow:hidden; }
  .p-meter-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#7ab87a,#D4A574,#c47a5a); transition:width 0.3s ease; }
  .p-mirror { position:relative; overflow:hidden; border:1px solid rgba(173,184,188,0.9); cursor:pointer; font-family:'Outfit',sans-serif; width:100%; min-height:140px; border-radius:18px; background:linear-gradient(105deg,#f8f8f6 0%,#e7eaeb 14%,#ffffff 25%,#cfd6d8 44%,#aeb9bc 53%,#dce1e2 67%,#ffffff 79%,#c4cccf 100%); box-shadow:inset 0 0 0 2px rgba(255,255,255,0.76), inset 18px 0 42px rgba(255,255,255,0.62), inset -24px 0 48px rgba(63,76,82,0.24), 0 14px 28px rgba(58,36,28,0.14); transition:transform 0.2s ease, box-shadow 0.2s ease; }
  .p-mirror:hover { transform:translateY(-2px); box-shadow:inset 0 0 0 2px rgba(255,255,255,0.84), inset 18px 0 42px rgba(255,255,255,0.72), inset -24px 0 52px rgba(63,76,82,0.28), 0 20px 36px rgba(58,36,28,0.18); }
  .p-mirror::before { content:''; position:absolute; inset:4px; border-radius:14px; background:radial-gradient(circle at 50% 50%,rgba(255,255,255,0.22),rgba(255,255,255,0.05) 58%,rgba(36,23,20,0.1) 100%); box-shadow:inset 0 0 20px rgba(255,255,255,0.44), inset 0 0 44px rgba(32,44,49,0.12); pointer-events:none; z-index:2; }
  .p-mirror::after { content:''; position:absolute; top:-18%; bottom:-18%; left:9%; width:32%; transform:rotate(14deg); background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.82),rgba(255,255,255,0.12),rgba(255,255,255,0)); filter:blur(1px); pointer-events:none; z-index:3; }
  .p-mirror-shine { position:absolute; top:-16%; bottom:-16%; right:12%; width:22%; transform:rotate(14deg); background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.62),rgba(255,255,255,0)); filter:blur(2px); z-index:3; pointer-events:none; }
  .p-mirror-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0.72; filter:saturate(0.88) contrast(0.96); }
  .p-mirror-content { position:relative; z-index:4; min-height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:18px 22px; text-align:center; color:#2b1b16; text-shadow:0 1px 8px rgba(255,255,255,0.7); }
  .p-mirror-title { margin:0; max-width:82%; font-size:clamp(17px,2.2vw,23px); line-height:1.05; font-weight:800; letter-spacing:0; text-wrap:balance; }
  .p-mirror-sub { margin:10px 0 0; max-width:74%; font-size:12px; color:#5f463b; font-weight:700; }
  .p-photo-viewer-thumb { width:56px; height:56px; border-radius:12px; border:2px solid transparent; padding:0; overflow:hidden; background:#fff; cursor:pointer; opacity:0.74; transition:all 0.15s ease; }
  .p-photo-viewer-thumb.active { border-color:#D4A574; opacity:1; box-shadow:0 0 0 2px rgba(212,165,116,0.18); }
  .p-photo-viewer-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
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

function SkinProfileModal({
  profile, editSkinType, editFacts, saving, message,
  onClose, onSkinTypeChange, onToggleFact,
}: {
  profile: SkinProfile | null
  editSkinType: string | null
  editFacts: EditableSkinFacts
  saving: boolean
  message: string
  onClose: () => void
  onSkinTypeChange: (value: string | null) => void
  onToggleFact: (key: string, value: string) => void
}) {
  const latestImage = profile?.latestProfileImage?.imageData || profile?.latestAnalysis?.imageData || null
  const images = profile?.profileImages?.length
    ? profile.profileImages
    : latestImage
      ? [{ id: 'latest', imageData: latestImage, source: profile?.latestProfileImage?.source || 'skin_analysis', createdAt: profile?.latestProfileImage?.createdAt || profile?.latestAnalysis?.createdAt || '' }]
      : []
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null)
  const activePhoto = photoViewerIndex !== null ? images[photoViewerIndex] : null
  const selectedFactCount = Object.values(editFacts).reduce((sum, values) => sum + values.length, 0)
  const filledFactGroups = Object.values(editFacts).filter(values => values.length > 0).length
  const completion = Math.min(100, Math.round(((editSkinType ? 1 : 0) + filledFactGroups) / (editableFactGroups.length + 1) * 100))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 760, background: '#fff', borderRadius: 28, padding: 0, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: 28, borderBottom: '1px solid #F0DCC8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: '#D4A574', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Meine Haut</p>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: '#1c1209', margin: 0 }}>{skinTypeLabel(editSkinType)}</h2>
          </div>
          <button className="p-close-btn" onClick={onClose} title="Schließen"><X size={20} /></button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
            <div style={{ border: '1px solid #F0DCC8', borderRadius: 18, padding: 14, background: 'linear-gradient(135deg,#FFF9F3 0%,#fff 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: '#9a7a5a', margin: '0 0 4px', fontWeight: 700 }}>Hautprofil</p>
                  <p style={{ fontSize: 28, color: '#1c1209', margin: '0 0 12px', fontWeight: 800, letterSpacing: '-0.02em' }}>{completion}%</p>
                </div>
              </div>
              <div className="p-meter"><div className="p-meter-fill" style={{ width: `${completion}%` }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                <div style={{ border: '1px solid #F0DCC8', borderRadius: 12, padding: 8, background: '#fff' }}>
                  <Activity size={15} color="#D4A574" />
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#1c1209', margin: '6px 0 0' }}>{selectedFactCount}</p>
                  <p style={{ fontSize: 11, color: '#9a7a5a', margin: 0 }}>Ausgewählt</p>
                </div>
                <div style={{ border: '1px solid #F0DCC8', borderRadius: 12, padding: 8, background: '#fff' }}>
                  <ShieldCheck size={15} color="#D4A574" />
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#1c1209', margin: '6px 0 0' }}>{filledFactGroups}</p>
                  <p style={{ fontSize: 11, color: '#9a7a5a', margin: 0 }}>Bereiche</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
              <button
                type="button"
                className="p-mirror"
                onClick={() => { if (images.length > 0) setPhotoViewerIndex(0) }}
                style={{ cursor: images.length > 0 ? 'pointer' : 'default', minHeight: 150 }}
              >
                {latestImage && <img className="p-mirror-img" src={latestImage} alt="Letztes Hautprofil" />}
                <span className="p-mirror-shine" />
              </button>

              <div style={{ border: '1px solid #F0DCC8', borderRadius: 14, padding: 10, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <p style={{ fontSize: 12, color: '#9a7a5a', margin: 0, fontWeight: 800 }}>{factKeyLabel('skin_type')}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(78px,1fr))', gap: 6 }}>
                  {skinTypeOptions.map(option => (
                    <button key={option.value} className="p-skin-option" onClick={() => onSkinTypeChange(editSkinType === option.value ? null : option.value)}
                      style={{ borderColor: editSkinType === option.value ? option.tone : '#E8D5C0', background: editSkinType === option.value ? '#FDF6EE' : '#fff' }}>
                      <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: option.tone, marginBottom: 4 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1c1209' }}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-fact-grid">
            {editableFactGroups.map(group => {
              const selectedValues = editFacts[group.key] || []
              return (
                <section key={group.key} className="p-fact-group">
                  <div className="p-fact-group-head">
                    <div>
                      <p style={{ fontSize: 13, color: '#1c1209', margin: '0 0 4px', fontWeight: 800 }}>{factKeyLabel(group.key)}</p>
                    </div>
                    <span style={{ fontSize: 11, color: '#9a7a5a', fontWeight: 800 }}>{selectedValues.length}/{group.values.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(104px,1fr))', gap: 6 }}>
                    {group.values.map(value => {
                      const selected = selectedValues.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`p-fact-value-btn ${selected ? 'active' : ''}`}
                          onClick={() => onToggleFact(group.key, value)}
                          title={`${group.key}: ${value}`}
                        >
                          <span>
                            <span style={{ display: 'block', fontSize: 11, fontWeight: 800 }}>{factLabel(value)}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          {(saving || message) && (
            <p style={{ fontSize: 13, color: message.startsWith('✓') || saving ? '#7ab87a' : '#c47a5a', margin: 0, fontWeight: 600 }}>
              {saving ? 'Wird gespeichert…' : message}
            </p>
          )}
        </div>
      </div>
      {activePhoto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setPhotoViewerIndex(null) }}>
          <div style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #F0DCC8' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#1c1209', margin: 0 }}>Gespeicherte Bilder</p>
                <p style={{ fontSize: 12, color: '#9a7a5a', margin: '2px 0 0' }}>
                  {activePhoto.source === 'chat' ? 'Chat' : 'Hautanalyse'} · {activePhoto.createdAt ? formatDate(activePhoto.createdAt) : 'Gespeichert'}
                </p>
              </div>
              <button className="p-close-btn" onClick={() => setPhotoViewerIndex(null)} title="Schließen"><X size={20} /></button>
            </div>
            <div style={{ minHeight: 0, overflow: 'auto', background: '#1c1209', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={activePhoto.imageData} alt="Gespeichertes Hautprofil" style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', display: 'block' }} />
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: 14, borderTop: '1px solid #F0DCC8' }}>
                {images.map((image, index) => (
                  <button
                    key={image.id || `${image.source}-${index}`}
                    type="button"
                    className={`p-photo-viewer-thumb ${index === photoViewerIndex ? 'active' : ''}`}
                    onClick={() => setPhotoViewerIndex(index)}
                    title={`${image.source === 'chat' ? 'Chat' : 'Hautanalyse'} ${image.createdAt ? formatDate(image.createdAt) : ''}`}
                  >
                    <img src={image.imageData} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
  const [showSkinProfile, setShowSkinProfile] = useState(false)
  const [skinProfile,     setSkinProfile]     = useState<SkinProfile | null>(null)
  const [skinSaving,      setSkinSaving]      = useState(false)
  const [skinMsg,         setSkinMsg]         = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmSaveName, setConfirmSaveName] = useState(false)
  const [confirmSavePw,   setConfirmSavePw]   = useState(false)
  const [confirmSaveGender, setConfirmSaveGender] = useState(false)

  const [editName,     setEditName]     = useState(user?.name || '')
  const [editGender,   setEditGender]   = useState<Gender>((user?.gender as Gender) ?? null)
  const [editSkinType, setEditSkinType] = useState<string | null>(user?.skinType || null)
  const [editSkinFacts, setEditSkinFacts] = useState<EditableSkinFacts>(emptyEditableFacts)
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

  async function loadSkinProfileContext() {
    if (!token) return
    try {
      const response = await fetch(apiUrl('/api/auth/profile-context'), { headers: { Authorization: `Bearer ${token}` } })
      const data = response.ok ? await response.json() : null
      if (!data) return
      const nextProfile = {
        skinType: data.skinType ?? null,
        gender: data.gender ?? null,
        facts: Array.isArray(data.facts) ? data.facts : [],
        latestAnalysis: data.latestAnalysis ?? null,
        latestProfileImage: data.latestProfileImage ?? null,
        profileImages: Array.isArray(data.profileImages) ? data.profileImages : [],
      }
      setSkinProfile(nextProfile)
      setEditSkinType(nextProfile.skinType || user?.skinType || null)
      setEditSkinFacts(factsFromProfile(nextProfile))

      if (user && (user.skinType !== nextProfile.skinType || user.gender !== nextProfile.gender)) {
        updateUser({
          ...user,
          skinType: nextProfile.skinType,
          gender: (nextProfile.gender as Gender) ?? null,
        })
      }
    } catch {}
  }

  useEffect(() => {
    loadSkinProfileContext()
  }, [token, user?.skinType])

  useEffect(() => {
    function handleRefresh() {
      if (document.visibilityState === 'visible') loadSkinProfileContext()
    }

    window.addEventListener('focus', handleRefresh)
    document.addEventListener('visibilitychange', handleRefresh)
    return () => {
      window.removeEventListener('focus', handleRefresh)
      document.removeEventListener('visibilitychange', handleRefresh)
    }
  }, [token, user?.skinType, user?.gender])

  const latestOrder = orders[0]
  const avgRating   = userReviews.length
    ? (userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(1) : '—'
  const skinFactCount = (skinProfile?.facts || []).filter(fact => fact.key !== 'skin_type').length

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

  const openSkinProfile = () => {
    const nextProfile = skinProfile || { skinType: user?.skinType || null, gender: user?.gender || null, facts: [], latestAnalysis: null, latestProfileImage: null, profileImages: [] }
    setSkinProfile(nextProfile)
    setEditSkinType(nextProfile.skinType || user?.skinType || null)
    setEditSkinFacts(factsFromProfile(nextProfile))
    setSkinMsg('')
    setShowSkinProfile(true)
  }

  const saveSkinProfile = async (nextSkinType = editSkinType, nextFacts = editSkinFacts) => {
    if (!token) return
    setSkinSaving(true); setSkinMsg('')
    try {
      const res = await fetch(apiUrl('/api/auth/skin-profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skinType: nextSkinType, facts: nextFacts }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSkinMsg(data.message || 'Fehler beim Speichern')
        return
      }
      if (data.user) updateUser({ ...data.user, token })
      if (data.profile) {
        const nextProfile = {
          ...data.profile,
          latestAnalysis: skinProfile?.latestAnalysis ?? null,
          latestProfileImage: skinProfile?.latestProfileImage ?? null,
          profileImages: skinProfile?.profileImages ?? [],
        }
        setSkinProfile(nextProfile)
        setEditSkinType(data.profile.skinType ?? null)
        setEditSkinFacts(factsFromProfile(nextProfile))
      }
      setSkinMsg('✓ Automatisch gespeichert')
    } catch {
      setSkinMsg('Netzwerkfehler')
    } finally {
      setSkinSaving(false)
    }
  }

  const handleSkinTypeChange = (value: string | null) => {
    setEditSkinType(value)
    void saveSkinProfile(value, editSkinFacts)
  }

  const toggleSkinFact = (key: string, value: string) => {
    const current = editSkinFacts[key] || []
    const nextValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    const nextFacts = { ...editSkinFacts, [key]: nextValues }
    setEditSkinFacts(nextFacts)
    void saveSkinProfile(editSkinType, nextFacts)
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
          <button className="p-mirror" onClick={openSkinProfile} style={{ minHeight: 128 }}>
            <span className="p-mirror-shine" />
            <div className="p-mirror-content" style={{ minHeight: 128 }}>
              <p className="p-mirror-title">meine Haut Profile</p>
            </div>
          </button>
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
            <div className="p-card" style={{ padding: 18 }}>
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

            <div className="p-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: '#1c1209', margin: '0 0 6px' }}>Meine Haut Profile</h2>
                  <p style={{ fontSize: 13, color: '#9a7a5a', fontWeight: 300, margin: 0 }}>Dein gespeichertes Hautprofil</p>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: '#FDF6EE', border: '1px solid #e8c9a0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Droplets size={18} color="#D4A574" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#FDFAF6', border: '1px solid #F0DCC8', borderRadius: 14, padding: 12 }}>
                  <p style={{ fontSize: 11, color: '#c4a882', margin: '0 0 4px', fontWeight: 600 }}>Hauttyp</p>
                  <p style={{ fontSize: 14, color: '#1c1209', margin: 0, fontWeight: 700 }}>{skinTypeLabel(skinProfile?.skinType || user?.skinType)}</p>
                </div>
                <div style={{ background: '#FDFAF6', border: '1px solid #F0DCC8', borderRadius: 14, padding: 12 }}>
                  <p style={{ fontSize: 11, color: '#c4a882', margin: '0 0 4px', fontWeight: 600 }}>Merkmale</p>
                  <p style={{ fontSize: 14, color: '#1c1209', margin: 0, fontWeight: 700 }}>{skinFactCount}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {(skinProfile?.facts || []).filter(f => f.key !== 'skin_type').slice(0, 4).map(fact => (
                  <span key={`${fact.key}-${fact.value}`} className="p-fact-pill">{factLabel(fact.value)}</span>
                ))}
                {skinFactCount === 0 && <p style={{ fontSize: 13, color: '#9a7a5a', margin: 0 }}>Noch keine Details gespeichert.</p>}
              </div>
              <button className="p-mirror" onClick={openSkinProfile} style={{ width: '100%', minHeight: 132 }}>
                <span className="p-mirror-shine" />
                <div className="p-mirror-content" style={{ minHeight: 132 }}>
                  <p className="p-mirror-title">meine Haut</p>
                </div>
              </button>
            </div>

            <div className="p-card" style={{ padding: 18 }}>
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

            <div className="p-card" style={{ padding: 18 }}>
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

      {showSkinProfile && (
        <SkinProfileModal
          profile={skinProfile}
          editSkinType={editSkinType}
          editFacts={editSkinFacts}
          saving={skinSaving}
          message={skinMsg}
          onClose={() => setShowSkinProfile(false)}
          onSkinTypeChange={handleSkinTypeChange}
          onToggleFact={toggleSkinFact}
        />
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
