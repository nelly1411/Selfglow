import { Link, useNavigate, useParams } from 'react-router-dom'

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
      'Akne zeigt sich häufig durch Pickel, entzündete Stellen und verstopfte Poren. Sie kann in verschiedenen Altersgruppen auftreten.',
    causes: [
      'Überschüssige Talgproduktion',
      'Verstopfte Poren durch abgestorbene Hautzellen',
      'Hormonelle Veränderungen',
      'Bakterien und Entzündungen',
      'Stress oder ungeeignete Pflegeprodukte',
    ],
    tips: [
      'Reinige dein Gesicht mild und nicht zu aggressiv.',
      'Drücke Pickel nicht aus, damit keine Narben entstehen.',
      'Nutze leichte, nicht-komedogene Pflegeprodukte.',
      'Achte auf regelmäßigen Sonnenschutz.',
      'Bei starker Akne sollte man ärztlichen Rat einholen.',
    ],
    ingredients: ['Salicylsäure', 'Niacinamid', 'Azelainsäure', 'Benzoylperoxid'],
  },
  {
    slug: 'blackheads',
    title: 'Mitesser',
    image: blackheads,
    intro:
      'Mitesser sind kleine verstopfte Poren, die oft auf Nase, Stirn oder Kinn sichtbar werden.',
    causes: [
      'Talg sammelt sich in den Poren',
      'Abgestorbene Hautzellen verstopfen die Hautoberfläche',
      'Ölige Haut kann Mitesser begünstigen',
      'Ungeeignete oder zu reichhaltige Produkte',
    ],
    tips: [
      'Verwende eine milde Reinigung.',
      'Nutze gelegentlich ein sanftes BHA-Peeling.',
      'Vermeide stark fettende Produkte.',
      'Drücke Mitesser nicht grob aus.',
    ],
    ingredients: ['Salicylsäure', 'Niacinamid', 'Tonerde', 'Retinol'],
  },
  {
    slug: 'dry-skin',
    title: 'Trockene Haut',
    image: dryskin,
    intro:
      'Trockene Haut fühlt sich oft gespannt, rau oder schuppig an und braucht besonders viel Feuchtigkeit und Schutz.',
    causes: [
      'Geschwächte Hautbarriere',
      'Kälte, Heizungsluft oder häufiges Waschen',
      'Zu aggressive Reinigungsprodukte',
      'Zu wenig Feuchtigkeit in der Pflege',
    ],
    tips: [
      'Nutze eine milde Reinigung ohne starkes Austrocknen.',
      'Trage regelmäßig eine reichhaltige Feuchtigkeitspflege auf.',
      'Vermeide sehr heißes Wasser im Gesicht.',
      'Stärke deine Hautbarriere mit beruhigenden Produkten.',
    ],
    ingredients: ['Hyaluronsäure', 'Glycerin', 'Ceramide', 'Panthenol'],
  },
  {
    slug: 'oily-skin',
    title: 'Fettige Haut',
    image: oily,
    intro:
      'Fettige Haut glänzt schnell und produziert mehr Talg als normale Haut. Trotzdem braucht sie Feuchtigkeit.',
    causes: [
      'Erhöhte Talgproduktion',
      'Genetische Veranlagung',
      'Hormonelle Schwankungen',
      'Zu aggressive Reinigung kann die Haut zusätzlich reizen',
    ],
    tips: [
      'Verwende leichte, ölfreie Pflegeprodukte.',
      'Reinige dein Gesicht sanft, aber regelmäßig.',
      'Vermeide schwere Cremes.',
      'Nutze mattierende Produkte, ohne die Haut auszutrocknen.',
    ],
    ingredients: ['Niacinamid', 'Salicylsäure', 'Zink', 'Grüner Tee'],
  },
  {
    slug: 'redness',
    title: 'Rötungen',
    image: redness,
    intro:
      'Rötungen können durch empfindliche Haut, Reizungen oder äußere Einflüsse entstehen.',
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
    ingredients: ['Panthenol', 'Centella Asiatica', 'Aloe Vera', 'Niacinamid'],
  },
  {
    slug: 'hyperpigmentation',
    title: 'Hyperpigmentierung',
    image: hyperpigmentation,
    intro:
      'Hyperpigmentierung zeigt sich durch dunkle Flecken oder einen ungleichmäßigen Hautton.',
    causes: [
      'Sonneneinstrahlung',
      'Pickelmale nach Entzündungen',
      'Hormonelle Veränderungen',
      'Ungleichmäßige Melaninproduktion',
    ],
    tips: [
      'Nutze jeden Tag Sonnenschutz.',
      'Vermeide es, Pickel aufzukratzen.',
      'Verwende aufhellende Wirkstoffe regelmäßig und geduldig.',
      'Schütze deine Haut besonders im Sommer.',
    ],
    ingredients: ['Vitamin C', 'Niacinamid', 'Azelainsäure', 'Alpha-Arbutin'],
  },
  {
    slug: 'dark-circles',
    title: 'Augenringe',
    image: darkcircles,
    intro:
      'Augenringe lassen die Augenpartie müde wirken und können verschiedene Ursachen haben.',
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
      'Trage Sonnenschutz auch vorsichtig um die Augenpartie auf.',
    ],
    ingredients: ['Koffein', 'Hyaluronsäure', 'Peptide', 'Vitamin C'],
  },
  {
    slug: 'large-pores',
    title: 'Große Poren',
    image: poren,
    intro:
      'Große Poren entstehen oft durch Talg, Hautstruktur und verstopfte Poren. Ganz verschwinden können Poren nicht, aber sie können feiner wirken.',
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
      'Achte auf Sonnenschutz, um die Hautstruktur zu schützen.',
    ],
    ingredients: ['Niacinamid', 'Salicylsäure', 'Retinol', 'Tonerde'],
  },
  {
    slug: 'sensitive-skin',
    title: 'Empfindliche Haut',
    image: sensibleskin,
    intro:
      'Empfindliche Haut reagiert schnell mit Brennen, Jucken, Trockenheit oder leichter Rötung.',
    causes: [
      'Geschwächte Hautbarriere',
      'Duftstoffe oder reizende Inhaltsstoffe',
      'Wetterwechsel',
      'Zu viele Produkte gleichzeitig',
    ],
    tips: [
      'Halte deine Routine einfach und mild.',
      'Vermeide Duftstoffe und Alkohol in Pflegeprodukten.',
      'Teste neue Produkte zuerst vorsichtig.',
      'Nutze beruhigende und barrierestärkende Pflege.',
    ],
    ingredients: ['Ceramide', 'Panthenol', 'Aloe Vera', 'Centella Asiatica'],
  },
  {
    slug: 'acne-scars',
    title: 'Pickelmale',
    image: acnescars,
    intro:
      'Pickelmale bleiben oft nach Entzündungen zurück und können als dunkle oder rötliche Flecken sichtbar sein.',
    causes: [
      'Entzündete Pickel',
      'Ausdrücken oder Aufkratzen von Unreinheiten',
      'Sonneneinstrahlung kann Flecken verstärken',
      'Langsame Hauterneuerung',
    ],
    tips: [
      'Verwende täglich Sonnenschutz.',
      'Drücke Pickel nicht aus.',
      'Nutze Wirkstoffe, die die Hauterneuerung unterstützen.',
      'Sei geduldig, da Pickelmale Zeit brauchen.',
    ],
    ingredients: ['Niacinamid', 'Vitamin C', 'Azelainsäure', 'Retinol'],
  },
  {
    slug: 'stress-breakouts',
    title: 'Stressbedingte Unreinheiten',
    image: stressbreakouts,
    intro:
      'Stress kann sich auch auf die Haut auswirken und Unreinheiten verstärken.',
    causes: [
      'Stresshormone können die Talgproduktion beeinflussen',
      'Weniger Schlaf in stressigen Phasen',
      'Unregelmäßige Pflege',
      'Häufiges Berühren des Gesichts',
    ],
    tips: [
      'Halte deine Pflegeroutine einfach und regelmäßig.',
      'Achte auf Schlaf und Erholung.',
      'Berühre dein Gesicht möglichst wenig.',
      'Nutze beruhigende Pflege bei gereizter Haut.',
    ],
    ingredients: ['Niacinamid', 'Salicylsäure', 'Panthenol', 'Grüner Tee'],
  },
  {
    slug: 'razor-bumps',
    title: 'Rasierpickel',
    image: rasierpickel,
    intro:
      'Rasierpickel entstehen häufig nach der Rasur und zeigen sich als kleine rote Punkte, Reizungen oder eingewachsene Haare.',
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
      'Vermeide direkt nach der Rasur stark reizende Produkte.',
    ],
    ingredients: ['Aloe Vera', 'Panthenol', 'Salicylsäure', 'Centella Asiatica'],
  },
]

