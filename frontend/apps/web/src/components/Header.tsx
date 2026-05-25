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

    navigate(
      value.trim()
        ? `/shop?search=${encodeURIComponent(value)}`
        : '/shop'
    )
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
        <div className="w-full px-6 lg:px-12 xl:px-16 flex items-center h-[78px] gap-8">

          {/* LOGO */}
          <Link
            to="/"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 26,
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
              { to: '/', label: 'Home', end: true },
              { to: '/shop', label: 'Shop', end: false },
              { to: '/about', label: 'About us', end: false },
              { to: '/chatbot', label: 'KI-Beratung', end: false },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => navLink(isActive)}
              >
                {label}
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
              className={iconBtn}
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
                  'hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition-colors duration-200',

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
                <span>Login</span>
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
    </>
  )
}