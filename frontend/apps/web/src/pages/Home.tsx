import { Link, useNavigate } from 'react-router-dom'
import { Bot, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/lib/api'
import serumBild        from '@/images/serum.jpg'
import feuchtigkeitBild from '@/images/Feuchtigkeit.jpg'
import tonerBild        from '@/images/toner.jpg'
import sonnenschutzBild from '@/images/sonnenschutz.jpg'
import cleanserBild     from '@/images/cleanser.jpg'
import HomeBild         from '@/images/face.jpg'
import ManBild          from '@/images/man1.jpg'
import man2             from '@/images/man2.jpg'
import man3             from '@/images/man3.jpg'
import man4             from '@/images/man4.jpg'
import man5             from '@/images/man5.jpg'
import man6             from '@/images/man6.jpg'
import man7             from '@/images/man7.jpg'
import dev1             from '@/images/dev1.jpg'
import dev2             from '@/images/dev2.jpg'
import dev3             from '@/images/dev3.jpg'
import dev4             from '@/images/dev4.jpg'
import dev5             from '@/images/dev5.jpg'
import dev6             from '@/images/dev6.jpg'
import dev7             from '@/images/dev7.jpg'
import skin1            from '@/images/1.jpg'
import skin2            from '@/images/2.jpg'
import skin3            from '@/images/3.jpg'
import skin4            from '@/images/4.jpg'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  .home-root { font-family: 'Outfit', sans-serif; color: #1c1209; background: #FDFAF6; }
  .img-hover { transition: transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94); }
  .img-hover:hover { transform: scale(1.04); }
  .pill-btn { transition: background 0.2s ease; }
  .pill-btn:hover { background: #c4925a !important; }
  .skin-circle { transition: box-shadow 0.25s ease, border-color 0.25s ease; border: 2px solid transparent; }
  .skin-circle:hover { border-color: #D4A574; box-shadow: 0 0 0 4px rgba(212,165,116,0.18); }
  .feat-card { transition: box-shadow 0.25s ease, transform 0.25s ease; }
  .feat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(212,165,116,0.15); }
  .cat-overlay { transition: opacity 0.3s ease; opacity: 0; }
  .cat-card:hover .cat-overlay { opacity: 1; }
  .cat-card img { transition: transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94); }
  .cat-card:hover img { transform: scale(1.06); }
  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .greet-widget { animation: fadeSlideUp 0.5s ease forwards; }
  .greet-option { transition: all 0.2s ease; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); }
  .greet-option:hover { background: rgba(255,255,255,0.2); border-color: #D4A574; transform: translateX(4px); }
  .rec-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
  .rec-card:hover { transform: translateY(-4px); box-shadow: 0 16px 42px rgba(28,18,9,0.12); border-color: #e8c9a0; }
  .rec-card img { transition: transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94); }
  .rec-card:hover img { transform: scale(1.05); }
  @media (max-width: 900px) {
    .home-rec-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  }
  @media (max-width: 560px) {
    .home-rec-grid { grid-template-columns: 1fr !important; }
  }
`

type RecommendedProduct = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  imageUrl?: string | null
  rating?: number | null
  recommendationReason?: string | null
  recommendationBullets?: string[]
}

const skinLabels: Record<string, string> = {
  Normal:      'Normale Haut',
  Oily:        'Fettige Haut',
  Dry:         'Trockene Haut',
  Sensitive:   'Sensible Haut',
  Combination: 'Mischhaut',
}

const skinTypes = [
  { name: 'Normale Haut',  value: 'Normal',      img: skin1 },
  { name: 'Fettige Haut',  value: 'Oily',        img: skin2 },
  { name: 'Mischhaut',     value: 'Combination', img: skin3 },
  { name: 'Sensible Haut', value: 'Sensitive',   img: skin4 },
  { name: 'Trockene Haut', value: 'Dry',         img: skin1 },
]

const skinTypesDiverse = [
  { name: 'Normale Haut',  value: 'Normal',      img: dev2 },
  { name: 'Fettige Haut',  value: 'Oily',        img: dev3 },
  { name: 'Mischhaut',     value: 'Combination', img: dev4 },
  { name: 'Sensible Haut', value: 'Sensitive',   img: dev5 },
  { name: 'Trockene Haut', value: 'Dry',         img: dev6 },
]

const skinTypesMale = [
  { name: 'Sensible Haut', value: 'Sensitive',   img: man2 },
  { name: 'Trockene Haut', value: 'Dry',         img: man3 },
  { name: 'Mischhaut',     value: 'Combination', img: man4 },
  { name: 'Normale Haut',  value: 'Normal',      img: man5 },
  { name: 'Fettige Haut',  value: 'Oily',        img: man6 },
]

// Kategorien je nach Geschlecht sortiert
const allCategories = [
  { name: 'Feuchtigkeitspflege', value: 'Feuchtigkeitspflege', img: feuchtigkeitBild },
  { name: 'Serum',               value: 'Serum',               img: serumBild },
  { name: 'Toner',               value: 'Toner',               img: tonerBild },
  { name: 'Sonnenschutz',        value: 'Sonnenschutz',        img: sonnenschutzBild },
  { name: 'Reinigung',           value: 'Gesichtsreinigung',   img: cleanserBild },
]

function getCategoriesForGender(gender: string | null | undefined) {
  if (gender === 'male') {
    // Männer: Reinigung zuerst, dann Feuchtigkeitspflege, Sonnenschutz
    return [
      allCategories[4], // Reinigung
      allCategories[0], // Feuchtigkeitspflege
      allCategories[3], // Sonnenschutz
      allCategories[1], // Serum
      allCategories[2], // Toner
    ]
  }
  // Frauen & Divers & kein: Standard
  return allCategories
}

const features = [
  { icon: Bot,               title: 'KI-Beratung',     desc: 'Personalisierte Empfehlungen basierend auf deinem Hauttyp.' },
  { icon: Sparkles,          title: 'Premium Qualität', desc: 'Nur geprüfte Produkte mit hochwertigen Inhaltsstoffen.' },
  { icon: SlidersHorizontal, title: 'Einfache Filter',  desc: 'Finde dein Produkt – nach Hauttyp, Anliegen oder Kategorie.' },
]

function getGreeting(gender: string | null | undefined) {
  const h = new Date().getHours()
  const time = h < 12 ? 'Morgen' : h < 17 ? 'Tag' : 'Abend'
  if (gender === 'male')    return `Guten ${time}`
  if (gender === 'female')  return `Guten ${time}`
  if (gender === 'diverse') return `Guten ${time}`
  return `Guten ${time}`
}

function getHeroTagline(gender: string | null | undefined) {
  if (gender === 'male')    return 'Einfache Hautpflege die wirklich funktioniert.'
  if (gender === 'female')  return 'Deine perfekte Skincare-Routine — für strahlende Haut.'
  if (gender === 'diverse') return 'Hautpflege ohne Kompromisse — für jeden.'
  return 'Entdecke kuratierte Hautpflege — abgestimmt auf deinen Hauttyp und deine Bedürfnisse.'
}

function getHeroTitle(gender: string | null | undefined) {
  if (gender === 'male')    return <>Pflege,<br />die <span style={{ color: '#D4A574' }}>wirkt</span>.</>
  if (gender === 'female')  return <>Pflege,<br />die <span style={{ color: '#D4A574' }}>leuchtet</span>.</>
  if (gender === 'diverse') return <>Pflege,<br />die <span style={{ color: '#D4A574' }}>passt</span>.</>
  return <>Pflege,<br />die <span style={{ color: '#D4A574' }}>wirklich</span><br />zu dir passt.</>
}

function getPersonalizedGreeting(firstName: string, gender: string | null | undefined) {
  if (gender === 'male')    return `Hey, ${firstName}! 👋`
  if (gender === 'female')  return `Hey, ${firstName}! ✨`
  if (gender === 'diverse') return `Hey, ${firstName}! 🌟`
  return `Hey, ${firstName}! 👋`
}

function getCategoriesLabel(gender: string | null | undefined) {
  if (gender === 'male')    return 'Einfach & effektiv für Männer'
  if (gender === 'female')  return 'Beliebt bei Frauen'
  if (gender === 'diverse') return 'Unsere Top-Kategorien'
  return 'Nach Kategorie einkaufen'
}

const optionStyle = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 14,
  padding: '14px 18px',
  borderRadius: 14,
  textAlign: 'left' as const,
  fontFamily: "'Outfit', sans-serif",
  color: '#fff',
}

export default function Home() {
  const [email, setEmail]    = useState('')
  const [subscribed, setSub] = useState(false)
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [recommendationPage, setRecommendationPage] = useState(0)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [profileSkinType, setProfileSkinType] = useState<string | null>(null)
  const [profileGender, setProfileGender] = useState<string | null>(null)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const { user, token, updateUser } = useAuth()
  const navigate = useNavigate()

  const firstName  = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || null
  const skinType   = profileSkinType ?? user?.skinType ?? null
  const gender     = profileGender ?? user?.gender ?? null
  const greeting   = getGreeting(gender)
  const categories = getCategoriesForGender(gender)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    styleRef.current = el
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current) }
  }, [])

  useEffect(() => {
    async function fetchProfileContext() {
      if (!token) {
        setProfileSkinType(null)
        setProfileGender(null)
        return
      }

      try {
        const res = await fetch(apiUrl('/api/auth/profile-context'), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) return

        const data = await res.json()
        const nextSkinType = data.skinType ?? null
        const nextGender = data.gender ?? null

        setProfileSkinType(nextSkinType)
        setProfileGender(nextGender)

        if (user && (user.skinType !== nextSkinType || user.gender !== nextGender)) {
          updateUser({
            ...user,
            skinType: nextSkinType,
            gender: nextGender,
          })
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchProfileContext()
  }, [token, user?.id, user?.skinType, user?.gender, updateUser])

  useEffect(() => {
    async function fetchRecommendations() {
      if (!token) {
        setRecommendedProducts([])
        return
      }

      try {
        setRecommendationsLoading(true)
        const res = await fetch(apiUrl('/api/products/recommendations/me?limit=12'), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          setRecommendedProducts([])
          return
        }

        const data = await res.json()
        setRecommendedProducts(Array.isArray(data.products) ? data.products : [])
      } catch (err) {
        console.error(err)
        setRecommendedProducts([])
      } finally {
        setRecommendationsLoading(false)
      }
    }

    fetchRecommendations()
  }, [token, skinType, gender])

  const showRecommendations = Boolean(token) && recommendedProducts.length > 0
  const recommendationTarget = skinType
    ? skinLabels[skinType] || skinType
    : 'Dich'
  const recommendedPageSize = 5
  const recommendationPageCount = Math.ceil(recommendedProducts.length / recommendedPageSize)
  const visibleRecommendedProducts = recommendedProducts.slice(
    recommendationPage * recommendedPageSize,
    recommendationPage * recommendedPageSize + recommendedPageSize
  )

  useEffect(() => {
    setRecommendationPage(0)
  }, [recommendedProducts.length])

  return (
    <div className="home-root overflow-x-hidden">

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '92vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src={gender === 'male' ? ManBild : (!gender || gender === 'diverse') ? dev1 : HomeBild} alt="Skincare" className="img-hover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(20,12,4,0.78) 0%, rgba(20,12,4,0.42) 55%, rgba(20,12,4,0.08) 100%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '50px 48px', width: '100%' }}>

          {/* ── Willkommenscode Banner ── */}
          {(!firstName || !user?.usedWelcomeCode) && (
            <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, zIndex: 2, padding: '0 48px', display: 'flex', alignItems: 'center', gap: 12 }}>
              
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 300 }}>
                {firstName ? 'Dein Willkommenscode:' : 'Registriere dich und spare 10% —'}
              </p>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#D4A574', letterSpacing: '0.1em' }}>WELCOME10</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>· einmalig</span>
            </div>
          )}

          {firstName ? (
            <div className="greet-widget" style={{ maxWidth: 480 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A574', fontWeight: 600, marginBottom: 16 }}>
                ✦ &nbsp;{greeting}
              </p>
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 8px' }}>
                {getPersonalizedGreeting(firstName, gender)}
              </h1>

              {skinType ? (
                <>
                  <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', margin: '0 0 6px', fontWeight: 300 }}>Dein Hauttyp:</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 24px' }}>
                    <p style={{ fontSize: 18, color: '#D4A574', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                      {skinLabels[skinType] || skinType}
                    </p>
                    <button
                      onClick={async () => {
                        const stored = localStorage.getItem('user')
                        const parsed = stored ? JSON.parse(stored) : null
                        const t = user?.token || parsed?.token || localStorage.getItem('token')
                        if (!t) return
                        try {
                          const res = await fetch(apiUrl('/api/auth/skin-type'), {
                            method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
                          })
                          const data = await res.json()
                          setProfileSkinType(null)
                          if (data.user) updateUser({ ...user!, ...data.user, token: t })
                          else updateUser({ ...user!, skinType: null, token: t })
                        } catch (err) { console.error(err) }
                      }}
                      style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,80,80,0.35)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                      title="Hauttyp zurücksetzen"
                    >×</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => navigate(`/shop?skinType=${skinType}`)} className="greet-option" style={optionStyle}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}></span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>Produkte für {skinLabels[skinType]}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 300 }}>Passend zu deinem Hauttyp</p>
                      </div>
                      <ArrowRight size={16} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
                    </button>
                    <button onClick={() => navigate('/quiz')} className="greet-option" style={optionStyle}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}></span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>Quiz nochmal machen</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 300 }}>Hauttyp neu ermitteln</p>
                      </div>
                      <ArrowRight size={16} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
                    </button>
                    <button onClick={() => navigate('/chatbot')} className="greet-option" style={optionStyle}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}></span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>SelfGlow KI fragen</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 300 }}>Persönliche KI-Beratung</p>
                      </div>
                      <ArrowRight size={16} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', margin: '0 0 28px', fontWeight: 300, lineHeight: 1.6 }}>
                    {getHeroTagline(gender)}<br />Möchtest du…
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => navigate('/quiz')} className="greet-option" style={optionStyle}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}></span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>Schnelles Quiz</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 300 }}>30 Sekunden — Hauttyp ermitteln</p>
                      </div>
                      <ArrowRight size={16} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
                    </button>
                    <button onClick={() => navigate('/shop')} className="greet-option" style={optionStyle}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}></span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>Produkte direkt entdecken</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 300 }}>Stöbere in unserer Auswahl</p>
                      </div>
                      <ArrowRight size={16} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
                    </button>
                    <button onClick={() => navigate('/chatbot')} className="greet-option" style={optionStyle}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}></span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#fff' }}>SelfGlow KI fragen</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 300 }}>Persönliche KI-Beratung</p>
                      </div>
                      <ArrowRight size={16} style={{ marginLeft: 'auto', color: '#D4A574', flexShrink: 0 }} />
                    </button>
                  </div>
                </>
              )}
            </div>

          ) : (
            /* ── Nicht eingeloggt ── */
            <div style={{ maxWidth: 560 }}>
             
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(42px, 6vw, 78px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 24px' }}>
                {getHeroTitle('diverse')}
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, margin: '0 0 20px', fontWeight: 300, maxWidth: 420 }}>
                Registriere dich und erhalte eine <span style={{ color: '#D4A574', fontWeight: 500 }}>vollständig personalisierte Erfahrung</span> — basierend auf deinem Geschlecht, Hauttyp und deinen Bedürfnissen.
              </p>
             
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/login" className="pill-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#D4A574', color: '#fff', padding: '15px 32px', borderRadius: 100, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                  Jetzt einloggen <ArrowRight size={15} />
                </Link>
                <Link to="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '15px 32px', borderRadius: 100, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
                  Produkte entdecken
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── PERSONALIZED STRIP ── */}
      <section style={{ background: '#fff', padding: showRecommendations ? '38px 28px' : '64px 28px' }}>
        <div style={{ maxWidth: showRecommendations ? 1040 : 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: showRecommendations ? 20 : 40 }}>
            {!showRecommendations && (
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 6, fontWeight: 500 }}>
                Hauttyp entdecken
              </p>
            )}
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: showRecommendations ? 'clamp(18px, 2vw, 24px)' : 'clamp(22px, 2.8vw, 34px)', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              {showRecommendations ? `Für ${recommendationTarget}` : 'Welcher Hauttyp bist du?'}
            </h2>
          </div>
          {showRecommendations ? (
            <div style={{ position: 'relative' }}>
              <div className="home-rec-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
                {visibleRecommendedProducts.map((product) => (
                  <Link
                    to={`/product/${product.id}`}
                    key={product.id}
                    className="rec-card"
                    style={{ minWidth: 0, border: '1px solid #F0DCC8', borderRadius: 12, overflow: 'hidden', background: '#fff', textDecoration: 'none', color: '#1c1209', display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ aspectRatio: '1 / 0.72', background: '#fff', overflow: 'hidden' }}>
                      <img
                        src={product.imageUrl || 'https://placehold.co/300x300?text=SelfGlow'}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: 8 }}
                      />
                    </div>
                    <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <p style={{ fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#C4925A', margin: 0, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.category}
                      </p>
                      <h3 style={{ fontSize: 13, lineHeight: 1.25, fontWeight: 700, margin: 0, color: '#1c1209', minHeight: 30, overflow: 'hidden' }}>
                        {product.name}
                      </h3>
                      <p style={{ fontSize: 10, color: '#9a7a5a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.brand}
                      </p>
                      {product.recommendationBullets && product.recommendationBullets.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, marginTop: 2, overflow: 'hidden', minHeight: 18 }}>
                          {product.recommendationBullets.slice(0, 4).map((bullet) => (
                            <span
                              key={bullet}
                              style={{
                                flex: '0 0 auto',
                                borderRadius: 999,
                                background: '#FDF7F0',
                                padding: '2px 7px',
                                fontSize: 9,
                                lineHeight: '14px',
                                color: '#7A5A3A',
                                maxWidth: 78,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {bullet}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#1c1209' }}>
                          {product.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <ArrowRight size={13} color="#D4A574" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
                {recommendationPage > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecommendationPage((page) => Math.max(0, page - 1))}
                    aria-label="Vorherige Empfehlungen anzeigen"
                    style={{ position: 'absolute', top: '50%', left: -18, transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: '1px solid #F0DCC8', background: '#fff', boxShadow: '0 8px 24px rgba(28,18,9,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
                  >
                    <ArrowRight size={18} color="#D4A574" style={{ transform: 'rotate(180deg)' }} />
                  </button>
                )}
                {recommendationPageCount > 1 && (
                  <button
                    type="button"
                    onClick={() => setRecommendationPage((page) => (page + 1) % recommendationPageCount)}
                    aria-label="Weitere Empfehlungen anzeigen"
                    style={{ position: 'absolute', top: '50%', right: -18, transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: '1px solid #F0DCC8', background: '#fff', boxShadow: '0 8px 24px rgba(28,18,9,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
                  >
                    <ArrowRight size={18} color="#D4A574" />
                  </button>
                )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, opacity: recommendationsLoading ? 0.65 : 1 }}>
              {(gender === 'male' ? skinTypesMale : (!gender || gender === 'diverse') ? skinTypesDiverse : skinTypes).map((t) => (
                <Link to={`/shop?skinType=${encodeURIComponent(t.value)}`} key={t.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textDecoration: 'none', flex: '1 1 100px' }}>
                  <div className="skin-circle" style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden' }}>
                    <img src={t.img} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#7a5c42', letterSpacing: '0.04em', textAlign: 'center' }}>{t.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section style={{ background: '#FDFAF6', padding: '80px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 8, fontWeight: 500 }}>Stöbere & entdecke</p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              {getCategoriesLabel(gender)}
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gridTemplateRows: '320px 320px', gap: 14 }}>
            <Link to={`/shop?category=${encodeURIComponent(categories[0].value)}`} className="cat-card" style={{ gridRow: 'span 2', borderRadius: 20, overflow: 'hidden', position: 'relative', display: 'block' }}>
              <img src={categories[0].img} alt={categories[0].name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />
              <div className="cat-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(212,165,116,0.18)' }} />
              <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {gender === 'male' ? 'Essentiell' : 'Bestseller'}
                </p>
                <p style={{ fontFamily: "'Outfit', sans-serif", color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{categories[0].name}</p>
              </div>
            </Link>
            {categories.slice(1).map((cat) => (
              <Link to={`/shop?category=${encodeURIComponent(cat.value)}`} key={cat.value} className="cat-card" style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', display: 'block' }}>
                <img src={cat.img} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }} />
                <div className="cat-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(212,165,116,0.15)' }} />
                <div style={{ position: 'absolute', bottom: 18, left: 18 }}>
                  <p style={{ fontFamily: "'Outfit', sans-serif", color: '#fff', fontSize: 17, fontWeight: 700, margin: 0 }}>{cat.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY SELFGLOW ── */}
      <section style={{ background: '#fff', padding: '80px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 8, fontWeight: 500 }}>Unser Versprechen</p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Warum <span style={{ color: '#D4A574' }}>SelfGlow</span>?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} className="feat-card" style={{ background: '#FDF6EE', border: '1px solid #F0DCC8', borderRadius: 20, padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', border: '1px solid #e8c9a0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <f.icon size={20} color="#D4A574" strokeWidth={1.5} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, margin: '0 0 6px', color: '#1c1209' }}>{f.title}</p>
                  <p style={{ fontSize: 14, color: '#9a7a5a', margin: 0, lineHeight: 1.65, fontWeight: 300 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

     {/* ── COMMUNITY ── */}
<section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 460 }}>
  <div style={{ position: 'relative', overflow: 'hidden' }}>
    <img src={gender === 'male' ? man7 : (!gender || gender === 'diverse') ? dev7 : "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&h=700&fit=crop"} alt="Community" className="img-hover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,18,9,0.22)' }} />
  </div>
  <div style={{ background: '#1c1209', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px clamp(28px,6vw,80px)', gap: 20 }}>
    <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D4A574', fontWeight: 500, margin: 0 }}>Für strahlende Haut</p>
    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(22px,2.8vw,36px)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
      Hautpflege, die<br />zu dir passt.
    </h3>
    <p style={{ fontSize: 15, color: '#b8967a', margin: 0, lineHeight: 1.65, fontWeight: 300, maxWidth: 340 }}>
      Von der ersten Analyse bis zur perfekten Routine — wir begleiten dich mit ehrlicher Beratung und Produkten, die wirklich zu deiner Haut passen.
    </p>
    <p style={{ fontSize: 15, color: '#b8967a', margin: 0, lineHeight: 1.65, fontWeight: 300, maxWidth: 340 }}>
      Keine leeren Versprechen, keine Massenware — nur das, was deine Haut wirklich braucht.
    </p>
  </div>
</section>
    </div>
  )
}