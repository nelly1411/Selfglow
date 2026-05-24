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
`

const questions = [
  {
    id: 1,
    question: 'Wie fühlt sich deine Haut morgens nach dem Aufwachen an?',
    emoji: '🌅',
    options: [
      { label: 'Frisch und angenehm',                       value: 'Normal' },
      { label: 'Glänzend und fettig',                       value: 'Oily' },
      { label: 'Fest und trocken',                          value: 'Dry' },
      { label: 'Gemischt — T-Zone fettig, Wangen trocken',  value: 'Combination' },
    ],
  },
  {
    id: 2,
    question: 'Wie reagiert deine Haut auf neue Produkte?',
    emoji: '🧴',
    options: [
      { label: 'Kaum — verträgt fast alles',   value: 'Normal' },
      { label: 'Wird schnell noch fettiger',   value: 'Oily' },
      { label: 'Rötungen oder Brennen',        value: 'Sensitive' },
      { label: 'Spannt oder schuppt sich',     value: 'Dry' },
    ],
  },
  {
    id: 3,
    question: 'Wie oft siehst du vergrößerte Poren?',
    emoji: '🔍',
    options: [
      { label: 'Selten bis nie',                         value: 'Normal' },
      { label: 'Oft, besonders im Gesichtszentrum',      value: 'Oily' },
      { label: 'Nur in der T-Zone',                      value: 'Combination' },
      { label: 'Kaum sichtbar, aber Haut wirkt matt',    value: 'Dry' },
    ],
  },
  {
    id: 4,
    question: 'Was beschreibt dein Hauptanliegen am besten?',
    emoji: '✨',
    options: [
      { label: 'Haut soll strahlen und gepflegt aussehen', value: 'Normal' },
      { label: 'Glanz & Unreinheiten reduzieren',          value: 'Oily' },
      { label: 'Rötungen & Reizungen beruhigen',           value: 'Sensitive' },
      { label: 'Feuchtigkeit und Elastizität aufbauen',    value: 'Dry' },
    ],
  },
]

const skinTypeInfo: Record<string, { label: string; desc: string; emoji: string; shopFilter: string }> = {
  Normal:      { label: 'Normale Haut',  emoji: '🌿', desc: 'Deine Haut ist ausgeglichen — weder zu fettig noch zu trocken. Du brauchst leichte Pflege, die deinen natürlichen Zustand erhält.',        shopFilter: 'Normal' },
  Oily:        { label: 'Fettige Haut',  emoji: '💧', desc: 'Deine Haut produziert viel Sebum. Leichte, porenreinigende Produkte helfen dir, Glanz zu kontrollieren ohne die Haut auszutrocknen.',     shopFilter: 'Oily' },
  Dry:         { label: 'Trockene Haut', emoji: '🌸', desc: 'Deine Haut braucht intensive Feuchtigkeit. Reichhaltige Cremes und Hyaluron-Seren sind deine besten Freunde.',                             shopFilter: 'Dry' },
  Sensitive:   { label: 'Sensible Haut', emoji: '🕊️', desc: 'Deine Haut reagiert empfindlich. Sanfte, parfümfreie Produkte mit beruhigenden Inhaltsstoffen wie Aloe und Ceramiden sind ideal.',       shopFilter: 'Sensitive' },
  Combination: { label: 'Mischhaut',     emoji: '⚖️', desc: 'Deine Haut ist gemischt — T-Zone fettig, Wangen eher trocken. Du brauchst Produkte, die beides balancieren ohne eine Zone zu belasten.', shopFilter: 'Combination' },
}

function getMostFrequent(arr: string[]) {
  const count: Record<string, number> = {}
  arr.forEach(v => { count[v] = (count[v] || 0) + 1 })
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]
}

export default function SkinQuiz() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()   // ← hooks inside component ✓
  const styleRef = useRef<HTMLStyleElement | null>(null)

  const [step,     setStep]     = useState(0)
  const [answers,  setAnswers]  = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [result,   setResult]   = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    styleRef.current = el
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current) }
  }, [])

  const currentQ = questions[step - 1]
  const progress  = step === 0 ? 0 : step >= 5 ? 100 : (step / questions.length) * 100

  function handleSelect(value: string) {
    setSelected(value)
  }

  async function handleNext() {
    if (!selected) return
    const newAnswers = [...answers, selected]
    setAnswers(newAnswers)
    setSelected(null)

    if (step === questions.length) {
      const skin = getMostFrequent(newAnswers)
      setResult(skin)
      setStep(5)

      // ── Hauttyp im Backend speichern (nur wenn eingeloggt) ──
      if (user?.token) {
        setSaving(true)
        try {
          const res = await fetch(`${API}/api/auth/skin-type`, {
            method:  'PATCH',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${user.token}`,
            },
            body: JSON.stringify({ skinType: skin }),
          })
          const data = await res.json()
          if (data.user) {
            updateUser({ ...user, ...data.user, token: user.token })
          }
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
    if (step === 1) { setStep(0); setAnswers([]); setSelected(null) }
    else            { setStep(step - 1); setAnswers(answers.slice(0, -1)); setSelected(null) }
  }

  function resetQuiz() {
    setStep(0); setAnswers([]); setSelected(null); setResult(null)
  }

  const skinResult = result ? skinTypeInfo[result] : null

  return (
    <div className="quiz-root" style={{ minHeight: '100vh', background: '#FDFAF6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>

      {/* Progress bar */}
      {step > 0 && step < 5 && (
        <div style={{ width: '100%', maxWidth: 560, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#b8967a', fontWeight: 500 }}>Frage {step} von {questions.length}</span>
            <span style={{ fontSize: 12, color: '#D4A574', fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: '#F0DCC8', borderRadius: 100 }}>
            <div style={{ height: '100%', background: '#D4A574', borderRadius: 100, width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* ── INTRO ── */}
        {step === 0 && (
          <div className="quiz-slide" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>🧖‍♀️</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#1c1209', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Schnelles Haut-Quiz
            </h1>
            <p style={{ fontSize: 15, color: '#9a7a5a', lineHeight: 1.7, margin: '0 0 8px', fontWeight: 300 }}>
              4 kurze Fragen — in nur 30 Sekunden
            </p>
            <p style={{ fontSize: 14, color: '#c4a882', margin: '0 0 40px', fontWeight: 300 }}>
              Wir ermitteln deinen Hauttyp und empfehlen die passenden Produkte.
              {user && <><br /><span style={{ color: '#D4A574' }}>Das Ergebnis wird in deinem Konto gespeichert.</span></>}
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
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{currentQ.emoji}</div>
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
            <div style={{ fontSize: 52, marginBottom: 16 }}>{skinResult.emoji}</div>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 8, fontWeight: 600 }}>
              Dein Hauttyp
            </p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#1c1209', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              {skinResult.label}
            </h2>
            <p style={{ fontSize: 15, color: '#7a5c42', lineHeight: 1.75, margin: '0 auto 16px', maxWidth: 420, fontWeight: 300 }}>
              {skinResult.desc}
            </p>

            {/* Gespeichert-Hinweis */}
            {user && (
              <p style={{ fontSize: 13, color: saving ? '#b8967a' : '#D4A574', marginBottom: 32, fontWeight: 500 }}>
                {saving ? '⏳ Wird gespeichert…' : '✓ In deinem Konto gespeichert'}
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
                onClick={resetQuiz}
                style={{ padding: '13px 28px', borderRadius: 100, background: 'transparent', border: '1.5px solid #e8c9a0', color: '#9a7a5a', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
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