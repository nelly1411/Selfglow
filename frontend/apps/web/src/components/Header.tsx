import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { User, ShoppingCart, Search, Menu, X, Heart, LogOut, Sparkles } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  .header-root { font-family: 'Outfit', sans-serif; }
  .ai-nav-link {
    position: relative;
    border: 1.5px solid transparent;
    color: #D4A574;
  }
  .ai-nav-link:hover {
    box-shadow: 0 6px 18px rgba(212, 165, 116, 0.16);
    transform: translateY(-1px);
  }
  .ai-nav-icon {
    position: relative;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    background: #F9E8D2;
    color: #A97745;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(212, 165, 116, 0.24), 0 0 18px rgba(212, 165, 116, 0.32);
    animation: aiIconPulse 2.6s ease-in-out infinite;
  }
  .ai-nav-icon::after {
    content: '';
    position: absolute;
    top: -35%;
    bottom: -35%;
    left: -80%;
    width: 70%;
    background: linear-gradient(90deg, transparent, #fff, #ffe9b8, #fff, transparent);
    transform: rotate(22deg);
    animation: aiIconGlint 2.1s ease-in-out infinite;
  }
  .ai-nav-icon svg {
    position: relative;
    z-index: 1;
    animation: aiStarTwinkle 2s ease-in-out infinite;
  }
  @keyframes aiIconGlint {
    0%, 42%, 100% { left: -85%; opacity: 0; }
    58% { opacity: 1; }
    78% { left: 130%; opacity: 0; }
  }
  @keyframes aiIconPulse {
    0%, 100% { box-shadow: 0 0 0 1px rgba(212, 165, 116, 0.24), 0 0 18px rgba(212, 165, 116, 0.32); }
    50% { box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.18), 0 0 26px rgba(212, 165, 116, 0.55); }
  }
  @keyframes aiStarTwinkle {
    0%, 100% { filter: drop-shadow(0 0 2px rgba(212,165,116,0.35)); opacity: 0.92; transform: scale(1); }
    50% { filter: drop-shadow(0 0 10px rgba(212,165,116,1)); opacity: 1; transform: scale(1.12); }
  }
