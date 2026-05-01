import { useState } from 'react'
import { Link, NavLink,  useNavigate, useLocation } from 'react-router-dom'
import { User, ShoppingCart, Search, Menu, X } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'


const navLinkClass = (isActive: boolean) =>
  cn(
    'text-base lg:text-lg font-medium transition-colors hover:text-[#D4A574] whitespace-nowrap',
    isActive ? 'text-[#D4A574] underline underline-offset-4' : 'text-[#5F5F5F]'
  )

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { totalItems } = useCart()

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/40">
      <div className="w-full px-6 lg:px-10 xl:px-14 py-5 flex items-center relative">
        <Link
          to="/"
          className="text-3xl font-serif text-[#D4A574] font-semibold tracking-wide whitespace-nowrap"
        >
          SelfGlow
        </Link>

        <nav className="hidden lg:flex items-center gap-8 xl:gap-10 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
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

        <div className="ml-auto flex items-center justify-end gap-3 lg:gap-4">
          <div className="hidden md:flex items-center gap-3 bg-[#F5E6D3] px-3 lg:px-4 py-2 rounded-full w-[220px] lg:w-[260px] xl:w-[320px]">
            <Search className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search products..."
              className="bg-transparent text-sm lg:text-base w-full focus:outline-none placeholder:text-muted-foreground"
            />
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

          <button className="p-2 hover:bg-accent rounded-full transition-colors" aria-label="Profile">
            <User className="h-6 w-6 text-foreground" />
          </button>

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
            <div className="flex md:hidden items-center gap-3 bg-[#F5E6D3] px-4 py-2 rounded-full">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-base w-full focus:outline-none placeholder:text-muted-foreground"
              />
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
          </div>
        </nav>
      )}
    </header>
  )
}