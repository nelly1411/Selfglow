import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const isHome = location.pathname === '/'
  const isChatbotPage = location.pathname === '/chatbot'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className={`${isHome ? '' : 'pt-[78px]'} flex-1`}>
        <Outlet />
      </main>

      {!isChatbotPage && (
        <button
          type="button"
          onClick={() => navigate('/chatbot')}
          className="fixed bottom-40 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A574] text-white shadow-lg transition hover:bg-[#C49464] hover:scale-105"
          aria-label="KI-Beratung öffnen"
          title="KI-Beratung öffnen"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      <Footer />
    </div>
  )
}