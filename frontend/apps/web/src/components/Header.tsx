import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Globe, ShoppingCart, Search, Menu, X } from 'lucide-react'
import { cn } from "@workspace/ui/lib/utils"
import { useCart } from '@/context/CartContext'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { totalItems } = useCart()

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-serif text-[#D4A574] font-medium tracking-wide">
          SelfGlow
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-[#D4A574]',
                isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
              )
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-[#D4A574]',
                isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
              )
            }
          >
            Shop
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              cn(
                'text-sm font-medium transition-colors hover:text-[#D4A574]',
                isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
              )
            }
          >
            About us
          </NavLink>
        </nav>

        {/* Right side icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="p-2 hover:bg-accent rounded-full transition-colors" aria-label="Language">
            <Globe className="h-5 w-5 text-foreground" />
          </button>
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
            <ShoppingCart className="h-5 w-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#D4A574] text-white text-xs flex items-center justify-center font-medium">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </NavLink>
          <div className="hidden sm:flex items-center gap-2 bg-[#F5E6D3] px-3 py-1.5 rounded-full">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="search"
              className="bg-transparent text-sm w-20 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-accent rounded-full transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-[#D4A574] py-2',
                  isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
                )
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-[#D4A574] py-2',
                  isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
                )
              }
            >
              Shop
            </NavLink>
            <NavLink
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-[#D4A574] py-2',
                  isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
                )
              }
            >
              About us
            </NavLink>
            <NavLink
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors hover:text-[#D4A574] py-2 flex items-center gap-2',
                  isActive ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground'
                )
              }
            >
              Cart
              {totalItems > 0 && (
                <span className="h-5 w-5 rounded-full bg-[#D4A574] text-white text-xs flex items-center justify-center font-medium">
                  {totalItems}
                </span>
              )}
            </NavLink>
          </div>
        </nav>
      )}
    </header>
  )
}
