import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/lib/api'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .quiz-root { font-family: 'Outfit', sans-serif; }
  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .quiz-option { transition: all 0.2s ease; cursor: pointer; border: 2px solid #F0DCC8; }
  .quiz-option:hover { border-color: #D4A574; background: #FDF6EE; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,165,116,0.15); }
  .quiz-option.selected { border-color: #D4A574; background: #FDF6EE; box-shadow: 0 0 0 3px rgba(212,165,116,0.2); }
  .quiz-slide { animation: fadeSlideUp 0.4s ease forwards; }
  .confirm-overlay { animation: fadeIn 0.2s ease forwards; }
`

type QuizFact = { key: string; value: string }
type QuizOption = { label: string; value: string; facts: QuizFact[] }
type QuizQuestion = { id: number; question: string; options: QuizOption[] }

function facts(...items: Array<[string, string]>): QuizFact[] {
  return items.map(([key, value]) => ({ key, value }))
}

// ── 4 Fragen für Frauen ────────────────────────────────────────────────────────
const questionsFemale: QuizQuestion[] = [
  {
    id: 1,
    question: 'Wie fühlt sich deine Haut morgens nach dem Aufwachen an?',
    options: [
      { label: 'Frisch und angenehm ausgeglichen',          value: 'Normal',      facts: facts(['skin_state', 'balanced']) },
      { label: 'Glänzend und fettig',                       value: 'Oily',        facts: facts(['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: 'Fest, trocken und spannend',                value: 'Dry',         facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness']) },
      { label: 'T-Zone fettig, Wangen eher trocken',        value: 'Combination', facts: facts(['skin_state', 'oily_t_zone'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 2,
    question: 'Wie reagiert deine Haut auf neue Pflegeprodukte?',
    options: [
      { label: 'Kaum — verträgt fast alles problemlos',      value: 'Normal',    facts: facts(['sensitivity', 'tolerant']) },
      { label: 'Wird schnell noch fettiger oder glänzender', value: 'Oily',      facts: facts(['product_reaction', 'too_greasy'], ['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: 'Rötungen, Brennen oder Jucken',              value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness'], ['product_reaction', 'burning']) },
      { label: 'Spannt, schuppt oder zieht sich zusammen',   value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['skin_state', 'flakiness'], ['product_reaction', 'drying']) },
    ],
  },
  {
    id: 3,
    question: 'Wie oft siehst du vergrößerte Poren?',
    options: [
      { label: 'Selten bis nie',                             value: 'Normal',      facts: facts(['skin_state', 'refined_pores']) },
      { label: 'Häufig, besonders im Gesichtszentrum',       value: 'Oily',        facts: facts(['concern', 'pores'], ['skin_state', 'oily']) },
      { label: 'Nur in der T-Zone',                          value: 'Combination', facts: facts(['concern', 'pores'], ['skin_state', 'oily_t_zone']) },
      { label: 'Kaum sichtbar, aber Haut wirkt matt',        value: 'Dry',         facts: facts(['skin_state', 'matte'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 4,
    question: 'Wie fühlt sich deine Haut nach der Reinigung an?',
    options: [
      { label: 'Angenehm sauber und frisch',                 value: 'Normal',    facts: facts(['skin_state', 'balanced']) },
      { label: 'Immer noch etwas fettig',                    value: 'Oily',      facts: facts(['skin_state', 'oily']) },
      { label: 'Sehr trocken und spannt stark',              value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['product_reaction', 'drying']) },
      { label: 'Empfindlich und leicht gereizt',             value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness']) },
    ],
  },
]

// ── 4 Fragen für Männer ────────────────────────────────────────────────────────
const questionsMale: QuizQuestion[] = [
  {
    id: 1,
    question: 'Wie fühlt sich deine Haut morgens nach dem Aufwachen an?',
    options: [
      { label: 'Frisch und normal — kein Problem',           value: 'Normal',      facts: facts(['skin_state', 'balanced']) },
      { label: 'Fettig und glänzend',                        value: 'Oily',        facts: facts(['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: 'Trocken und spannt',                         value: 'Dry',         facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness']) },
      { label: 'Stirn fettig, Wangen eher trocken',          value: 'Combination', facts: facts(['skin_state', 'oily_t_zone'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 2,
    question: 'Wie reagiert deine Haut nach dem Rasieren?',
    options: [
      { label: 'Kein Problem, fühlt sich normal an',         value: 'Normal',    facts: facts(['sensitivity', 'tolerant']) },
      { label: 'Wird schnell wieder fettig',                 value: 'Oily',      facts: facts(['product_reaction', 'too_greasy'], ['skin_state', 'oily']) },
      { label: 'Brennt, rötet sich oder juckt',              value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness'], ['product_reaction', 'burning']) },
      { label: 'Spannt stark und fühlt sich rau an',         value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['skin_state', 'rough_texture'], ['product_reaction', 'drying']) },
    ],
  },
  {
    id: 3,
    question: 'Wie oft hast du Probleme mit Unreinheiten oder Pickeln?',
    options: [
      { label: 'Selten bis nie',                             value: 'Normal',      facts: facts(['skin_state', 'clear_skin']) },
      { label: 'Häufig, besonders in der T-Zone',            value: 'Oily',        facts: facts(['concern', 'blemishes'], ['skin_state', 'oily_t_zone']) },
      { label: 'Manchmal, nur in der Stirngegend',           value: 'Combination', facts: facts(['concern', 'blemishes'], ['skin_state', 'oily_t_zone']) },
      { label: 'Kaum, aber Haut ist oft trocken',            value: 'Dry',         facts: facts(['skin_state', 'clear_skin'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 4,
    question: 'Was passiert wenn du längere Zeit keine Feuchtigkeitscreme benutzt?',
    options: [
      { label: 'Eigentlich nichts Besonderes',               value: 'Normal',    facts: facts(['skin_state', 'balanced']) },
      { label: 'Haut wird noch fettiger',                    value: 'Oily',      facts: facts(['skin_state', 'oily']) },
      { label: 'Haut spannt und schuppt sich',               value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['skin_state', 'flakiness']) },
      { label: 'Haut wird gereizt und empfindlich',          value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness']) },
    ],
  },
]

// ── 4 Fragen für Divers ────────────────────────────────────────────────────────
const questionsDiverse: QuizQuestion[] = [
  {
    id: 1,
    question: 'Wie fühlt sich deine Haut morgens an?',
    options: [
      { label: 'Ausgeglichen und angenehm',                  value: 'Normal',      facts: facts(['skin_state', 'balanced']) },
      { label: 'Fettig und glänzend',                        value: 'Oily',        facts: facts(['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: 'Trocken, spannt oder zieht',                 value: 'Dry',         facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness']) },
      { label: 'Gemischt je nach Bereich',                   value: 'Combination', facts: facts(['skin_state', 'oily_t_zone'], ['skin_state', 'dryness']) },
    ],
  },
  {
    id: 2,
    question: 'Wie reagiert deine Haut auf neue Produkte?',
    options: [
      { label: 'Verträgt fast alles ohne Probleme',          value: 'Normal',    facts: facts(['sensitivity', 'tolerant']) },
      { label: 'Wird schnell fettiger oder glänzender',      value: 'Oily',      facts: facts(['product_reaction', 'too_greasy'], ['skin_state', 'oily'], ['skin_state', 'shine']) },
      { label: 'Rötungen, Brennen oder Reizung',             value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness'], ['product_reaction', 'burning']) },
      { label: 'Spannt oder trocknet weiter aus',            value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['product_reaction', 'drying']) },
    ],
  },
  {
    id: 3,
    question: 'Wie fühlst du dich nach der Gesichtsreinigung?',
    options: [
      { label: 'Sauber und angenehm frisch',                 value: 'Normal',    facts: facts(['skin_state', 'balanced']) },
      { label: 'Noch leicht fettig',                         value: 'Oily',      facts: facts(['skin_state', 'oily']) },
      { label: 'Sehr trocken und gespannt',                  value: 'Dry',       facts: facts(['skin_state', 'dryness'], ['skin_state', 'tightness'], ['product_reaction', 'drying']) },
      { label: 'Empfindlich oder leicht gereizt',            value: 'Sensitive', facts: facts(['sensitivity', 'sensitive'], ['concern', 'redness']) },
    ],
  },
  {
    id: 4,
    question: 'Wie oft siehst du vergrößerte Poren?',
    options: [
      { label: 'Selten bis nie',                             value: 'Normal',      facts: facts(['skin_state', 'refined_pores']) },
      { label: 'Oft, besonders in Stirn und Nase',           value: 'Oily',        facts: facts(['concern', 'pores'], ['skin_state', 'oily_t_zone']) },
      { label: 'Nur in bestimmten Bereichen',                value: 'Combination', facts: facts(['concern', 'pores'], ['skin_state', 'oily_t_zone']) },
      { label: 'Kaum — aber Haut wirkt matt',                value: 'Dry',         facts: facts(['skin_state', 'matte'], ['skin_state', 'dryness']) },
    ],
  },
]

const skinTypeInfo: Record<string, { label: string; desc: string; descMale: string; shopFilter: string }> = {
  Normal:      {
    label: 'Normale Haut',
    desc: 'Deine Haut ist ausgeglichen — weder zu fettig noch zu trocken. Du brauchst leichte Pflege, die deinen natürlichen Zustand erhält.',
    descMale: 'Deine Haut ist im Gleichgewicht — du brauchst eine einfache Routine die diesen Zustand erhält. Leichte Feuchtigkeitspflege und Sonnenschutz reichen.',
    shopFilter: 'Normal',
  },
  Oily:        {
    label: 'Fettige Haut',
    desc: 'Deine Haut produziert viel Sebum. Leichte, porenreinigende Produkte helfen dir, Glanz zu kontrollieren ohne die Haut auszutrocknen.',
    descMale: 'Deine Haut produziert viel Talg — besonders nach dem Rasieren. Ölfreie, matterende Produkte und ein guter Reiniger helfen dir den Glanz zu kontrollieren.',
    shopFilter: 'Oily',
  },
  Dry:         {
    label: 'Trockene Haut',
    desc: 'Deine Haut braucht intensive Feuchtigkeit. Reichhaltige Cremes und Hyaluron-Seren sind deine besten Freunde.',
    descMale: 'Deine Haut verliert schnell Feuchtigkeit — vor allem nach dem Rasieren. Reichhaltige Feuchtigkeitscremes und Aftershave-Balsam sind ideal.',
    shopFilter: 'Dry',
  },
  Sensitive:   {
    label: 'Sensible Haut',
    desc: 'Deine Haut reagiert empfindlich. Sanfte, parfümfreie Produkte mit beruhigenden Inhaltsstoffen wie Aloe und Ceramiden sind ideal.',
    descMale: 'Deine Haut reagiert empfindlich — besonders auf Rasieren und neue Produkte. Sanfte, parfümfreie Formulas und beruhigende After-Shave-Produkte sind dein Schlüssel.',
    shopFilter: 'Sensitive',
  },
  Combination: {
    label: 'Mischhaut',
    desc: 'Deine Haut ist gemischt — T-Zone fettig, Wangen eher trocken. Du brauchst Produkte, die beides balancieren.',
    descMale: 'Stirn und Nase sind fettig, die Wangen eher trocken. Balancierendes Gel und leichte Feuchtigkeitspflege helfen dir beide Zonen zu harmonisieren.',
    shopFilter: 'Combination',
  },
}

function getIntroConfig(gender: string | null) {
  if (gender === 'male')    return { emoji: '🧖‍♂️', title: 'Dein Hauttyp als Mann',   sub: '4 Fragen — dein perfekter Skincare-Plan' }
  if (gender === 'female')  return { emoji: '🧖‍♀️', title: 'Dein Hauttyp als Frau',   sub: '4 Fragen — deine perfekte Skincare-Routine' }
  if (gender === 'diverse') return { emoji: '🧖',    title: 'Entdecke deinen Hauttyp', sub: '4 Fragen — deine individuelle Hautpflege' }
  return                           { emoji: '🧖‍♀️', title: 'Schnelles Haut-Quiz',     sub: '4 kurze Fragen — in nur 30 Sekunden' }
}

function getQuestions(gender: string | null) {
  if (gender === 'male')    return questionsMale
  if (gender === 'diverse') return questionsDiverse
  return questionsFemale
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
  const gender               = user?.gender ?? null

  const [step,        setStep]        = useState(0)
  const [answers,     setAnswers]     = useState<Record<number, string>>({})
  const [result,      setResult]      = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const questions   = getQuestions(gender)
  const introConfig = getIntroConfig(gender)
  const totalSteps  = questions.length

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    styleRef.current = el
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current) }
  }, [])

  const currentQ = questions[step - 1]
  const selected = answers[step] ?? null

  function handleSelect(value: string) { setAnswers(prev => ({ ...prev, [step]: value })) }

  async function handleNext() {
    if (!selected) return
    if (step === totalSteps) {
      const skin = getMostFrequent(answers)
      setResult(skin)
      setStep(totalSteps + 1)
      if (user?.token) {
        setSaving(true)
        try {
          const quizAnswers = questions.map(question => {
            const value = answers[question.id]
            const option = question.options.find(item => item.value === value)
            return {
              questionId: question.id,
              question: question.question,
              answer: option?.label || '',
              value,
              facts: option?.facts || [],
            }
          }).filter(item => item.value)
          const res = await fetch(apiUrl('/api/auth/skin-type'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ skinType: skin, source: 'quiz', quizAnswers }),
          })
          const data = await res.json()
          if (data.user) updateUser({ ...user, ...data.user, token: user.token })
        } catch (err) { console.warn('Hauttyp konnte nicht gespeichert werden:', err) }
        finally { setSaving(false) }
      }
    } else {
      setStep(step + 1)
    }
  }

  function handleBack() { if (step === 1) setStep(0); else setStep(step - 1) }
  function resetQuiz()  { setStep(0); setAnswers({}); setResult(null) }
  function openConfirm() { setShowConfirm(true) }
  function confirmExit() { setShowConfirm(false); navigate('/') }

  const skinResult = result ? skinTypeInfo[result] : null
  const resultDesc = skinResult ? (gender === 'male' ? skinResult.descMale : skinResult.desc) : ''

  return (
    <div className="quiz-root" style={{ minHeight: '100vh', background: '#FDFAF6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px, 10vw, 80px) clamp(16px, 4vw, 20px)', position: 'relative' }}>

      {showConfirm && (
        <div className="confirm-overlay" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 'clamp(24px, 6vw, 36px) clamp(20px, 5vw, 32px)', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', fontFamily: "'Outfit', sans-serif" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1c1209', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Quiz aufhören?</h3>
            <p style={{ fontSize: 14, color: '#9a7a5a', margin: '0 0 28px', lineHeight: 1.6, fontWeight: 300 }}>Dein Fortschritt geht verloren. Möchtest du das Quiz wirklich beenden?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, border: '1.5px solid #e0c9a8', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#7a5c42', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Nein, weiter
              </button>
              <button onClick={confirmExit}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, background: '#D4A574', border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#c4925a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#D4A574')}>
                Ja, beenden
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 560 }}>

        {step < totalSteps + 1 && (
          <button onClick={openConfirm}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#b8967a', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif", padding: '0 0 24px 0' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D4A574')}
            onMouseLeave={e => (e.currentTarget.style.color = '#b8967a')}>
            <ArrowLeft size={15} /> Verlassen
          </button>
        )}

        {/* ── INTRO ── */}
        {step === 0 && (
          <div className="quiz-slide" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(40px, 10vw, 52px)', marginBottom: 16 }}>{introConfig.emoji}</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, color: '#1c1209', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              {introConfig.title}
            </h1>
            <p style={{ fontSize: 15, color: '#9a7a5a', lineHeight: 1.7, margin: '0 0 8px', fontWeight: 300 }}>{introConfig.sub}</p>
            <p style={{ fontSize: 14, color: '#c4a882', margin: '0 0 40px', fontWeight: 300 }}>
              Wir ermitteln deinen Hauttyp und empfehlen die passenden Produkte.
            </p>
            <button onClick={() => setStep(1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#D4A574', color: '#fff', padding: 'clamp(13px, 3vw, 15px) clamp(24px, 6vw, 36px)', borderRadius: 100, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
              Quiz starten <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {step >= 1 && step <= totalSteps && currentQ && (
          <div className="quiz-slide" key={step}>
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4925A', margin: '0 0 10px', fontWeight: 600 }}>
                Frage {step} von {totalSteps}
              </p>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#1c1209', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {currentQ.question}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {currentQ.options.map((opt) => (
                <button key={opt.value} onClick={() => handleSelect(opt.value)}
                  className={`quiz-option ${selected === opt.value ? 'selected' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(14px, 3vw, 16px) clamp(16px, 4vw, 20px)', borderRadius: 14, background: '#fff', textAlign: 'left', fontFamily: "'Outfit', sans-serif", fontSize: '(14px, 2.5vw, 15px)', fontWeight: 500, color: '#1c1209' }}>
                  <span>{opt.label}</span>
                  {selected === opt.value && <CheckCircle size={18} color="#D4A574" style={{ flexShrink: 0, marginLeft: 12 }}/>}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleBack}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'clamp(12px, 3vw, 13px) clamp(14px, 3vw, 20px)', borderRadius: 100, background: 'transparent', border: '1.5px solid #e8c9a0', color: '#9a7a5a', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
                <ArrowLeft size={15} /> <span className="hide-on-tiny">Zurück</span> 
              </button>
              <button onClick={handleNext} disabled={!selected}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 'clamp(12px, 3vw, 13px) clamp(16px, 4vw, 24px)', borderRadius: 100, background: selected ? '#D4A574' : '#e8c9a0', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: selected ? 'pointer' : 'not-allowed', fontFamily: "'Outfit', sans-serif", transition: 'background 0.2s' }}>
                {step === totalSteps ? 'Ergebnis anzeigen' : 'Weiter'} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === totalSteps + 1 && skinResult && (
          <div className="quiz-slide" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 8, fontWeight: 600 }}>Dein Hauttyp</p>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, color: '#1c1209', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              {skinResult.label}
            </h2>
            <p style={{ fontSize: 15, color: '#7a5c42', lineHeight: 1.75, margin: '0 auto 16px', maxWidth: 420, fontWeight: 300 }}>
              {resultDesc}
            </p>
            {user && saving && <p style={{ fontSize: 13, color: '#b8967a', marginBottom: 32, fontWeight: 500 }}>⏳ Wird gespeichert…</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => navigate(`/shop?skinType=${encodeURIComponent(skinResult.shopFilter)}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 'clamp(13px, 3vw, 15px) clamp(20px, 5vw, 28px)', borderRadius: 100, background: '#D4A574', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                Passende Produkte entdecken <ArrowRight size={15} />
              </button>
              <button onClick={() => navigate('/')}
                style={{ padding: 'clamp(12px, 3vw, 13px) clamp(20px, 5vw, 28px)', borderRadius: 100, background: 'transparent', border: '1.5px solid #e8c9a0', color: '#9a7a5a', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                Zur Startseite
              </button>
              <button onClick={resetQuiz}
                style={{ fontSize: 13, color: '#c4a882', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", textDecoration: 'underline' }}>
                Quiz wiederholen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
