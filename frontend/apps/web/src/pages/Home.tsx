import { Link } from 'react-router-dom'
import { Bot, Sparkles, SlidersHorizontal } from 'lucide-react'
import { Button } from "@workspace/ui/components/button"

const skinTypes = [
  { name: 'Normale Haut', image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=200&h=200&fit=crop' },
  { name: 'Fettige Haut', image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop' },
  { name: 'Mischhaut', image: 'https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?w=200&h=200&fit=crop' },
  { name: 'Sensible Haut', image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=200&h=200&fit=crop' },
  { name: 'Trockene Haut', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&fit=crop' },
]

const categories = [
  { 
    name: 'Feuchtigkeitspflege', 
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&h=600&fit=crop',
    size: 'large'
  },
  { 
    name: 'GESICHTSSERUM', 
    image: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=400&h=300&fit=crop',
    size: 'small'
  },
  { 
    name: 'AUGENPFLEGE', 
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop',
    size: 'small'
  },
  { 
    name: 'GESICHTSMASKEN', 
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=300&fit=crop',
    size: 'small'
  },
  { 
    name: 'GESICHTSREINIGUNG', 
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=300&fit=crop',
    size: 'small'
  },
]

const features = [
  { icon: Bot, title: 'KI-Beratung' },
  { icon: Sparkles, title: 'Hochwertige Produkte' },
  { icon: SlidersHorizontal, title: 'Einfache Filter' },
]

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance">
                Finde die perfekte Pflege für deine Haut
              </h1>
              <Link to="/shop">
                <Button className="bg-[#F5E6D3] text-foreground hover:bg-[#E8D5C0] rounded-full px-6 py-2 text-sm font-medium">
                  Shop Now
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-[#F5E6D3] rounded-bl-[200px] -z-10 transform translate-x-8"></div>
              <img
                src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&h=500&fit=crop"
                alt="Woman applying skincare"
                className="w-full h-auto max-h-[500px] object-cover rounded-bl-[150px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Skin Type Selector */}
      <section className="py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
            {skinTypes.map((type) => (
              <Link 
                to="/shop" 
                key={type.name}
                className="flex flex-col items-center group cursor-pointer"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-[#F5E6D3] border-2 border-transparent group-hover:border-[#D4A574] transition-all">
                  <img
                    src={type.image}
                    alt={type.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="mt-2 text-xs md:text-sm text-foreground font-medium text-center">
                  {type.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px bg-border flex-1 max-w-24"></div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
              Shop by category
            </h2>
            <div className="h-px bg-border flex-1 max-w-24"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* Large card - Feuchtigkeitspflege */}
            <Link 
              to="/shop" 
              className="row-span-2 relative group overflow-hidden rounded-xl"
            >
              <img
                src={categories[0].image}
                alt={categories[0].name}
                className="w-full h-full min-h-[400px] object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-4 left-4">
                <span className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground">
                  {categories[0].name}
                </span>
              </div>
            </Link>

            {/* Small cards */}
            {categories.slice(1).map((category) => (
              <Link 
                to="/shop" 
                key={category.name}
                className="relative group overflow-hidden rounded-xl aspect-[4/3]"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <span className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium text-foreground whitespace-nowrap">
                    {category.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why SelfGlow */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Warum <span className="font-serif text-[#D4A574] font-normal">SelfGlow</span>?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-[#F5E6D3] rounded-xl p-8 flex flex-col items-center text-center"
              >
                <feature.icon className="h-10 w-10 text-foreground mb-4" strokeWidth={1.5} />
                <span className="font-medium text-foreground">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="relative py-16 px-4">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=1200&h=400&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-6">
              Sign up now & get 10% off
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter Your Email."
                className="flex-1 px-4 py-3 rounded-full bg-white/90 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
              />
              <Button className="bg-[#D4A574] text-white hover:bg-[#C19660] rounded-full px-8 py-3">
                subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
