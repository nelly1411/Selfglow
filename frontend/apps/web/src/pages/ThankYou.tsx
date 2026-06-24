import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ThankYou() {
  const { user }     = useAuth()
  const location     = useLocation()
  const guestEmail   = location.state?.email
  const orderNumber  = location.state?.orderNumber  
    || localStorage.getItem('lastOrderNumber')       
    || '—'

  const userEmail = user?.email || guestEmail || 'deine E-Mail'

  return (
    <div className="min-h-screen flex items-start justify-center bg-[#f6f6f6] px-4 pt-20 sm:pt-30">
      <div className="text-center max-w-xl w-full">
        <h1 className="text-[16px] text-[20px] tracking-[0.15em] sm:tracking-[0.25em] font-medium text-gray-700 mb-8"
          style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
          VIELEN DANK FÜR DEINEN EINKAUF!
        </h1>

        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-white"
            style={{
              background: '#D4A574',
              clipPath: 'polygon(50% 0%, 60% 8%, 72% 4%, 78% 16%, 90% 18%, 88% 30%, 100% 40%, 88% 50%, 100% 60%, 88% 70%, 90% 82%, 78% 84%, 72% 96%, 60% 92%, 50% 100%, 40% 92%, 28% 96%, 22% 84%, 10% 82%, 12% 70%, 0% 60%, 12% 50%, 0% 40%, 12% 30%, 10% 18%, 22% 16%, 28% 4%, 40% 8%)'
            }}>
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="flex justify-center mb-6 px-2">
          <p className="text-[13px] sm:text-[15px] font-normal text-gray-700 text-center"
            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Eine Bestellbestätigung wird in Kürze per E-Mail an <strong>{userEmail}</strong> verschickt.
          </p>
        </div>

        {/* ← Kommt jetzt aus der DB, immer eindeutig */}
        <p className="text-[12px] sm:text-[13px] text-gray-500 mb-10"
          style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Deine Bestellnummer: <strong>{orderNumber}</strong>
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
          <Link to="/profile"
            className="px-6 py-2.5 text-[13px] bg-[#D4A574] text-white tracking-wide text-center"
            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Zu Bestellungen
          </Link>
          <Link to="/shop"
            className="px-6 py-2.5 text-[13px] border border-gray-400 text-gray-700 tracking-wide text-center"
            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Weiter einkaufen
          </Link>
        </div>
      </div>
    </div>
  )
}