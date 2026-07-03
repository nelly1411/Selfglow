import { Package, ShieldCheck, CreditCard } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      {/* Vorteile */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-[#D4A574]" />
            </div>
            <span className="text-sm font-medium text-foreground">Versandkosten frei</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-[#D4A574]" />
            </div>
            <span className="text-sm font-medium text-foreground">Sichere Bestellung</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 text-[#D4A574]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground">Flexible Zahlungsmethode</span>
          </div>
        </div>
      </div>
      {/* Urheberrecht */}
      <div className="border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 SelfGlow. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  )
}