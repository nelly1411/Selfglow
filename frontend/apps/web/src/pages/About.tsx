import { Heart, Leaf, Award, Users, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import product from '@/images/produkt.jpg'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .about-root * { font-family: 'Outfit', sans-serif; }

  .value-card {
    transition: all 0.25s ease;
  }
  .value-card:hover {
    background: #D4A574 !important;
    border-color: #D4A574 !important;
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(212,165,116,0.25);
  }
  .value-card:hover .val-icon-bg { background: rgba(255,255,255,0.2) !important; }
  .value-card:hover .val-icon { color: #fff !important; }
  .value-card:hover .val-title { color: #fff !important; }
  .value-card:hover .val-desc  { color: rgba(255,255,255,0.85) !important; }

  .team-avatar {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    cursor: default;
  }
  .team-avatar:hover {
    transform: translateY(-8px) scale(1.05);
  }
`

const values = [
  { icon: Heart,  title: 'Mit Liebe gemacht',       desc: 'Jedes Produkt wird mit größter Sorgfalt und Leidenschaft für Hautpflege entwickelt.' },
  { icon: Leaf,   title: 'Natürliche Inhaltsstoffe', desc: 'Wir verwenden nur die besten natürlichen und nachhaltigen Inhaltsstoffe.' },
  { icon: Award,  title: 'Qualitätsgarantie',        desc: 'Alle unsere Produkte werden strengen Qualitätskontrollen unterzogen.' },
  { icon: Users,  title: 'Kundenorientiert',         desc: 'Ihre Zufriedenheit steht bei uns an erster Stelle. Immer.' },
]

const team = [
  { name: 'Alaa Hejazi',    role: 'Skincare Specialist',   initial: 'AH', color: '#D4A574' },
  { name: 'Bayan Agha',      role: 'Backend Developer', initial: 'BA', color: '#B8967A' },
   { name: 'Nelly Nzumegue',  role: 'Marketing Manager',      initial: 'NN', color: '#C4925A' },
  { name: 'Nurefsan Almas',  role: 'Product Designer',  initial: 'NA', color: '#B8967A' },
  { name: 'Sevde Istanbul',  role: 'Frontend Developer',    initial: 'SI', color: '#C4925A' },
  { name: 'Yichen Zhong',    role: 'AI Engineer',          initial: 'YZ', color: '#D4A574' },
]

export default function About() {
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    styleRef.current = el
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current) }
  }, [])

  return (
    <div className="about-root overflow-hidden" style={{ background: '#FDFAF6' }}>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ background: '#1c1209', paddingTop: 130, paddingBottom: 96, paddingLeft: 28, paddingRight: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,165,116,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A574', fontWeight: 600, marginBottom: 20 }}>
            Über uns
          </p>
          <h1 style={{ fontSize: 'clamp(38px,6vw,72px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 24px' }}>
            Über <span style={{ color: '#D4A574' }}>SelfGlow</span>
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, maxWidth: 620, margin: '0 auto', fontWeight: 300 }}>
            Wir glauben, dass jeder eine Hautpflege verdient, die perfekt zu ihm passt.
            Mit modernster KI-Technologie und hochwertigen Produkten helfen wir Ihnen,
            Ihre strahlendste Haut zu entdecken.
          </p>
        </div>
      </section>

      {/* ── STORY ───────────────────────────────────────────────── */}
      <section style={{ padding: '96px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 12, fontWeight: 600 }}>
              Unsere Geschichte
            </p>
            <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, margin: '0 0 24px', letterSpacing: '-0.02em', lineHeight: 1.2, color: '#1c1209' }}>
              Von Dermatologinnen,<br />für alle.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'SelfGlow wurde 2026 von Fr. Istanbul, Fr. Hejazi, Fr. Almas, Fr. Zhong, Fr. Nzumegue, und Fr. Agha gegründet, leidenschaftliche Dermatologinnen mit über 15 Jahren Erfahrung. Frustriert von der Einheitslösung der meisten Hautpflegemarken, machte sie es sich zur Mission, personalisierte Hautpflege für jeden zugänglich zu machen.',
                'Mit Hilfe modernster KI-Technologie analysieren wir Ihren Hauttyp und Ihre spezifischen Bedürfnisse, um Ihnen die perfekten Produkte zu empfehlen. Keine Ratespiele mehr – nur Ergebnisse.',
                'Heute ist SelfGlow eine der führenden Marken für personalisierte Hautpflege in Deutschland, mit über 100.000 zufriedenen Kunden und einer wachsenden Community von Hautpflege-Enthusiasten.',
              ].map((text, i) => (
                <p key={i} style={{ fontSize: 15, color: '#7a5c42', lineHeight: 1.85, margin: 0, fontWeight: 300 }}>{text}</p>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
  <div
    style={{
      position: 'absolute',
      inset: -16,
      background: '#F5E6D3',
      borderRadius: 28,
      zIndex: 0,
    }}
  />

  <img
    src={product}
    alt="SelfGlow Produkt"
    style={{
      position: 'relative',
      zIndex: 1,
      width: '100%',
      borderRadius: 24,
      objectFit: 'cover',
      display: 'block',
      boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
    }}
  />
</div>
        </div>
      </section>

      {/* ── VALUES ──────────────────────────────────────────────── */}
      <section style={{ padding: '96px 28px', background: '#FDFAF6' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 10, fontWeight: 600 }}>
              Was uns antreibt
            </p>
            <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#1c1209' }}>
              Unsere Werte
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {values.map((v) => (
              <div
                key={v.title}
                className="value-card"
                style={{ background: '#fff', border: '1px solid #F0DCC8', borderRadius: 22, padding: '32px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}
              >
                <div className="val-icon-bg" style={{ width: 54, height: 54, borderRadius: '50%', background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <v.icon className="val-icon" size={22} color="#D4A574" strokeWidth={1.5} />
                </div>
                <h3 className="val-title" style={{ fontWeight: 700, fontSize: 15, margin: 0, color: '#1c1209' }}>{v.title}</h3>
                <p className="val-desc" style={{ fontSize: 13, color: '#9a7a5a', margin: 0, lineHeight: 1.65, fontWeight: 300 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4925A', marginBottom: 10, fontWeight: 600 }}>
              Die Menschen hinter SelfGlow
            </p>
            <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.02em', color: '#1c1209' }}>
              Unser Team
            </h2>
            <p style={{ fontSize: 15, color: '#9a7a5a', maxWidth: 500, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>
              Leidenschaftlich, engagiert und immer auf der Suche nach den besten Lösungen für Ihre Haut.
            </p>
          </div>

          {/* 6 circles in one row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
            {team.map((member) => (
              <div
                key={member.name}
                className="team-avatar"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
              >
                {/* Circle */}
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${member.color}, ${member.color}bb)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 32px ${member.color}45`,
                  border: '4px solid #fff',
                  outline: `3px solid ${member.color}25`,
                }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    {member.initial}
                  </span>
                </div>

                {/* Name & role */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 3px', color: '#1c1209' }}>
                    {member.name}
                  </p>
                  <p style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#D4A574', margin: 0, fontWeight: 600 }}>
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 28px', background: '#F5E6D3' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 700, color: '#1c1209', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            Bereit für Ihre perfekte Hautpflege?
          </h2>
          <p style={{ fontSize: 15, color: '#7a5c42', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7, fontWeight: 300 }}>
            Entdecken Sie unsere Produkte und finden Sie heraus, was Ihre Haut wirklich braucht.
          </p>
          <Link
            to="/shop"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#D4A574', color: '#fff', padding: '14px 32px', borderRadius: 100, fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', transition: 'background 0.2s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#c4925a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#D4A574')}
          >
            Jetzt entdecken <ArrowRight size={15} />
          </Link>
        </div>
      </section>

    </div>
  )
}