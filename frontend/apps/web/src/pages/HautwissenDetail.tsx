import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import acne from '@/images/acne.png'
import acnescars from '@/images/acnescars.png'
import blackheads from '@/images/blackheads.png'
import dryskin from '@/images/dryskin.png'
import oily from '@/images/oily.png'
import redness from '@/images/redness.png'
import hyperpigmentation from '@/images/hyperpigmentation.png'
import darkcircles from '@/images/darkcircle.png'
import poren from '@/images/poren.png'
import sensibleskin from '@/images/sensibleskin.png'
import stressbreakouts from '@/images/stressbreakout.png'
import rasierpickel from '@/images/rasierpickel.png'

const hautProbleme = [
  {
    slug: 'acne',
    title: 'Akne',
    image: acne,
    intro:
      'Akne zeigt sich häufig durch Pickel, entzündete Stellen und verstopfte Poren.',
    symptoms: ['Pickel', 'Entzündungen', 'Verstopfte Poren', 'Ölige Haut'],
    causes: [
      'Überschüssige Talgproduktion',
      'Verstopfte Poren durch abgestorbene Hautzellen',
      'Hormonelle Veränderungen',
      'Bakterien und Entzündungen',
    ],
    tips: [
      'Reinige dein Gesicht mild und nicht zu aggressiv.',
      'Drücke Pickel nicht aus.',
      'Nutze leichte, nicht-komedogene Pflegeprodukte.',
      'Achte auf täglichen Sonnenschutz.',
    ],
    ingredients: [
      { name: 'Salicylsäure', text: 'Hilft gegen verstopfte Poren.' },
      { name: 'Niacinamid', text: 'Beruhigt die Haut und stärkt die Hautbarriere.' },
      { name: 'Azelainsäure', text: 'Kann Rötungen und Pickelmale mildern.' },
      { name: 'Benzoylperoxid', text: 'Wirkt gegen Akne-Bakterien.' },
    ],
  },
  {
    slug: 'blackheads',
    title: 'Mitesser',
    image: blackheads,
    intro:
      'Mitesser sind kleine verstopfte Poren, die besonders auf Nase, Stirn und Kinn sichtbar werden.',
    symptoms: ['Schwarze Punkte', 'Verstopfte Poren', 'Ölige T-Zone', 'Unreine Haut'],
    causes: [
      'Talg sammelt sich in den Poren',
      'Abgestorbene Hautzellen verstopfen die Hautoberfläche',
      'Ölige Haut begünstigt Mitesser',
      'Zu reichhaltige Pflegeprodukte',
    ],
    tips: [
      'Verwende eine milde Reinigung.',
      'Nutze gelegentlich ein sanftes BHA-Peeling.',
      'Vermeide stark fettende Produkte.',
      'Drücke Mitesser nicht grob aus.',
    ],
    ingredients: [
      { name: 'Salicylsäure', text: 'Dringt in die Poren ein und löst Verstopfungen.' },
      { name: 'Niacinamid', text: 'Kann die Talgproduktion ausgleichen.' },
      { name: 'Tonerde', text: 'Nimmt überschüssigen Talg auf.' },
      { name: 'Retinol', text: 'Unterstützt die Hauterneuerung.' },
    ],
  },
  {
    slug: 'dry-skin',
    title: 'Trockene Haut',
    image: dryskin,
    intro:
      'Trockene Haut fühlt sich oft gespannt, rau oder schuppig an und braucht besonders viel Feuchtigkeit und Schutz.',
    symptoms: ['Spannungsgefühl', 'Schuppige Haut', 'Raue Stellen', 'Juckreiz'],
    causes: [
      'Geschwächte Hautbarriere',
      'Kälte, Heizungsluft oder häufiges Waschen',
      'Zu aggressive Reinigungsprodukte',
      'Zu wenig Feuchtigkeit in der Pflege',
    ],
    tips: [
      'Nutze eine milde Reinigung.',
      'Trage regelmäßig Feuchtigkeitspflege auf.',
      'Vermeide sehr heißes Wasser im Gesicht.',
      'Stärke deine Hautbarriere mit beruhigenden Produkten.',
    ],
    ingredients: [
      { name: 'Hyaluronsäure', text: 'Bindet Feuchtigkeit in der Haut.' },
      { name: 'Glycerin', text: 'Spendet Feuchtigkeit und schützt vor Austrocknung.' },
      { name: 'Ceramide', text: 'Stärken die natürliche Hautbarriere.' },
      { name: 'Panthenol', text: 'Beruhigt trockene und gereizte Haut.' },
    ],
  },
  {
    slug: 'oily-skin',
    title: 'Fettige Haut',
    image: oily,
    intro:
      'Fettige Haut glänzt schnell und produziert mehr Talg als normale Haut. Trotzdem braucht sie Feuchtigkeit.',
    symptoms: ['Glanz', 'Ölige T-Zone', 'Vergrößerte Poren', 'Unreinheiten'],
    causes: [
      'Erhöhte Talgproduktion',
      'Genetische Veranlagung',
      'Hormonelle Schwankungen',
      'Zu aggressive Reinigung',
    ],
    tips: [
      'Verwende leichte, ölfreie Pflegeprodukte.',
      'Reinige dein Gesicht sanft, aber regelmäßig.',
      'Vermeide schwere Cremes.',
      'Nutze mattierende Produkte, ohne die Haut auszutrocknen.',
    ],
    ingredients: [
      { name: 'Niacinamid', text: 'Kann Glanz reduzieren und die Haut beruhigen.' },
      { name: 'Salicylsäure', text: 'Hilft gegen verstopfte Poren.' },
      { name: 'Zink', text: 'Kann überschüssigen Talg regulieren.' },
      { name: 'Grüner Tee', text: 'Wirkt beruhigend und antioxidativ.' },
    ],
  },
  {
    slug: 'redness',
    title: 'Rötungen',
    image: redness,
    intro:
      'Rötungen können durch empfindliche Haut, Reizungen oder äußere Einflüsse entstehen.',
    symptoms: ['Brennen', 'Wärmegefühl', 'Empfindlichkeit', 'Sichtbare Rötung'],
    causes: [
      'Empfindliche oder gereizte Haut',
      'Hitze, Kälte oder Sonne',
      'Zu starke Pflegeprodukte',
      'Stress oder bestimmte Lebensmittel',
    ],
    tips: [
      'Verwende reizfreie und beruhigende Pflege.',
      'Vermeide Duftstoffe und aggressive Peelings.',
      'Nutze täglich Sonnenschutz.',
      'Beobachte, welche Auslöser deine Haut stärker röten.',
    ],
    ingredients: [
      { name: 'Panthenol', text: 'Beruhigt gereizte Haut und unterstützt die Hautbarriere.' },
      { name: 'Centella Asiatica', text: 'Hilft bei empfindlicher Haut und wirkt beruhigend.' },
      { name: 'Aloe Vera', text: 'Spendet Feuchtigkeit und kühlt die Haut angenehm.' },
      { name: 'Niacinamid', text: 'Kann Rötungen mildern und die Haut stärken.' },
    ],
  },
  {
    slug: 'hyperpigmentation',
    title: 'Hyperpigmentierung',
    image: hyperpigmentation,
    intro:
      'Hyperpigmentierung zeigt sich durch dunkle Flecken oder einen ungleichmäßigen Hautton.',
    symptoms: ['Dunkle Flecken', 'Pickelmale', 'Ungleichmäßiger Hautton', 'Pigmentflecken'],
    causes: [
      'Sonneneinstrahlung',
      'Pickelmale nach Entzündungen',
      'Hormonelle Veränderungen',
      'Ungleichmäßige Melaninproduktion',
    ],
    tips: [
      'Nutze jeden Tag Sonnenschutz.',
      'Vermeide es, Pickel aufzukratzen.',
      'Verwende aufhellende Wirkstoffe regelmäßig.',
      'Sei geduldig, da Flecken Zeit brauchen.',
    ],
    ingredients: [
      { name: 'Vitamin C', text: 'Kann den Hautton ebenmäßiger wirken lassen.' },
      { name: 'Niacinamid', text: 'Hilft bei einem ausgeglicheneren Hautbild.' },
      { name: 'Azelainsäure', text: 'Kann dunkle Flecken und Rötungen mildern.' },
      { name: 'Alpha-Arbutin', text: 'Wird häufig gegen Pigmentflecken eingesetzt.' },
    ],
  },
  {
    slug: 'dark-circles',
    title: 'Augenringe',
    image: darkcircles,
    intro:
      'Augenringe lassen die Augenpartie müde wirken und können verschiedene Ursachen haben.',
    symptoms: ['Dunkle Schatten', 'Müder Blick', 'Trockene Augenpartie', 'Leichte Schwellung'],
    causes: [
      'Schlafmangel',
      'Genetische Veranlagung',
      'Dünne Haut unter den Augen',
      'Flüssigkeitsmangel oder Stress',
    ],
    tips: [
      'Achte auf ausreichend Schlaf.',
      'Pflege die Augenpartie mit Feuchtigkeit.',
      'Kühlende Augenpads können kurzfristig helfen.',
      'Trage Sonnenschutz vorsichtig um die Augenpartie auf.',
    ],
    ingredients: [
      { name: 'Koffein', text: 'Kann Schwellungen optisch reduzieren.' },
      { name: 'Hyaluronsäure', text: 'Spendet Feuchtigkeit und polstert optisch auf.' },
      { name: 'Peptide', text: 'Unterstützen ein glatteres Hautbild.' },
      { name: 'Vitamin C', text: 'Kann die Augenpartie frischer wirken lassen.' },
    ],
  },
  {
    slug: 'large-pores',
    title: 'Große Poren',
    image: poren,
    intro:
      'Große Poren entstehen oft durch Talg, Hautstruktur und verstopfte Poren. Ganz verschwinden können Poren nicht, aber sie können feiner wirken.',
    symptoms: ['Sichtbare Poren', 'Unebene Haut', 'Ölige Stellen', 'Verstopfte Poren'],
    causes: [
      'Erhöhte Talgproduktion',
      'Verstopfte Poren',
      'Genetische Veranlagung',
      'Nachlassende Hautelastizität',
    ],
    tips: [
      'Reinige die Haut regelmäßig und mild.',
      'Nutze BHA gegen verstopfte Poren.',
      'Vermeide schwere, komedogene Produkte.',
      'Achte auf Sonnenschutz.',
    ],
    ingredients: [
      { name: 'Niacinamid', text: 'Kann Poren optisch feiner wirken lassen.' },
      { name: 'Salicylsäure', text: 'Hilft, Poren von innen zu reinigen.' },
      { name: 'Retinol', text: 'Unterstützt die Hauterneuerung.' },
      { name: 'Tonerde', text: 'Nimmt überschüssigen Talg auf.' },
    ],
  },
  {
    slug: 'sensitive-skin',
    title: 'Empfindliche Haut',
    image: sensibleskin,
    intro:
      'Empfindliche Haut reagiert schnell mit Brennen, Jucken, Trockenheit oder leichter Rötung.',
    symptoms: ['Brennen', 'Juckreiz', 'Trockenheit', 'Schnelle Reizung'],
    causes: [
      'Geschwächte Hautbarriere',
      'Duftstoffe oder reizende Inhaltsstoffe',
      'Wetterwechsel',
      'Zu viele Produkte gleichzeitig',
    ],
    tips: [
      'Halte deine Routine einfach und mild.',
      'Vermeide Duftstoffe und Alkohol.',
      'Teste neue Produkte zuerst vorsichtig.',
      'Nutze beruhigende und barrierestärkende Pflege.',
    ],
    ingredients: [
      { name: 'Ceramide', text: 'Stärken die Hautbarriere.' },
      { name: 'Panthenol', text: 'Beruhigt empfindliche Haut.' },
      { name: 'Aloe Vera', text: 'Spendet Feuchtigkeit und kühlt.' },
      { name: 'Centella Asiatica', text: 'Wirkt beruhigend bei gereizter Haut.' },
    ],
  },
  {
    slug: 'acne-scars',
    title: 'Pickelmale',
    image: acnescars,
    intro:
      'Pickelmale bleiben oft nach Entzündungen zurück und können als dunkle oder rötliche Flecken sichtbar sein.',
    symptoms: ['Rötliche Flecken', 'Dunkle Flecken', 'Unebener Hautton', 'Spuren nach Pickeln'],
    causes: [
      'Entzündete Pickel',
      'Ausdrücken oder Aufkratzen',
      'Sonneneinstrahlung kann Flecken verstärken',
      'Langsame Hauterneuerung',
    ],
    tips: [
      'Verwende täglich Sonnenschutz.',
      'Drücke Pickel nicht aus.',
      'Nutze Wirkstoffe zur Hauterneuerung.',
      'Sei geduldig, Pickelmale brauchen Zeit.',
    ],
    ingredients: [
      { name: 'Niacinamid', text: 'Kann Flecken und Rötungen mildern.' },
      { name: 'Vitamin C', text: 'Unterstützt einen ebenmäßigeren Hautton.' },
      { name: 'Azelainsäure', text: 'Hilft bei Rötungen und Pickelmalen.' },
      { name: 'Retinol', text: 'Fördert die Hauterneuerung.' },
    ],
  },
  {
    slug: 'stress-breakouts',
    title: 'Stressbedingte Unreinheiten',
    image: stressbreakouts,
    intro:
      'Stress kann sich auch auf die Haut auswirken und Unreinheiten verstärken.',
    symptoms: ['Plötzliche Pickel', 'Unruhige Haut', 'Rötungen', 'Mehr Talg'],
    causes: [
      'Stresshormone beeinflussen die Talgproduktion',
      'Weniger Schlaf in stressigen Phasen',
      'Unregelmäßige Pflegeroutine',
      'Häufiges Berühren des Gesichts',
    ],
    tips: [
      'Halte deine Pflegeroutine einfach.',
      'Achte auf Schlaf und Erholung.',
      'Berühre dein Gesicht möglichst wenig.',
      'Nutze beruhigende Pflege.',
    ],
    ingredients: [
      { name: 'Niacinamid', text: 'Beruhigt die Haut und stärkt die Barriere.' },
      { name: 'Salicylsäure', text: 'Hilft gegen verstopfte Poren.' },
      { name: 'Panthenol', text: 'Beruhigt gereizte Haut.' },
      { name: 'Grüner Tee', text: 'Wirkt beruhigend und antioxidativ.' },
    ],
  },
  {
    slug: 'razor-bumps',
    title: 'Rasierpickel',
    image: rasierpickel,
    intro:
      'Rasierpickel entstehen häufig nach der Rasur und zeigen sich als kleine rote Punkte, Reizungen oder eingewachsene Haare.',
    symptoms: ['Rote Punkte', 'Eingewachsene Haare', 'Juckreiz', 'Reizung nach Rasur'],
    causes: [
      'Reizung durch Rasur',
      'Eingewachsene Haare',
      'Stumpfe Rasierklingen',
      'Zu wenig Pflege nach der Rasur',
    ],
    tips: [
      'Rasiere mit einer sauberen und scharfen Klinge.',
      'Rasiere möglichst in Haarwuchsrichtung.',
      'Beruhige die Haut nach der Rasur.',
      'Vermeide direkt nach der Rasur reizende Produkte.',
    ],
    ingredients: [
      { name: 'Aloe Vera', text: 'Kühlt und beruhigt gereizte Haut.' },
      { name: 'Panthenol', text: 'Unterstützt die Hautbarriere.' },
      { name: 'Salicylsäure', text: 'Kann eingewachsenen Haaren vorbeugen.' },
      { name: 'Centella Asiatica', text: 'Beruhigt empfindliche und gereizte Haut.' },
    ],
  },
]

