import { createContext, useContext, useState, type ReactNode } from 'react'

export interface Review {
  id: number
  productId: number
  userName: string
  rating: number
  title: string
  comment: string
  date: string
  verified: boolean
}

interface ReviewsContextType {
  reviews: Review[]
  addReview: (review: Omit<Review, 'id' | 'date'>) => void
  getProductReviews: (productId: number) => Review[]
  getAverageRating: (productId: number) => number
  getReviewCount: (productId: number) => number
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined)

// Initial mock reviews - viele Beispielrezensionen
const initialReviews: Review[] = [
  {
    id: 1,
    productId: 1,
    userName: 'Maria S.',
    rating: 5,
    title: 'Absolut fantastisch!',
    comment: 'Dieses Serum hat meine Haut komplett veraendert. Nach nur 2 Wochen sehe ich deutliche Verbesserungen in der Textur und dem Glanz.',
    date: '2024-01-15',
    verified: true,
  },
  {
    id: 2,
    productId: 1,
    userName: 'Thomas K.',
    rating: 4,
    title: 'Sehr gutes Produkt',
    comment: 'Zieht schnell ein und hinterlaesst keine fettige Schicht. Wuerde ich wieder kaufen.',
    date: '2024-01-10',
    verified: true,
  },
  {
    id: 3,
    productId: 1,
    userName: 'Julia H.',
    rating: 5,
    title: 'Mein neuer Favorit',
    comment: 'Ich habe schon viele Seren ausprobiert, aber dieses ist mit Abstand das beste. Meine Haut strahlt!',
    date: '2024-01-05',
    verified: true,
  },
  {
    id: 4,
    productId: 2,
    userName: 'Anna M.',
    rating: 5,
    title: 'Beste Creme die ich je hatte',
    comment: 'Meine Haut fuehlt sich so weich und strahlend an. Der Vitamin C Effekt ist wirklich spuerbar!',
    date: '2024-01-08',
    verified: true,
  },
  {
    id: 5,
    productId: 2,
    userName: 'Lisa W.',
    rating: 4,
    title: 'Sehr zufrieden',
    comment: 'Die Creme zieht gut ein und riecht angenehm. Nach 3 Wochen sehe ich erste Verbesserungen.',
    date: '2024-01-02',
    verified: true,
  },
  {
    id: 6,
    productId: 3,
    userName: 'Sabine L.',
    rating: 4,
    title: 'Gute Augencreme',
    comment: 'Hilft bei feinen Linien. Braucht etwas Zeit bis man Ergebnisse sieht, aber wirkt.',
    date: '2024-01-05',
    verified: false,
  },
  {
    id: 7,
    productId: 3,
    userName: 'Petra M.',
    rating: 5,
    title: 'Endlich keine Augenringe mehr',
    comment: 'Nach Jahren der Suche habe ich endlich eine Augencreme gefunden, die wirklich funktioniert!',
    date: '2023-12-28',
    verified: true,
  },
  {
    id: 8,
    productId: 4,
    userName: 'Laura B.',
    rating: 5,
    title: 'Sanft aber effektiv',
    comment: 'Reinigt gruendlich ohne die Haut auszutrocknen. Perfekt fuer empfindliche Haut!',
    date: '2024-01-03',
    verified: true,
  },
  {
    id: 9,
    productId: 4,
    userName: 'Monika R.',
    rating: 4,
    title: 'Guter Reiniger',
    comment: 'Entfernt Make-up sehr gut und die Haut fuehlt sich danach sauber an.',
    date: '2023-12-20',
    verified: true,
  },
  {
    id: 10,
    productId: 5,
    userName: 'Christina F.',
    rating: 5,
    title: 'Wunderbare Maske',
    comment: 'Die Gesichtsmaske ist ein Traum! Meine Haut ist danach so weich und entspannt.',
    date: '2024-01-12',
    verified: true,
  },
  {
    id: 11,
    productId: 5,
    userName: 'Kathrin E.',
    rating: 5,
    title: 'Spa-Erlebnis zu Hause',
    comment: 'Benutze die Maske jeden Sonntag. Es ist wie ein kleines Spa-Erlebnis zu Hause!',
    date: '2024-01-06',
    verified: true,
  },
  {
    id: 12,
    productId: 6,
    userName: 'Eva S.',
    rating: 4,
    title: 'Sehr guter Sonnenschutz',
    comment: 'Laesst keinen weissen Film und schuetzt zuverlaessig. Super fuer den Alltag.',
    date: '2024-01-11',
    verified: true,
  },
]

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)

  const addReview = (review: Omit<Review, 'id' | 'date'>) => {
    const newReview: Review = {
      ...review,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
    }
    setReviews((prev) => [newReview, ...prev])
  }

  const getProductReviews = (productId: number) => {
    return reviews.filter((review) => review.productId === productId)
  }

  const getAverageRating = (productId: number) => {
    const productReviews = getProductReviews(productId)
    if (productReviews.length === 0) return 0
    const sum = productReviews.reduce((acc, review) => acc + review.rating, 0)
    return sum / productReviews.length
  }

  const getReviewCount = (productId: number) => {
    return getProductReviews(productId).length
  }

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        addReview,
        getProductReviews,
        getAverageRating,
        getReviewCount,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  )
}

export function useReviews() {
  const context = useContext(ReviewsContext)
  if (context === undefined) {
    throw new Error('useReviews must be used within a ReviewsProvider')
  }
  return context
}
