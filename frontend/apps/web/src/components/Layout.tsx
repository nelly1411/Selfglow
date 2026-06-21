import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import FloatingChat from './FloatingChat'

export default function Layout() {
  const location = useLocation()

  const isHome = location.pathname === '/'
  const isChatbotPage = location.pathname === '/chatbot'
  const productMatch = location.pathname.match(/^\/product\/(\d+)/)
  const currentProductId = productMatch ? Number(productMatch[1]) : null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

<main className={`${isHome ? '' : 'pt-[70px] sm:pt-[78px]'} flex-1`}>        <Outlet />
      </main>

      {!isChatbotPage && (
        <FloatingChat currentProductId={currentProductId} routeKey={location.pathname} />
      )}

      <Footer />
    </div>
  )
}
