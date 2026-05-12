import { Heart, Leaf, Award, Users } from 'lucide-react'

const values = [
  {
    icon: Heart,
    title: 'Mit Liebe gemacht',
    description: 'Jedes Produkt wird mit größter Sorgfalt und Leidenschaft für Hautpflege entwickelt.',
  },
  {
    icon: Leaf,
    title: 'Natürliche Inhaltsstoffe',
    description: 'Wir verwenden nur die besten natürlichen und nachhaltigen Inhaltsstoffe für Ihre Haut.',
  },
  {
    icon: Award,
    title: 'Qualitätsgarantie',
    description: 'Alle unsere Produkte werden strengen Qualitätskontrollen unterzogen.',
  },
  {
    icon: Users,
    title: 'Kundenorientiert',
    description: 'Ihre Zufriedenheit steht bei uns an erster Stelle. Immer.',
  },
]

const team = [
  {
    name: 'Dr. Sarah Meyer',
    role: 'Gründerin & CEO',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop',
  },
  {
    name: 'Lisa Schmidt',
    role: 'Produktentwicklung',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop',
  },
  {
    name: 'Michael Weber',
    role: 'Qualitätsmanagement',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop',
  },
]

export default function About() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-[#F5E6D3]/30"></div>
        <div className="container mx-auto relative z-10 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            Über <span className="font-serif text-[#D4A574] font-normal">SelfGlow</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Wir glauben, dass jeder eine Hautpflege verdient, die perfekt zu ihm passt.
            Mit modernster KI-Technologie und hochwertigen Produkten helfen wir Ihnen,
            Ihre strahlendste Haut zu entdecken.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Unsere Geschichte
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  SelfGlow wurde 2026 von Fr. Istanbul, Fr. Hejazi, Fr. Almas, Fr. Zhong, Fr. Nzumegue, und Fr. Agha gegründet, leidenschaftliche
                  Dermatologinnen mit über 15 Jahren Erfahrung. Frustriert von der Einheitslösung
                  der meisten Hautpflegemarken, machte sie es sich zur Mission, personalisierte
                  Hautpflege für jeden zugänglich zu machen.
                </p>
                <p>
                  Mit Hilfe modernster KI-Technologie analysieren wir Ihren Hauttyp und Ihre
                  spezifischen Bedürfnisse, um Ihnen die perfekten Produkte zu empfehlen.
                  Keine Ratespiele mehr – nur Ergebnisse.
                </p>
                <p>
                  Heute ist SelfGlow eine der führenden Marken für personalisierte Hautpflege
                  in Deutschland, mit über 100.000 zufriedenen Kunden und einer wachsenden
                  Community von Hautpflege-Enthusiasten.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-[#F5E6D3] rounded-3xl -z-10"></div>
              <img
                src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=400&fit=crop"
                alt="SelfGlow products"
                className="w-full rounded-2xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 px-4 bg-[#FAFAFA]">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            Unsere Werte
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-background rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#F5E6D3] mb-4">
                  <value.icon className="h-7 w-7 text-[#D4A574]" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Unser Team
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
            Die Menschen hinter SelfGlow – leidenschaftlich, engagiert und immer
            auf der Suche nach den besten Lösungen für Ihre Haut.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-[#F5E6D3]">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-[#F5E6D3]">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Bereit für Ihre perfekte Hautpflege?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Entdecken Sie unsere Produkte und finden Sie heraus, was Ihre Haut
            wirklich braucht.
          </p>
          <a
            href="/shop"
            className="inline-flex items-center justify-center bg-[#D4A574] text-white hover:bg-[#C19660] rounded-full px-8 py-3 font-medium transition-colors"
          >
            Jetzt entdecken
          </a>
        </div>
      </section>
    </div>
  )
}
