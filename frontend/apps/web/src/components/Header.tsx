import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { User, ShoppingCart, Search, Menu, X, Heart, LogOut } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .header-root { font-family: 'Outfit', sans-serif; }
`

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  const { totalItems }                = useCart()
  const { totalItems: wishlistCount } = useWishlist()
  const { isLoggedIn, logout, user }  = useAuth()
  const navigate                      = useNavigate()
  const location                      = useLocation()

  // Nur auf der Home-Seite transparent + weiße Texte
  const isHome = location.pathname === '/'

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearchTerm(params.get('search') || '')
  }, [location.search])

  function handleSearch(value: string) {
    setSearchTerm(value)
    navigate(value.trim() ? `/shop?search=${encodeURIComponent(value)}` : '/shop')
  }

  function handleLogout() {
    logout()
    setShowLogout(false)
    navigate('/')
  }

  // Nav link: weiß auf Home, dunkel auf anderen Seiten
  const navLink = (isActive: boolean) =>
    cn(
      'text-sm font-medium tracking-wide transition-colors duration-200 whitespace-nowrap',
      isActive
        ? 'text-[#D4A574]'
        : isHome
  ? 'text-white/90 hover:text-[#D4A574]'  
  : 'text-[#4a3a2a] hover:text-[#D4A574]'
    )

  // Icon button: weiß auf Home, dunkel auf anderen Seiten
  const iconBtn = cn(
    'relative p-2 rounded-full transition-colors duration-200',
  isHome
  ? 'text-white hover:bg-[#D4A574]/30'  // ← goldener Hover statt weißem
  : 'text-[#2a1c10] hover:bg-[#F5E6D3]'
  )

  return (
    <>
      <header
        className="header-root fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: isHome
            ? 'transparent'
            : 'rgba(255,255,255,0.97)',
          backdropFilter: isHome ? 'none' : 'blur(14px)',
          borderBottom: isHome ? 'none' : '1px solid #f0e0cc',
          boxShadow: isHome ? 'none' : '0 2px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div className="w-full px-6 lg:px-12 xl:px-16 flex items-center h-[68px] gap-8">

          {/* Logo */}
          <Link
            to="/"
            style={{
              fontFamily:     "'Outfit', sans-serif",
              fontSize:       22,
              fontWeight:     800,
              color:          '#D4A574',
              letterSpacing:  '-0.02em',
              textDecoration: 'none',
              whiteSpace:     'nowrap',
              flexShrink:     0,
            }}
          >
            SelfGlow
          </Link>

          {/* Nav links */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-8">
            {[
              { to: '/',        label: 'Home',        end: true },
              { to: '/shop',    label: 'Shop',        end: false },
              { to: '/about',   label: 'About us',    end: false },
              { to: '/chatbot', label: 'KI-Beratung', end: false },
            ].map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => navLink(isActive)}>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right icons */}
          <div className="ml-auto flex items-center gap-1">

            {/* Search — desktop */}
        <div
  className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-full w-[220px] transition-all duration-300 cursor-pointer"
  onClick={(e) => {
    const input = (e.currentTarget as HTMLElement).querySelector('input')
    input?.focus()
  }}
  style={{
    background: isHome ? 'rgba(255,255,255,0.15)' : '#F5E6D3',
    border:     isHome ? '1px solid rgba(255,255,255,0.25)' : '1.5px solid transparent',
    transition: 'border-color 0.2s, background 0.2s',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.borderColor = '#D4A574'
    e.currentTarget.style.background = isHome ? 'rgba(255,255,255,0.22)' : '#EDD5B3'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.borderColor = isHome ? 'rgba(255,255,255,0.25)' : 'transparent'
    e.currentTarget.style.background = isHome ? 'rgba(255,255,255,0.15)' : '#F5E6D3'
  }}
>
              <Search
                className="h-4 w-4 shrink-0"
                style={{ color: isHome ? 'rgba(255,255,255,0.7)' : '#b8967a' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Produkte suchen..."
                style={{
                  fontFamily:  "'Outfit', sans-serif",
                  fontSize:    13,
                  background:  'transparent',
                  border:      'none',
                  outline:     'none',
                  width:       '100%',
                  color:       isHome ? '#fff' : '#2a1c10',
                }}
                className={cn(
  'cursor-text',
  isHome ? 'placeholder:text-white/50' : 'placeholder:text-[#c4a882]'
)}
              />
              {searchTerm && (
                <button onClick={() => handleSearch('')} className="p-0.5 hover:opacity-70 rounded-full">
                  <X
                    className="h-3.5 w-3.5"
                    style={{ color: isHome ? 'rgba(255,255,255,0.7)' : '#b8967a' }}
                  />
                </button>
              )}
            </div>

            {/* Search icon — mobile */}
            <button className={cn(iconBtn, 'xl:hidden')} onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </button>

            {/* Cart */}
            <NavLink
              to="/cart"
              className={({ isActive }) => cn(iconBtn, isActive && (isHome ? 'bg-white/20' : 'bg-[#F5E6D3]'))}
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-[#D4A574] text-white text-[10px] flex items-center justify-center font-semibold">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </NavLink>

            {/* Wishlist */}
            <button className={iconBtn} onClick={() => navigate('/wishlist')} aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-[#D4A574] text-white text-[10px] flex items-center justify-center font-semibold">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>

            {/* User / Login */}
            <NavLink
              to={isLoggedIn ? '/profile' : '/login'}
              className={({ isActive }) =>
                cn(
                  'hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? isHome ? 'bg-white/20 text-white' : 'bg-[#F5E6D3] text-[#D4A574]'
                    : isHome
  ? 'text-white/90 hover:bg-[#D4A574]/30 hover:text-white'  // ← goldener Hover
  : 'text-[#4a3a2a] hover:bg-[#F5E6D3] hover:text-[#D4A574]'
                )
              }
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <User className="h-4 w-4" />
              {isLoggedIn
                ? <span className="max-w-[96px] truncate">{user?.name || user?.email}</span>
                : <span>Login</span>
              }
            </NavLink>

            {/* Logout */}
            {isLoggedIn && (
              <button className={cn(iconBtn, 'hidden sm:inline-flex')} onClick={() => setShowLogout(true)} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            )}

            {/* Hamburger */}
            <button className={cn(iconBtn, 'lg:hidden')} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search bar — mobile */}
        {searchOpen && (
          <div
            className="xl:hidden px-6 py-3 border-t"
            style={{
              background:   isHome ? 'rgba(0,0,0,0.4)' : '#fff',
              borderColor:  isHome ? 'rgba(255,255,255,0.15)' : '#f0e0cc',
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: isHome ? 'rgba(255,255,255,0.15)' : '#F5E6D3',
                border:     isHome ? '1px solid rgba(255,255,255,0.2)' : 'none',
              }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: isHome ? 'rgba(255,255,255,0.7)' : '#b8967a' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Produkte suchen..."
                autoFocus
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize:   14,
                  background: 'transparent',
                  border:     'none',
                  outline:    'none',
                  width:      '100%',
                  color:      isHome ? '#fff' : '#2a1c10',
                }}
              />
              {searchTerm && (
                <button onClick={() => handleSearch('')}>
                  <X className="h-4 w-4" style={{ color: isHome ? 'rgba(255,255,255,0.7)' : '#b8967a' }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {mobileOpen && (
          <nav
            style={{
              background:   isHome ? 'rgba(0,0,0,0.75)' : '#fff',
              backdropFilter: isHome ? 'blur(12px)' : 'none',
              borderTop:    `1px solid ${isHome ? 'rgba(255,255,255,0.15)' : '#f0e0cc'}`,
            }}
          >
            <div className="px-6 py-5 flex flex-col gap-5">
              {[
                { to: '/',        label: 'Home',        end: true },
                { to: '/shop',    label: 'Shop',        end: false },
                { to: '/about',   label: 'About us',    end: false },
                { to: '/chatbot', label: 'KI-Beratung', end: false },
              ].map(({ to, label, end }) => (
                <NavLink
                  key={to} to={to} end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => navLink(isActive)}
                  style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16 }}
                >
                  {label}
                </NavLink>
              ))}

              <div style={{ height: 1, background: isHome ? 'rgba(255,255,255,0.15)' : '#f0e0cc' }} />

              <NavLink
                to={isLoggedIn ? '/profile' : '/login'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => navLink(isActive)}
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <User className="h-4 w-4" />
                {isLoggedIn ? (user?.name || user?.email) : 'Login'}
              </NavLink>

              {isLoggedIn && (
                <button
                  onClick={() => { setShowLogout(true); setMobileOpen(false) }}
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize:   16,
                    display:    'flex',
                    alignItems: 'center',
                    gap:        8,
                    color:      isHome ? 'rgba(255,255,255,0.7)' : '#9a7a5a',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    padding:    0,
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Logout modal */}
      {showLogout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-white rounded-3xl p-8 shadow-2xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 12, color: '#1c1209' }}>
              Abmelden?
            </h2>
            <p style={{ fontSize: 14, color: '#9a7a5a', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
              Möchtest du dich wirklich von deinem SelfGlow Konto abmelden?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogout(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, border: '1.5px solid #e0c9a8', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#7a5c42', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Abbrechen
              </button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, padding: '12px 0', borderRadius: 100, background: '#D4A574', border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.background = '#c4925a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#D4A574')}
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}