`

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const { totalItems } = useCart()
  const { totalItems: wishlistCount } = useWishlist()
  const { isLoggedIn, logout, user } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'
  const transparentHeader = isHome && !scrolled

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)

    return () => {
      document.head.removeChild(el)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.9)
    }

    handleScroll()

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearchTerm(params.get('search') || '')
  }, [location.search])

  function handleSearch(value: string) {
    setSearchTerm(value)
  
    const params = new URLSearchParams(location.search)
  
    if (value.trim()) {
      params.set('search', value.trim())
    } else {
      params.delete('search')
    }
  
    const queryString = params.toString()
  
    navigate(queryString ? `/shop?${queryString}` : '/shop')
  }

  function handleLogout() {
    logout()
    setShowLogout(false)
    navigate('/')
  }

  const navLink = (isActive: boolean) =>
    cn(
      'text-base font-semibold tracking-wide transition-colors duration-200 whitespace-nowrap',
      isActive
        ? 'text-[#D4A574]'
        : transparentHeader
          ? 'text-white/90 hover:text-[#D4A574]'
          : 'text-[#4a3a2a] hover:text-[#D4A574]'
    )

  const iconBtn = cn(
    'relative p-2 rounded-full transition-colors duration-200',
    transparentHeader
      ? 'text-white hover:bg-[#D4A574]/30'
      : 'text-[#2a1c10] hover:bg-[#F5E6D3]'
  )

  return (
    <>
      <header
        className="header-root fixed top-0 left-0 w-full z-50 transition-all duration-300"
        style={{
          background: transparentHeader
            ? 'transparent'
            : 'rgba(255,255,255,0.97)',

          backdropFilter: transparentHeader
            ? 'none'
            : 'blur(14px)',

          borderBottom: transparentHeader
            ? 'none'
            : '1px solid #f0e0cc',

          boxShadow: transparentHeader
            ? 'none'
            : '0 2px 20px rgba(0,0,0,0.06)',
        }}
      >
        {/* <div className="w-full px-6 lg:px-12 xl:px-16 flex items-center h-[78px] gap-8"> */}
        <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-16 flex items-center h-[70px] sm:h-[78px] gap-3 sm:gap-8">

          {/* LOGO */}
          <Link
  to="/"
  className="text-[22px] sm:text-[26px]"
  style={{
    fontFamily: "'Outfit', sans-serif",
              // fontSize: 26,
              fontWeight: 800,
              color: '#D4A574',
              letterSpacing: '-0.02em',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            SelfGlow
          </Link>

          {/* NAVIGATION */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-10">
           {[
  { to: '/', label: 'Startseite', end: true },
  { to: '/shop', label: 'Produkte', end: false },
  { to: '/about', label: 'Über uns', end: false },
  { to: '/chatbot', label: 'KI-Beratung', end: false },
  { to: '/hautwissen', label: 'Hautwissen', end: false },
].map(({ to, label, end }) => (
  <NavLink
    key={to}
    to={to}
    end={end}
    className={({ isActive }) =>
  to === '/chatbot'
    ? cn(
        'ai-nav-link inline-flex items-center gap-2 text-base font-semibold whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-4 transition-all duration-200',
        isActive && 'shadow-lg'
      )
    : navLink(isActive)
}
  >
    {to === '/chatbot' ? (
      <>
        <span className="ai-nav-icon">
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span>{label}</span>
      </>
    ) : (
      label
    )}
  </NavLink>
))}
          </nav>

          {/* RIGHT SIDE */}
          <div className="ml-auto flex items-center gap-2">

            {/* SEARCH */}
            <div
              className="hidden xl:flex items-center gap-2 px-5 py-3 rounded-full w-[260px] transition-all duration-300 cursor-pointer"
              onClick={(e) => {
                const input = (e.currentTarget as HTMLElement).querySelector('input')
                input?.focus()
              }}
              style={{
                background: transparentHeader
                  ? 'rgba(255,255,255,0.15)'
                  : '#F5E6D3',

                border: transparentHeader
                  ? '1px solid rgba(255,255,255,0.25)'
                  : '1.5px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D4A574'

                e.currentTarget.style.background = transparentHeader
                  ? 'rgba(255,255,255,0.22)'
                  : '#EDD5B3'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = transparentHeader
                  ? 'rgba(255,255,255,0.25)'
                  : 'transparent'

                e.currentTarget.style.background = transparentHeader
                  ? 'rgba(255,255,255,0.15)'
                  : '#F5E6D3'
              }}
            >
              <Search
                className="h-5 w-5 shrink-0"
                style={{
                  color: transparentHeader
                    ? 'rgba(255,255,255,0.7)'
                    : '#b8967a',
                }}
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Produkte suchen..."
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 15,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  color: transparentHeader ? '#fff' : '#2a1c10',
                }}
                className={cn(
                  'cursor-text',
                  transparentHeader
                    ? 'placeholder:text-white/50'
                    : 'placeholder:text-[#c4a882]'
                )}
              />

              {searchTerm && (
                <button
                  onClick={() => handleSearch('')}
                  className="p-0.5 hover:opacity-70 rounded-full"
                >
                  <X
                    className="h-4 w-4"
                    style={{
                      color: transparentHeader
                        ? 'rgba(255,255,255,0.7)'
                        : '#b8967a',
                    }}
                  />
                </button>
              )}
            </div>

            {/* MOBILE SEARCH */}
            <button
              className={cn(iconBtn, 'xl:hidden')}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-6 w-6" />
            </button>

            {/* CART */}
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                cn(
                  iconBtn,
                  isActive &&
                    (transparentHeader
                      ? 'bg-white/20'
                      : 'bg-[#F5E6D3]')
                )
              }
            >
              <ShoppingCart className="h-6 w-6" />

              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-[20px] w-[20px] rounded-full bg-[#D4A574] text-white text-[11px] flex items-center justify-center font-semibold">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </NavLink>

            {/* WISHLIST */}
            <button
 className={cn(iconBtn, 'hidden md:inline-flex')}
               onClick={() => navigate('/wishlist')}
            >
              <Heart className="h-6 w-6" />

              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 h-[20px] w-[20px] rounded-full bg-[#D4A574] text-white text-[11px] flex items-center justify-center font-semibold">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>

            {/* LOGIN */}
            <NavLink
              to={isLoggedIn ? '/profile' : '/login'}
              className={({ isActive }) =>
                cn(
                  'hidden md:inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition-colors duration-200',

                  isActive
                    ? transparentHeader
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F5E6D3] text-[#D4A574]'
                    : transparentHeader
                      ? 'text-white/90 hover:bg-[#D4A574]/30 hover:text-white'
                      : 'text-[#4a3a2a] hover:bg-[#F5E6D3] hover:text-[#D4A574]'
                )
              }
            >
              <User className="h-5 w-5" />

              {isLoggedIn ? (
                <span className="max-w-[100px] truncate">
                  {user?.name || user?.email}
                </span>
              ) : (
                <span>Anmelden</span>
              )}
            </NavLink>

            {/* LOGOUT */}
            {isLoggedIn && (
              <button
                className={cn(iconBtn, 'hidden sm:inline-flex')}
                onClick={() => setShowLogout(true)}
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}

            {/* MOBILE MENU */}
            <button
              className={cn(iconBtn, 'lg:hidden')}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

      </header>

      {mobileOpen && (
  <div className="lg:hidden fixed top-[70px] left-0 w-full z-40 bg-white border-b border-[#f0e0cc] shadow-lg">
    <nav className="flex flex-col px-5 py-4 gap-3 text-[#4a3a2a] font-semibold">
      <Link to="/" onClick={() => setMobileOpen(false)}>Startseite</Link>
      <Link to="/shop" onClick={() => setMobileOpen(false)}>Produkte</Link>
      <Link to="/about" onClick={() => setMobileOpen(false)}>Über uns</Link>
      <Link to="/chatbot" onClick={() => setMobileOpen(false)}>KI-Beratung</Link>
      <Link to="/hautwissen" onClick={() => setMobileOpen(false)}>Hautwissen</Link>
      <Link to="/wishlist" onClick={() => setMobileOpen(false)}>Merkliste</Link>
      <Link to={isLoggedIn ? "/profile" : "/login"} onClick={() => setMobileOpen(false)}>
        {isLoggedIn ? "Mein Profil" : "Anmelden"}
      </Link>
    </nav>
  </div>
)}

      {showLogout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold text-[#2a1c10]">
              Wirklich abmelden?
            </h2>

            <p className="mb-6 text-sm text-gray-600">
              Möchtest du dich wirklich von deinem SelfGlow-Konto abmelden?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogout(false)}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-full bg-[#D4A574] py-2.5 text-sm font-medium text-white hover:bg-[#c4945f]"
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
