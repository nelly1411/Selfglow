import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { apiUrl } from '@/lib/api'

const BASE_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', postal: '', city: '', country: '',
  klarnaPhone: '', klarnaEmail: '',
  paypalEmail: '', paypalPassword: '', paypalName: '',
}

export default function Checkout() {
const [discount, setDiscount] = useState('')
const [discountValue, setDiscountValue] = useState(0)
  const { items, totalPrice, clearCart } = useCart()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCart()

  const [guestMode, setGuestMode]             = useState(false)
  const [payment, setPayment]                 = useState<'klarna' | 'paypal'>('klarna')
  const [discount, setDiscount]               = useState('')
  const [discountValue, setDiscountValue]     = useState(0)
  const [discountError, setDiscountError]     = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)
  const [errorMsg, setErrorMsg]               = useState('')
  const [errors, setErrors]                   = useState<Record<string, string>>({})
  const [touched, setTouched]                 = useState<Record<string, boolean>>({})
  const [loadingAddress, setLoadingAddress]   = useState(false)
  const [addressLoaded, setAddressLoaded]     = useState(false)
  const [form, setForm]                       = useState(BASE_FORM)

  // ─── Reset when user changes ────────────────────────────────────────────
  useEffect(() => {
    setForm(BASE_FORM)
    setErrors({})
    setTouched({})
    setPayment('klarna')
    setDiscount('')
    setDiscountValue(0)
    setDiscountApplied(false)
    setDiscountError('')
    setAddressLoaded(false)
  }, [user?.id])

  // ─── Load address from DB on mount ──────────────────────────────────────
  // Works in incognito because it fetches from DB, not localStorage
  useEffect(() => {
    if (!user?.token) return

    // Step 1: instant prefill from AuthContext (if login already gave us the data)
    if (user.savedAddress) {
      setForm((prev) => ({
        ...prev,
        address: user.savedAddress || '',
        postal:  user.savedPostal  || '',
        city:    user.savedCity    || '',
        country: user.savedCountry || '',
        phone:   user.savedPhone   || '',
      }))
      setTouched({ address: true, postal: true, city: true, country: true, phone: true })
      setAddressLoaded(true)
    }

    // Step 2: always fetch fresh from DB (catches updates from other sessions/devices)
    setLoadingAddress(true)
    fetch(`${API}/api/auth/address`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (data?.savedAddress) {
          setForm((prev) => ({
            ...prev,
            address: data.savedAddress || '',
            postal:  data.savedPostal  || '',
            city:    data.savedCity    || '',
            country: data.savedCountry || '',
            phone:   data.savedPhone   || '',
          }))
          setTouched({ address: true, postal: true, city: true, country: true, phone: true })
          setAddressLoaded(true)

          // Sync AuthContext so next visit is instant (no DB needed)
          updateUser({
            ...user,
            savedAddress: data.savedAddress,
            savedPostal:  data.savedPostal,
            savedCity:    data.savedCity,
            savedCountry: data.savedCountry,
            savedPhone:   data.savedPhone,
          })
        }
      })
      .catch((err) => console.warn('[Checkout] address fetch failed:', err.message))
      .finally(() => setLoadingAddress(false))
  }, [user?.token]) // only re-run when token changes (= user logs in/out)

  // ─── Validation ─────────────────────────────────────────────────────────
  const validateField = (name: string, value: string): string => {
    if (!value) return 'Pflichtfeld'
    const v = validators[name as keyof typeof validators]
    if (!v) return ''
    if (!v.regex.test(value)) return v.msg
    return ''
  }

  const validateAll = () => {
    const newErrors: Record<string, string> = {}
    const guestFields    = !user ? ['firstName', 'lastName', 'email', 'phone'] : []
    const shippingFields = ['address', 'postal', 'city', 'country']
    const klarnaFields   = payment === 'klarna' ? ['klarnaPhone', 'klarnaEmail'] : []
    const paypalFields   = payment === 'paypal'  ? ['paypalName', 'paypalEmail', 'paypalPassword'] : []
    const allFields      = [...guestFields, ...shippingFields, ...klarnaFields, ...paypalFields]

    allFields.forEach((field) => {
      const err = validateField(field, form[field as keyof typeof form])
      if (err) newErrors[field] = err
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ─── Handle input — no localStorage ─────────────────────────────────────
  const handleChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const res = await fetch(apiUrl('/api/checkout'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(orderData),
  })

  const ErrorMsg = ({ field }: { field: string }) =>
    touched[field] && errors[field]
      ? <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
      : null

  if (res.ok) {
    setSuccess('Deine Bestellung wurde erfolgreich abgeschlossen!')
    clearCart()
  } else {
    setSuccess(data.message || 'Fehler beim Checkout')
  }

  const finalTotal = totalPrice - discountValue

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    setErrorMsg('')
    const allFields = [
      'firstName', 'lastName', 'email', 'phone',
      'address', 'postal', 'city', 'country',
      'klarnaPhone', 'klarnaEmail',
      'paypalName', 'paypalEmail', 'paypalPassword',
    ]
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])))
    if (!validateAll()) return

    const orderData = {
      items,
      totalPrice: finalTotal,
      payment,
      customer: {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email,         phone: form.phone,
      },
      shipping: {
        address: form.address, postal: form.postal,
        city: form.city,       country: form.country,
      },
      paymentData:
        payment === 'klarna'
          ? { phone: form.klarnaPhone, email: form.klarnaEmail }
          : { paypalName: form.paypalName, paypalEmail: form.paypalEmail },
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`

      const res  = await fetch(`${API}/api/checkout`, {
        method: 'POST', headers, body: JSON.stringify(orderData),
      })
      const data = await res.json()

      if (res.status === 429) { setErrorMsg(data.message); return }

      if (!res.ok) {
        setErrorMsg(data.message || 'Fehler beim Checkout')
        return
      }

      // ── Order succeeded ──────────────────────────────────────────────────
      clearCart()

      // Save address to DB and update AuthContext
      // FIX: correct URL /api/auth/address (not /api/user/address)
      // FIX: correct field names: address/postal/city/country/phone
      if (user?.token) {
        const addrRes = await fetch(`${API}/api/auth/address`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            address: form.address,   // ← correct field name
            postal:  form.postal,
            city:    form.city,
            country: form.country,
            phone:   form.phone,
          }),
        })

        if (addrRes.ok) {
          const addrData = await addrRes.json()
          // Update AuthContext so address is available immediately next time
          if (addrData.user) {
            updateUser({ ...user, ...addrData.user, token: user.token })
          }
        }
      }

      const orderNumber = data.order?.orderNumber || ''
      navigate('/thank-you', { state: { email: form.email, orderNumber } })

    } catch {
      setErrorMsg('Netzwerkfehler – bitte versuche es erneut.')
    }
  }

  // ─── Gate ────────────────────────────────────────────────────────────────
  if (!user && !guestMode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white border rounded-xl p-8 text-center max-w-md w-full shadow">
          <h2 className="text-xl font-semibold mb-3">Checkout</h2>
          <p className="text-sm text-gray-600 mb-6">
            Möchten Sie als Gast bestellen oder ein Konto verwenden?
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setGuestMode(true)}
              className="bg-[#D4A574] text-white py-2 rounded-full hover:bg-[#c4945f] transition-colors">
              Als Gast bestellen
            </button>
            <button onClick={() => navigate('/login')}
              className="border py-2 rounded-full hover:bg-gray-50 transition-colors">
              Login / Konto
            </button>
          </div>
        </div>
      </div>
    )
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <div className="container mx-auto px-4 py-10 font-sans max-w-5xl">

      <div className="flex items-center gap-3 mb-8">
        <Link to="/cart" className="hover:opacity-70 transition-opacity">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-center">
          {errorMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-10">

        {/* ── LEFT ── */}
        <div className="space-y-8">

          {/* Customer */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Kundendaten</h2>
            {user ? (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Vorname *</label>
                    <input {...inputProps('firstName')} placeholder="Max"
                      onChange={(e) => {
                        if (/^[a-zA-ZäöüÄÖÜßàáâãèéêìíîòóôùúû\s'\-]*$/.test(e.target.value))
                          handleChange('firstName', e.target.value)
                      }} />
                    <ErrorMsg field="firstName" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Nachname *</label>
                    <input {...inputProps('lastName')} placeholder="Mustermann"
                      onChange={(e) => {
                        if (/^[a-zA-ZäöüÄÖÜßàáâãèéêìíîòóôùúû\s'\-]*$/.test(e.target.value))
                          handleChange('lastName', e.target.value)
                      }} />
                    <ErrorMsg field="lastName" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">E-Mail *</label>
                    <input {...inputProps('email')} type="email" placeholder="max@beispiel.de" />
                    <ErrorMsg field="email" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Telefon *</label>
                    <input {...inputProps('phone')} placeholder="+49 151 12345678"
                      onChange={(e) => {
                        if (/^[+0-9\s\-\(\)]*$/.test(e.target.value)) handleChange('phone', e.target.value)
                      }} />
                    <ErrorMsg field="phone" />
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Shipping */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Lieferadresse</h2>

            {loadingAddress && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Adresse wird geladen…
              </div>
            )}

            {addressLoaded && !loadingAddress && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-600 flex items-center gap-2 mb-3">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                Deine gespeicherte Adresse wurde automatisch eingetragen.
              </div>
            )}

            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Straße & Hausnummer *</label>
              <input {...inputProps('address')} placeholder="Musterstraße 42" />
              <ErrorMsg field="address" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">PLZ *</label>
                <input {...inputProps('postal')} placeholder="10115" maxLength={5}
                  onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) handleChange('postal', e.target.value) }} />
                <ErrorMsg field="postal" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Stadt *</label>
                <input {...inputProps('city')} placeholder="Berlin"
                  onChange={(e) => {
                    if (/^[a-zA-ZäöüÄÖÜßàáâ\s\-\.]*$/.test(e.target.value)) handleChange('city', e.target.value)
                  }} />
                <ErrorMsg field="city" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Land *</label>
                <input {...inputProps('country')} placeholder="Deutschland"
                  onChange={(e) => {
                    if (/^[a-zA-ZäöüÄÖÜßàáâ\s\-\.]*$/.test(e.target.value)) handleChange('country', e.target.value)
                  }} />
                <ErrorMsg field="country" />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Zahlungsmethode</h2>
            <div className="flex gap-3 mb-5">
              {([
                { id: 'klarna', label: '🅺 Klarna' },
                { id: 'paypal', label: '🅿️ PayPal' },
              ] as const).map((method) => (
                <button key={method.id}
                  onClick={() => { setPayment(method.id); setErrors({}); setTouched({}) }}
                  className={`px-5 py-2 rounded-full border text-sm font-medium transition-colors ${
                    payment === method.id
                      ? 'bg-[#D4A574] text-white border-[#D4A574]'
                      : 'bg-[#F5E6D3] border-[#e0c9a8] text-gray-700 hover:bg-[#ecd5b8]'
                  }`}>
                  {method.label}
                </button>
              ))}
            </div>

            {payment === 'klarna' && (
              <div className="space-y-3">
                <div className="bg-pink-50 border border-pink-100 rounded-lg px-3 py-2 text-xs text-pink-700">
                  Klarna — jetzt kaufen, später bezahlen
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Handynummer *</label>
                  <input {...inputProps('klarnaPhone')} placeholder="+49 151 12345678"
                    onChange={(e) => {
                      if (/^[+0-9\s\-\(\)]*$/.test(e.target.value)) handleChange('klarnaPhone', e.target.value)
                    }} />
                  <ErrorMsg field="klarnaPhone" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">E-Mail *</label>
                  <input {...inputProps('klarnaEmail')} type="email" placeholder="max@beispiel.de" />
                  <ErrorMsg field="klarnaEmail" />
                </div>
                <p className="text-xs text-gray-400">Klarna prüft Ihre Bonität. Mit dem Kauf stimmen Sie den Klarna-AGB zu.</p>
              </div>
            )}

            {payment === 'paypal' && (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-yellow-700">
                  Sie werden nach dem Checkout zu PayPal weitergeleitet.
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Vollständiger Name *</label>
                  <input {...inputProps('paypalName')} placeholder="Max Mustermann"
                    onChange={(e) => {
                      if (/^[a-zA-ZäöüÄÖÜß\s'\-]*$/.test(e.target.value)) handleChange('paypalName', e.target.value)
                    }} />
                  <ErrorMsg field="paypalName" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">PayPal E-Mail *</label>
                  <input {...inputProps('paypalEmail')} type="email" placeholder="max@paypal.de" />
                  <ErrorMsg field="paypalEmail" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Passwort * <span className="text-gray-400">(min. 8 Zeichen)</span>
                  </label>
                  <input {...inputProps('paypalPassword')} type="password" placeholder="••••••••" />
                  <ErrorMsg field="paypalPassword" />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT – Order Summary ── */}
        <div className="bg-[#F5E6D3] p-6 rounded-xl h-fit sticky top-6">
          <h2 className="font-semibold mb-5 text-gray-800">Bestellübersicht</h2>

          <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <img src={item.image} className="w-12 h-12 rounded-lg object-cover shrink-0" alt={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-sm text-gray-600">€{item.price.toFixed(2)}</p>
                </div>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500 shrink-0">×{item.quantity}</span>
              </div>
            ))}
          </div>

          <hr className="my-5 border-[#e0c9a8]" />

          <div className="mb-5">
            <label className="text-xs text-gray-600 mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Rabattcode
            </label>
            <div className="flex gap-2">
              <input value={discount}
                onChange={(e) => { setDiscount(e.target.value.toUpperCase()); setDiscountError(''); setDiscountApplied(false) }}
                className="flex-1 p-2 border border-[#e0c9a8] rounded-lg bg-white text-sm outline-none focus:border-[#D4A574]"
                placeholder="Code eingeben" />
              <button onClick={applyDiscount}
                className="bg-[#D4A574] text-white text-xs px-4 rounded-lg hover:bg-[#c4945f] transition-colors">
                Anwenden
              </button>
            </div>
            {discountError   && <p className="text-red-500 text-xs mt-1">{discountError}</p>}
            {discountApplied && (
              <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Rabatt angewendet!
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Zwischensumme</span><span>€{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Versand</span><span>kostenlos</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-green-700 font-medium">
                <span>Rabatt</span><span>−€{discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-[#e0c9a8] pt-3 mt-2">
              <span>Gesamt</span><span>€{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} disabled={hasErrors}
            className={`w-full mt-5 py-3 rounded-full text-white font-medium transition-colors ${
              hasErrors
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-[#D4A574] hover:bg-[#c4945f] active:scale-[0.98]'
            }`}>
            Jetzt bestellen
          </button>

          <p className="text-xs text-center text-gray-400 mt-3">Sichere, verschlüsselte Übertragung</p>
        </div>
      </div>
    </div>
  )

}
