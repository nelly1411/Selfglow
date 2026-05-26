import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <>
      <Header />

      <main className={isHome ? '' : 'pt-[78px]'}>
        <Outlet />
      </main>

      <Footer />
    </>
  )
}