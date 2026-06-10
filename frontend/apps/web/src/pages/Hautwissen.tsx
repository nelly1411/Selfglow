import { Link } from 'react-router-dom'

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
  },
  {
    slug: 'blackheads',
    title: 'Mitesser',
    image: blackheads,
  },
  {
    slug: 'dry-skin',
    title: 'Trockene Haut',
    image: dryskin,
  },
  {
    slug: 'oily-skin',
    title: 'Fettige Haut',
    image: oily,
  },
  {
    slug: 'redness',
    title: 'Rötungen',
    image: redness,
  },
  {
    slug: 'hyperpigmentation',
    title: 'Hyperpigmentierung',
    image: hyperpigmentation,
  },
  {
    slug: 'dark-circles',
    title: 'Augenringe',
    image: darkcircles,
  },
  {
    slug: 'large-pores',
    title: 'Große Poren',
    image: poren,
  },
  {
    slug: 'sensitive-skin',
    title: 'Empfindliche Haut',
    image: sensibleskin,
  },
  {
    slug: 'acne-scars',
    title: 'Pickelmale',
    image: acnescars,
  },
  {
    slug: 'stress-breakouts',
    title: 'Stressbedingte Unreinheiten',
    image: stressbreakouts,
  },
  {
    slug: 'razor-bumps',
    title: 'Rasierpickel',
    image: rasierpickel,
  },
]

export default function Hautwissen() {
  return (
    <main className="min-h-screen bg-[#FFF9F5] pt-32 pb-16 px-6">
      <div className="mx-auto max-w-6xl">
        <section className="text-center mb-16">
          <p className="text-[#D4A574] font-semibold uppercase tracking-wider">
            SelfGlow Hautwissen
          </p>

          <h1 className="mt-4 text-5xl font-bold text-[#2a1c10]">
            Verstehe deine Haut besser
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 leading-8">
            Entdecke hilfreiche Informationen zu häufigen Hautproblemen
            und erfahre, was du tun kannst, um deine Haut optimal zu pflegen.
          </p>

          <button
            onClick={() =>
              document.getElementById('hautprobleme')?.scrollIntoView({
                behavior: 'smooth',
              })
            }
            className="mt-8 rounded-full bg-[#D4A574] px-8 py-3 font-semibold text-white transition hover:bg-[#c4945f]"
          >
            Hautprobleme entdecken
          </button>
        </section>

        <section id="hautprobleme">
          <h2 className="mb-8 text-center text-3xl font-bold text-[#2a1c10]">
            Häufige Hautprobleme
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hautProbleme.map((item) => (
              <Link
                key={item.slug}
                to={`/hautwissen/${item.slug}`}
                className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-56 w-full object-cover"
                />

                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#2a1c10]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-gray-600">
                    Erfahre, warum dieses Hautproblem entsteht und was deiner Haut helfen kann.
                  </p>

                  <p className="mt-5 font-semibold text-[#D4A574]">
                    Mehr erfahren →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}