export default function HautwissenDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const problem = hautProbleme.find((item) => item.slug === slug)

  if (!problem) {
    return (
      <main className="min-h-screen bg-[#FFF9F5] pt-32 px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-[#2a1c10]">
            Hautproblem nicht gefunden
          </h1>

          <Link
            to="/hautwissen"
            className="mt-6 inline-block font-semibold text-[#D4A574]"
          >
            Zurück zu Hautwissen
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] pt-32 pb-16 px-6">
      <article className="mx-auto max-w-5xl overflow-hidden rounded-[36px] bg-white shadow-lg">
        <img
          src={problem.image}
          alt={problem.title}
          className="h-[360px] w-full object-cover"
        />

        <div className="p-8 md:p-12">
          <Link
            to="/hautwissen"
            className="font-semibold text-[#D4A574]"
          >
            ← Zurück zu Hautwissen
          </Link>

          <h1 className="mt-6 text-4xl font-bold text-[#2a1c10] md:text-5xl">
            {problem.title}
          </h1>

          <p className="mt-5 text-lg leading-8 text-gray-600">
            {problem.intro}
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <section className="rounded-3xl bg-[#FFF9F5] p-6">
              <h2 className="text-2xl font-bold text-[#2a1c10]">
                Warum entsteht das?
              </h2>

              <ul className="mt-5 space-y-3 text-gray-600">
                {problem.causes.map((cause) => (
                  <li key={cause} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D4A574]" />
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl bg-[#FFF9F5] p-6">
              <h2 className="text-2xl font-bold text-[#2a1c10]">
                Was kann helfen?
              </h2>

              <ul className="mt-5 space-y-3 text-gray-600">
                {problem.tips.map((tip) => (
                  <li key={tip} className="flex gap-3">
                    <span className="font-bold text-[#D4A574]">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-8 rounded-3xl border border-[#F0E0CC] p-6">
            <h2 className="text-2xl font-bold text-[#2a1c10]">
              Geeignete Inhaltsstoffe
            </h2>

            <div className="mt-5 flex flex-wrap gap-3">
              {problem.ingredients.map((ingredient) => (
                <span
                  key={ingredient}
                  className="rounded-full bg-[#F5E6D3] px-4 py-2 text-sm font-semibold text-[#8a5f36]"
                >
                  {ingredient}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-[28px] bg-[#2a1c10] p-8 text-white">
            <h2 className="text-2xl font-bold">
              Du bist dir unsicher, was zu deiner Haut passt?
            </h2>

            <p className="mt-3 max-w-2xl text-white/80">
              Starte die KI-Beratung und erhalte passendere Empfehlungen für deine Hautpflege.
            </p>

            <button
              onClick={() => navigate('/chatbot')}
              className="mt-6 rounded-full bg-[#D4A574] px-7 py-3 font-semibold text-white transition hover:bg-[#c4945f]"
            >
              KI-Beratung starten
            </button>
          </section>

          <p className="mt-8 text-sm text-gray-500">
            Hinweis: Diese Informationen ersetzen keine ärztliche Beratung.
            Bei starken oder anhaltenden Beschwerden solltest du dermatologischen Rat einholen.
          </p>
        </div>
      </article>
    </main>
  )
}