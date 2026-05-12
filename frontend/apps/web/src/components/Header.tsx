import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import {
  User,
  ShoppingCart,
  Search,
  Menu,
  X,
  Heart,
  LogOut,
} from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'

const navLinkClass = (isActive: boolean) =>
  cn(
    'text-base lg:text-lg font-medium transition-colors hover:text-[#D4A574] whitespace-nowrap',
    isActive ? 'text-[#D4A574] underline underline-offset-4' : 'text-[#5F5F5F]'
  )

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const { totalItems } = useCart()
  const { totalItems: wishlistCount } = useWishlist()
  const { isLoggedIn, logout, user } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearchTerm(params.get('search') || '')
  }, [location.search])

  function handleSearch(value: string) {
    setSearchTerm(value)

    if (value.trim() === '') {
      navigate('/shop')
    } else {
      navigate(`/shop?search=${encodeURIComponent(value)}`)
    }
  }

  function handleLogout() {
    logout()
    setShowLogoutModal(false)
    navigate('/')
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="w-full px-6 lg:px-10 xl:px-14 py-5 flex items-center relative">
          <Link
            to="/"
            className="text-3xl font-serif text-[#D4A574] font-semibold tracking-wide whitespace-nowrap"
          >
            SelfGlow
          </Link>

          <nav className="hidden lg:flex items-center gap-8 xl:gap-10 absolute left-[45%] -translate-x-1/2 whitespace-nowrap">
            <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
              Home
            </NavLink>

            <NavLink to="/shop" className={({ isActive }) => navLinkClass(isActive)}>
              Shop
            </NavLink>

            <NavLink to="/about" className={({ isActive }) => navLinkClass(isActive)}>
              About us
            </NavLink>

            <NavLink to="/chatbot" className={({ isActive }) => navLinkClass(isActive)}>
              KI-Beratung
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center justify-end gap-3 lg:gap-2">
            <div className="hidden md:flex items-center gap-2 bg-[#F5E6D3] px-3 lg:px-4 py-2 rounded-full w-[220px] lg:w-[260px] xl:w-[320px]">
              <Search className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground shrink-0" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search products..."
                className="bg-transparent text-sm lg:text-base w-full focus:outline-none placeholder:text-muted-foreground"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  className="p-1 hover:bg-black/10 rounded-full"
                  aria-label="Suche löschen"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <NavLink
              to="/cart"
              className={({ isActive }) =>
                cn(
                  'relative p-2 hover:bg-accent rounded-full transition-colors',
                  isActive ? 'bg-accent' : ''
                )
              }
              aria-label="Cart"
            >
              <ShoppingCart className="h-6 w-6 text-foreground" />

              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#D4A574] text-white text-xs flex items-center justify-center font-medium">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </NavLink>

            <button
              onClick={() => navigate('/wishlist')}
              className="relative p-2 hover:bg-accent rounded-full transition-colors"
              aria-label="Wishlist"
              type="button"
            >
              <Heart className="h-6 w-6 text-foreground" />

              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#D4A574] text-white text-xs flex items-center justify-center font-medium">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>

            <NavLink
              to={isLoggedIn ? '/profile' : '/login'}
              className={({ isActive }) =>
                cn(
                  'hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors',
                  isActive ? 'bg-accent' : ''
                )
              }
              aria-label={isLoggedIn ? 'Profil' : 'Login'}
            >
              <User className="h-5 w-5" />

              {isLoggedIn && (
                <span className="max-w-24 truncate">
                  {user?.name || user?.email}
                </span>
              )}
            </NavLink>

            {isLoggedIn && (
              <button
                className="hidden sm:inline-flex p-2 hover:bg-accent rounded-full transition-colors"
                onClick={() => setShowLogoutModal(true)}
                type="button"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5 text-foreground" />
              </button>
            )}

            <button
              className="lg:hidden p-2 hover:bg-accent rounded-full transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-border bg-background">
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="flex md:hidden items-center gap-2 bg-[#F5E6D3] px-4 py-2 rounded-full">
                <Search className="h-5 w-5 text-muted-foreground" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent text-base w-full focus:outline-none placeholder:text-muted-foreground"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => handleSearch('')}
                    className="p-1 hover:bg-black/10 rounded-full"
                    aria-label="Suche löschen"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              <NavLink to="/" end onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => navLinkClass(isActive)}>
                Home
              </NavLink>

              <NavLink to="/shop" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => navLinkClass(isActive)}>
                Shop
              </NavLink>

              <NavLink to="/about" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => navLinkClass(isActive)}>
                About us
              </NavLink>

              <NavLink to="/chatbot" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => navLinkClass(isActive)}>
                KI-Beratung
              </NavLink>

              <NavLink
                to={isLoggedIn ? '/profile' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                {isLoggedIn ? `Profil (${user?.name || user?.email})` : 'Login'}
              </NavLink>

              {isLoggedIn && (
                <button
                  className="flex items-center gap-2 text-left text-base font-medium text-[#5F5F5F] hover:text-[#D4A574]"
                  onClick={() => {
                    setShowLogoutModal(true)
                    setMobileMenuOpen(false)
                  }}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h2 className="text-3xl font-semibold mb-4 text-center">
              Abmelden?
            </h2>

            <p className="text-muted-foreground mb-8 leading-relaxed text-center">
              Möchtest du dich wirklich von deinem SelfGlow Konto abmelden?
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-full border border-border px-4 py-3 font-medium hover:bg-accent transition"
              >
                Abbrechen
              </button>

              <button
                onClick={handleLogout}
                className="flex-1 rounded-full bg-[#D4A574] px-4 py-3 font-medium text-white hover:bg-[#C19660] transition"
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