export default function HautwissenDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()

   useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  const problem = hautProbleme.find((item) => item.slug === slug)

  if (!problem) {
    return (
      <main className="min-h-screen bg-[#FFF9F5] px-4 pt-24 sm:px-6 sm:pt-32 !font-sans">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-sm !font-sans">
          <h1 className="text-3xl font-bold text-[#2a1c10] !font-sans">
            Hautproblem nicht gefunden
          </h1>

          <Link
            to="/hautwissen"
            className="mt-6 inline-block font-semibold text-[#D4A574] !font-sans"
          >
            Zurück zu Hautwissen
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 pt-24 pb-12 sm:px-6 sm:pt-28 sm:pb-16 !font-sans">
      <article className="mx-auto max-w-6xl !font-sans">
        <Link
          to="/hautwissen"
          className="mb-6 inline-block font-semibold text-[#D4A574] !font-sans"
        >
          ← Zurück zu Hautwissen
        </Link>

        <section className="grid overflow-hidden rounded-[36px] bg-white shadow-lg md:grid-cols-2 !font-sans">
          <div className="h-[220px] sm:h-[320px] md:h-auto !font-sans">
            <img
              src={problem.image}
              alt={problem.title}
              className="h-full w-full object-cover !font-sans"
            />
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-8 md:p-12 !font-sans">
            <span className="mb-4 w-fit rounded-full bg-[#FDECEC] px-4 py-2 text-sm font-semibold text-[#b76b5f] !font-sans">
              Hautwissen
            </span>

            <h1 className="text-3xl font-bold text-[#2a1c10] sm:text-4xl md:text-5xl !font-sans">
              {problem.title}
            </h1>

            <p className="mt-5 text-lg leading-7 text-gray-600 sm:leading-8 !font-sans">
              {problem.intro}
            </p>

            {/* <button
              onClick={() => navigate('/chatbot')}
              className="mt-8 w-fit rounded-full bg-[#D4A574] px-7 py-3 font-semibold text-white transition hover:bg-[#c4945f]"
            >
              KI-Beratung starten
            </button> */}
          </div>
        </section>

        {/* <section className="mt-8 rounded-[32px] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#2a1c10] !font-sans">
            Typische Symptome
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {problem.symptoms.map((symptom) => (
              <div
                key={symptom}
                className="rounded-2xl bg-[#FFF9F5] p-5 text-center font-semibold text-[#8a5f36]"
              >
                {symptom}
              </div>
            ))}
          </div>
        </section> */}

        <section className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-2 !font-sans">
          <div className="rounded-[32px] bg-white p-6 sm:p-8 shadow-sm !font-sans">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2a1c10] !font-sans">
              Warum entsteht das?
            </h2>

            <div className="mt-5 grid gap-4 !font-sans">
              {problem.causes.map((cause) => (
                <div
                  key={cause}
                  className="rounded-2xl border border-[#F0E0CC] bg-[#FFF9F5] p-4 text-gray-600"
                >
                  <span className="mr-2 text-[#D4A574]">●</span>
                  {cause}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-8 shadow-sm !font-sans">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2a1c10] !font-sans">
              Was kann helfen?
            </h2>

            <div className="mt-5 grid gap-4 !font-sans">
              {problem.tips.map((tip) => (
                <div
                  key={tip}
                  className="rounded-2xl border border-[#F0E0CC] bg-[#FFF9F5] p-4 text-gray-600 !font-sans"
                >
                  <span className="mr-2 font-bold text-[#D4A574]">✓</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] bg-white p-6 sm:p-8 shadow-sm !font-sans">
          <h2 className="text-xl sm:text-2xl font-bold text-[#2a1c10] !font-sans">
            Geeignete Inhaltsstoffe
          </h2>

          <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2 !font-sans">
            {problem.ingredients.map((ingredient) => (
              <div
                key={ingredient.name}
                className="rounded-3xl bg-[#FFF9F5] p-5 sm:p-6 !font-sans"
              >
                <h3 className="text-lg sm:text-xl font-bold text-[#2a1c10] !font-sans">
                  {ingredient.name}
                </h3>
                <p className="mt-3 leading-7 text-gray-600 !font-sans">
                  {ingredient.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[36px] bg-[#2a1c10] p-6 text-white sm:p-8 md:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl !font-sans">
            Du bist dir unsicher, was zu deiner Haut passt?
          </h2>

          <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base !font-sans">
            Starte die KI-Beratung und erhalte passendere Empfehlungen für deine Hautpflege.
          </p>

   <button
  onClick={() =>
    navigate('/chatbot', {
      state: {
        newChat: true,
        problemTitle: problem.title,
        problemIntro: problem.intro,
        problemImage: problem.image,
      },
    })
  }
  className="mt-7 w-full rounded-full bg-[#D4A574] px-8 py-3 text-center font-semibold text-white transition hover:bg-[#c4945f] sm:w-auto !font-sans"
>
  KI-Beratung starten
</button>
        </section>

        <p className="mt-8 text-sm text-gray-500 !font-sans">
          Hinweis: Diese Informationen ersetzen keine ärztliche Beratung.
        </p>
      </article>
    </main>
  )
}