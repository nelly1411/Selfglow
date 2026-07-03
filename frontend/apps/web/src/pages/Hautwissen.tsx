import { Link } from 'react-router-dom'
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
    description: 'Pickel, Entzündungen und verstopfte Poren.',
  },
  {
    slug: 'blackheads',
    title: 'Mitesser',
    image: blackheads,
    description: 'Verstopfte Poren, die sich an der Oberfläche der Haut abzeichnen.',
  },
  {
    slug: 'dry-skin',
    title: 'Trockene Haut',
    image: dryskin,
    description: 'Haut, die an Trockenheit leidet und oft juckt oder rau ist.',
  },
  {
    slug: 'oily-skin',
    title: 'Fettige Haut',
    image: oily,
    description: 'Erhöhte Talgproduktion und schneller Glanz.',
  },
  {
    slug: 'redness',
    title: 'Rötungen',
    image: redness,
    description: 'Empfindliche Haut und sichtbare Rötungen.',
  },
  {
    slug: 'hyperpigmentation',
    title: 'Hyperpigmentierung',
    image: hyperpigmentation,
    description: 'Dunkle Flecken und ungleichmäßiger Hautton.',
  },
  {
    slug: 'dark-circles',
    title: 'Augenringe',
    image: darkcircles,
    description: 'Müde wirkende Augenpartie.',
  },
  {
    slug: 'large-pores',
    title: 'Große Poren',
    image: poren,
    description: 'Sichtbare Poren und ungleichmäßige Hautstruktur.',
  },
  {
    slug: 'sensitive-skin',
    title: 'Empfindliche Haut',
    image: sensibleskin,
    description: 'Reagiert schnell auf äußere Einflüsse.',
  },
  {
    slug: 'acne-scars',
    title: 'Pickelmale',
    image: acnescars,
    description: 'Dauerhafte Narben nach Akne.',
  },
  {
    slug: 'stress-breakouts',
    title: 'Stressbedingte Unreinheiten',
    image: stressbreakouts,
    description: 'Unreinheiten durch Stress und Schlafmangel.',
  },
  {
    slug: 'razor-bumps',
    title: 'Rasierpickel',
    image: rasierpickel,
    description: 'Reizungen und eingewachsene Haare nach der Rasur.',
  },
]

export default function Hautwissen() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="min-h-screen bg-[#FFF9F5] pt-32 pb-16 px-6 !font-sans">
      <div className="mx-auto max-w-6xl">
        <section className="text-center mb-16">
          <p className="text-[#D4A574] font-semibold uppercase tracking-wider font-sans">
            SelfGlow Hautwissen
          </p>

          <h1 className="mt-4 text-5xl font-bold text-[#2a1c10] !font-sans">
            Verstehe deine Haut besser
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 leading-8 font-sans">
            Entdecke hilfreiche Informationen zu häufigen Hautproblemen
            und erfahre, was du tun kannst, um deine Haut optimal zu pflegen.
          </p>
        </section>

        <section id="hautprobleme">
          <h2 className="mb-8 text-center text-3xl font-bold text-[#2a1c10] !font-sans">
            Häufige Hautprobleme
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hautProbleme.map((item) => (
              <Link
                key={item.slug}
                to={`/hautwissen/${item.slug}`}
                className="group overflow-hidden rounded-[32px] bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-[#2a1c10] !font-sans">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-7 text-gray-600 !font-sans">
                    {item.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="font-semibold text-[#D4A574] transition group-hover:translate-x-1">
                      Mehr erfahren →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}