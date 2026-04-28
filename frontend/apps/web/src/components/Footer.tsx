import { Package, Headphones, CreditCard } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <Package className="h-10 w-10 text-[#D4A574]" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-foreground">Free Shipping</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <Headphones className="h-10 w-10 text-[#D4A574]" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-foreground">Online Support</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <CreditCard className="h-10 w-10 text-[#D4A574]" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-foreground">Flexible Payments</span>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 SelfGlow. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
