import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API = 'http://localhost:5050'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .quiz-root { font-family: 'Outfit', sans-serif; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .quiz-option {
    transition: all 0.2s ease;
    cursor: pointer;
    border: 2px solid #F0DCC8;
  }
  .quiz-option:hover {
    border-color: #D4A574;
    background: #FDF6EE;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(212,165,116,0.15);
  }
  .quiz-option.selected {
    border-color: #D4A574;
    background: #FDF6EE;
    box-shadow: 0 0 0 3px rgba(212,165,116,0.2);
  }
  .quiz-slide { animation: fadeSlideUp 0.4s ease forwards; }
  .confirm-overlay { animation: fadeIn 0.2s ease forwards; }
`

const questions = [
  {
    id: 1,
    question: 'Wie fühlt sich deine Haut morgens nach dem Aufwachen an?',
    options: [
      { label: 'Frisch und angenehm',                      value: 'Normal' },
      { label: 'Glänzend und fettig',                      value: 'Oily' },
      { label: 'Fest und trocken',                         value: 'Dry' },
      { label: 'Gemischt — T-Zone fettig, Wangen trocken', value: 'Combination' },
    ],
  },
  {
    id: 2,
    question: 'Wie reagiert deine Haut auf neue Produkte?',
    options: [
      { label: 'Kaum — verträgt fast alles',  value: 'Normal' },
      { label: 'Wird schnell noch fettiger',  value: 'Oily' },
      { label: 'Rötungen oder Brennen',       value: 'Sensitive' },
      { label: 'Spannt oder schuppt sich',    value: 'Dry' },
    ],
  },
  {
    id: 3,
    question: 'Wie oft siehst du vergrößerte Poren?',
    options: [
      { label: 'Selten bis nie',                       value: 'Normal' },
      { label: 'Oft, besonders im Gesichtszentrum',    value: 'Oily' },
      { label: 'Nur in der T-Zone',                    value: 'Combination' },
      { label: 'Kaum sichtbar, aber Haut wirkt matt',  value: 'Dry' },
    ],
  },
  {
    id: 4,
    question: 'Was beschreibt dein Hauptanliegen am besten?',
    options: [
      { label: 'Haut soll strahlen und gepflegt aussehen', value: 'Normal' },
      { label: 'Glanz & Unreinheiten reduzieren',          value: 'Oily' },
      { label: 'Rötungen & Reizungen beruhigen',           value: 'Sensitive' },
      { label: 'Feuchtigkeit und Elastizität aufbauen',    value: 'Dry' },
    ],
  },
]

const skinTypeInfo: Record<string, { label: string; desc: string; shopFilter: string }> = {
  Normal:      { label: 'Normale Haut',  desc: 'Deine Haut ist ausgeglichen — weder zu fettig noch zu trocken. Du brauchst leichte Pflege, die deinen natürlichen Zustand erhält.',        shopFilter: 'Normal' },
  Oily:        { label: 'Fettige Haut',  desc: 'Deine Haut produziert viel Sebum. Leichte, porenreinigende Produkte helfen dir, Glanz zu kontrollieren ohne die Haut auszutrocknen.',     shopFilter: 'Oily' },
  Dry:         { label: 'Trockene Haut', desc: 'Deine Haut braucht intensive Feuchtigkeit. Reichhaltige Cremes und Hyaluron-Seren sind deine besten Freunde.',                             shopFilter: 'Dry' },
  Sensitive:   { label: 'Sensible Haut', desc: 'Deine Haut reagiert empfindlich. Sanfte, parfümfreie Produkte mit beruhigenden Inhaltsstoffen wie Aloe und Ceramiden sind ideal.',       shopFilter: 'Sensitive' },
  Combination: { label: 'Mischhaut',     desc: 'Deine Haut ist gemischt — T-Zone fettig, Wangen eher trocken. Du brauchst Produkte, die beides balancieren ohne eine Zone zu belasten.', shopFilter: 'Combination' },
}

function getMostFrequent(map: Record<number, string>) {
  const values = Object.values(map)
  const count: Record<string, number> = {}
  values.forEach(v => { count[v] = (count[v] || 0) + 1 })
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]
}

export default function SkinQuiz() {
  const navigate             = useNavigate()
  const { user, updateUser } = useAuth()
  const styleRef             = useRef<HTMLStyleElement | null>(null)

  const [step,        setStep]        = useState(0)
  // answers ist eine Map: { 1: 'Normal', 2: 'Oily', ... } — Index = Fragenummer
  const [answers,     setAnswers]     = useState<Record<number, string>>({})
  const [result,      setResult]      = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    styleRef.current = el
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current) }
  }, [])

  const currentQ  = questions[step - 1]
  // Aktuelle Antwort für diesen Step aus der Map lesen
  const selected  = answers[step] ?? null

  function handleSelect(value: string) {
    setAnswers(prev => ({ ...prev, [step]: value }))
  }

  async function handleNext() {
    if (!selected) return

    if (step === questions.length) {
      const skin = getMostFrequent(answers)
      setResult(skin)
      setStep(5)

      if (user?.token) {
        setSaving(true)
        try {
          const res  = await fetch(`${API}/api/auth/skin-type`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
            body:    JSON.stringify({ skinType: skin }),
          })
          const data = await res.json()
          if (data.user) updateUser({ ...user, ...data.user, token: user.token })
        } catch (err) {
          console.warn('Hauttyp konnte nicht gespeichert werden:', err)
        } finally {
          setSaving(false)
        }
      }
    } else {
      setStep(step + 1)
    }
  }

  function handleBack() {
    if (step === 1) {
      setStep(0)
    } else {
      setStep(step - 1)
    }
    // Antworten bleiben alle erhalten — selected wird automatisch aus answers[step] gelesen
  }

  function resetQuiz() {
    setStep(0); setAnswers({}); setResult(null)
  }

  function openConfirm()  { setShowConfirm(true) }
  function confirmExit()  { setShowConfirm(false); navigate('/') }

  const skinResult = result ? skinTypeInfo[result] : null

  return (
    <div
      className="quiz-root"
      style={{ minHeight: '100vh', background: '#FDFAF6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', position: 'relative' }}
    >

      {/* ── Bestätigungs-Dialog ── */}
      {showConfirm && (
        <div
          className="confirm-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', fontFamily: "'Outfit', sans-serif" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1c1209', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Quiz aufhören?</h3>
            <p style={{ fontSize: 14, color: '#9a7a5a', margin: '0 0 28px', lineHeight: 1.6, fontWeight: 300 }}>
              Dein Fortschritt geht verloren. Möchtest du das Quiz wirklich beenden?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, border: '1.5px solid #e0c9a8', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#7a5c42', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Nein, weiter
              </button>
              <button
                onClick={confirmExit}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, background: '#D4A574', border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#c4925a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#D4A574')}
              >
                Ja, beenden
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* ── Verlassen-Pfeil ── */}
        {step < 5 && (
          <button
            onClick={openConfirm}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#b8967a', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif", padding: '0 0 24px 0' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D4A574')}
            onMouseLeave={e => (e.currentTarget.style.color = '#b8967a')}
          >
            <ArrowLeft size={15} />
            Verlassen
          </button>
        )}

        {/* ── INTRO ── */}
        {step === 0 && (
          <div className="quiz-slide" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🧖‍♀️</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#1c1209', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Schnelles Haut-Quiz
            </h1>
            <p style={{ fontSize: 15, color: '#9a7a5a', lineHeight: 1.7, margin: '0 0 8px', fontWeight: 300 }}>
              4 kurze Fragen — in nur 30 Sekunden
            </p>
            <p style={{ fontSize: 14, color: '#c4a882', margin: '0 0 40px', fontWeight: 300 }}>
              Wir ermitteln deinen Hauttyp und empfehlen die passenden Produkte.
              {user && <><br /></>}
            </p>
            <button
              onClick={() => setStep(1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#D4A574', color: '#fff', padding: '15px 36px', borderRadius: 100, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
            >
              Quiz starten <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {step >= 1 && step <= 4 && currentQ && (
          <div className="quiz-slide" key={step}>
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4925A', margin: '0 0 10px', fontWeight: 600 }}>
                Frage {step} von {questions.length}
              </p>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#1c1209', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {currentQ.question}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {currentQ.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`quiz-option ${selected === opt.value ? 'selected' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 14, background: '#fff', textAlign: 'left', fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 500, color: '#1c1209' }}
                >
                  <span>{opt.label}</span>
                  {selected === opt.value && <CheckCircle size={18} color="#D4A574" />}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleBack}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 20px', borderRadius: 100, background: 'transparent', border: '1.5px solid #e8c9a0', color: '#9a7a5a', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                <ArrowLeft size={15} /> Zurück
              </button>
              <button
                onClick={handleNext}
                disabled={!selected}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 24px', borderRadius: 100, background: selected ? '#D4A574' : '#e8c9a0', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: selected ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", transition: 'background 0.2s' }}
              >
                {step === questions.length ? 'Ergebnis anzeigen' : 'Weiter'} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === 5 && skinResult && (
          <div className="quiz-slide" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 8, fontWeight: 600 }}>
              Dein Hauttyp
            </p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#1c1209', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              {skinResult.label}
            </h2>
            <p style={{ fontSize: 15, color: '#7a5c42', lineHeight: 1.75, margin: '0 auto 16px', maxWidth: 420, fontWeight: 300 }}>
              {skinResult.desc}
            </p>

            {user && (
              <p style={{ fontSize: 13, color: saving ? '#b8967a' : '#D4A574', marginBottom: 32, fontWeight: 500 }}>
                {saving ? '⏳ Wird gespeichert…' : ''}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => navigate(`/shop?skinType=${encodeURIComponent(skinResult.shopFilter)}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px 28px', borderRadius: 100, background: '#D4A574', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                Passende Produkte entdecken <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate('/')}
                style={{ padding: '13px 28px', borderRadius: 100, background: 'transparent', border: '1.5px solid #e8c9a0', color: '#9a7a5a', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                Zur Startseite
              </button>
              <button
                onClick={resetQuiz}
                style={{ fontSize: 13, color: '#c4a882', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", textDecoration: 'underline' }}
              >
                Quiz wiederholen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}