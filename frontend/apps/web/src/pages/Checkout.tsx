import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Tag, CheckCircle, Loader2 } from 'lucide-react'
import { apiUrl } from '@/lib/api'



// ─── Validators ────────────────────────────────────────────────────────────────
const validators = {
  firstName: { regex: /^[a-zA-ZäöüÄÖÜßàáâãèéêìíîòóôùúû\s'\-]{2,50}$/, msg: 'Min. 2 Buchstaben, keine Zahlen' },
  lastName:  { regex: /^[a-zA-ZäöüÄÖÜßàáâãèéêìíîòóôùúû\s'\-]{2,50}$/, msg: 'Min. 2 Buchstaben, keine Zahlen' },
  email:     { regex: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,                  msg: 'Ungültige E-Mail' },
  phone:     { regex: /^\+[1-9][0-9]{1,3}\s?[0-9\s\-]{6,15}$/,         msg: 'Bitte mit Vorwahl (z.B. +49 151 12345678)' },
  address:   { regex: /^[a-zA-ZäöüÄÖÜß\s\.\-]+ \d+[a-zA-Z]?$/,        msg: 'Format: Straße + Hausnummer (z.B. Musterstraße 12)' },
  postal:    { regex: /^[0-9]{4,5}$/,                                    msg: '4–5-stellige Postleitzahl' },
  city:      { regex: /^[a-zA-ZäöüÄÖÜßàáâ\s\-\.]{2,85}$/,              msg: 'Nur Buchstaben erlaubt' },
  country:   { regex: /^[a-zA-ZäöüÄÖÜßàáâ\s\-\.]{2,85}$/,              msg: 'Nur Buchstaben erlaubt' },
}

const BASE_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', postal: '', city: '', country: '',
}

// ─── Payment config ────────────────────────────────────────────────────────────
/*const PAYMENT_METHODS = [
  {
    id: 'klarna',
    label: 'Klarna',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Klarna_Payment_Badge.svg/200px-Klarna_Payment_Badge.svg.png',
    color: '#FFB3C7',
    textColor: '#1a1a1a',
    tagline: 'Jetzt kaufen, später bezahlen',
    description: 'Du wirst zu Klarna weitergeleitet, um sicher zu bezahlen. Klarna prüft deine Bonität und sendet dir eine Zahlungsaufforderung.',
    redirectUrl: 'https://www.klarna.com',
    buttonLabel: 'Weiter zu Klarna',
    buttonColor: '#FFB3C7',
    buttonTextColor: '#1a1a1a',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/200px-PayPal.svg.png',
    color: '#003087',
    textColor: '#fff',
    tagline: 'Schnell & sicher bezahlen',
    description: 'Du wirst zu PayPal weitergeleitet, um die Zahlung abzuschließen. Du kannst mit deinem PayPal-Konto oder als Gast bezahlen.',
    redirectUrl: 'https://www.paypal.com',
    buttonLabel: 'Weiter zu PayPal',
    buttonColor: '#0070ba',
    buttonTextColor: '#fff',
  },
] as const*/

type PaymentId = 'klarna' | 'paypal'

export default function Checkout() {
const { user, updateUser } = useAuth()
const token = user?.token
  const navigate             = useNavigate()
  const { items, totalPrice, clearCart } = useCart()

  const [guestMode, setGuestMode]             = useState(false)
  const [payment, setPayment]                 = useState<PaymentId>('klarna')
  const [discount, setDiscount]               = useState('')
  const [discountValue, setDiscountValue]     = useState(0)
  const [discountError, setDiscountError]     = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountLabel, setDiscountLabel]   = useState('')
  const [, setCheckingCode]     = useState(false)
  const [errorMsg, setErrorMsg]               = useState('')
  const [errors, setErrors]                   = useState<Record<string, string>>({})
  const [touched, setTouched]                 = useState<Record<string, boolean>>({})
  const [loadingAddress, setLoadingAddress]   = useState(false)
  const [addressLoaded, setAddressLoaded]     = useState(false)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const [isPaying, setIsPaying]                 = useState(false)
  const [form, setForm]                       = useState(BASE_FORM)
  


  // ─── Reset when user changes ──────────────────────────────────────────
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

  // ─── Load address from DB ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token) return

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

    setLoadingAddress(true)
    fetch(apiUrl('/api/auth/address'), {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(data => {
        if (data?.savedAddress) {
          setForm(prev => ({
            ...prev,
            address: data.savedAddress || '',
            postal:  data.savedPostal  || '',
            city:    data.savedCity    || '',
            country: data.savedCountry || '',
            phone:   data.savedPhone   || '',
          }))
          setTouched({ address: true, postal: true, city: true, country: true, phone: true })
          setAddressLoaded(true)
          updateUser({ ...user, savedAddress: data.savedAddress, savedPostal: data.savedPostal, savedCity: data.savedCity, savedCountry: data.savedCountry, savedPhone: data.savedPhone })
        }
      })
      .catch(err => console.warn('[Checkout] address fetch failed:', err.message))
      .finally(() => setLoadingAddress(false))
  }, [user?.token])

  // ─── Validation ──────────────────────────────────────────────────────
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
    const allFields      = [...guestFields, ...shippingFields]

    allFields.forEach(field => {
      const err = validateField(field, form[field as keyof typeof form] || '')
      if (err) newErrors[field] = err
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }))
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
  }

  const inputProps = (name: string) => ({
    name,
    value: form[name as keyof typeof form] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(name, e.target.value),
    onBlur: () => setTouched(prev => ({ ...prev, [name]: true })),
    className: `w-full px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none ${
      touched[name] && errors[name]
        ? 'border-red-400 bg-red-50 focus:border-red-500'
        : touched[name] && !errors[name]
        ? 'border-green-400 bg-green-50 focus:border-green-500'
        : 'border-gray-200 bg-white focus:border-[#D4A574]'
    }`,
  })

  const ErrorMsg = ({ field }: { field: string }) =>
    touched[field] && errors[field]
      ? <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
      : null

  // ─── Discount ─────────────────────────────────────────────────────────
  /*const VALID_CODES: Record<string, number> = { SAVE10: 0.10, WELCOME5: 0.05 }*/

  const applyDiscount = async () => {
  setDiscountApplied(false)
  setDiscountError('')
  const code = discount.trim().toUpperCase()
  if (!code) return

  // SAVE10 — lokal prüfen
  if (code === 'SAVE10') {
    setDiscountValue(totalPrice * 0.10)
    setDiscountLabel('SAVE10')
    setDiscountApplied(true)
    return
  }

  // WELCOME10 — Backend prüfen
  if (code === 'WELCOME10') {
    const t = user?.token || localStorage.getItem('token')
    if (!t) {
      setDiscountError('Bitte einloggen um WELCOME10 zu verwenden.')
      return
    }
    setCheckingCode(true)
    try {
      const res  = await fetch(apiUrl('/api/auth/check-welcome-code'), {        headers: { Authorization: `Bearer ${t}` },
      })
      const data = await res.json()
      if (data.used) {
        setDiscountError('WELCOME10 wurde bereits verwendet.')
      } else {
        setDiscountValue(totalPrice * 0.10)
        setDiscountLabel('WELCOME10')
        setDiscountApplied(true)
      }
    } catch {
      setDiscountError('Code konnte nicht geprüft werden.')
    } finally {
      setCheckingCode(false)
    }
    return
  }

  setDiscountError('Ungültiger Rabattcode')
  setDiscountValue(0)
}

  const finalTotal = totalPrice - discountValue

  // ─── Submit order after payment popup ─────────────────────────────────
  const buildOrderData = () => ({
    items,
    totalPrice: finalTotal,
    payment,
    discountCode: discountApplied ? discountLabel : null,
    customer: {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || user?.email || '',
      phone: form.phone,
    },
    shipping: {
      address: form.address,
      postal: form.postal,
      city: form.city,
      country: form.country,
    },
    paymentData: {
      method: payment,
    },
  })

  const submitOrder = async () => {
    setErrorMsg('')

    const orderData = buildOrderData()

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(apiUrl('/api/checkout'), {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData),
      })

      const data = await res.json()

      if (res.status === 429) {
        setErrorMsg(data.message)
        return
      }

      if (!res.ok) {
        setErrorMsg(data.message || 'Fehler beim Bestellen')
        return
      }

      clearCart()

      if (user?.token) {
        const addrRes = await fetch(apiUrl('/api/auth/address'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            address: form.address,
            postal: form.postal,
            city: form.city,
            country: form.country,
            phone: form.phone,
          }),
        })

        if (addrRes.ok) {
          const addrData = await addrRes.json()

          if (addrData.user) {
            updateUser({ ...user, ...addrData.user, token: user.token })
          }
        }
      }

      const orderNumber = data.order?.orderNumber || ''

      sessionStorage.setItem(
        'pendingOrder',
        JSON.stringify({
          email: form.email || user?.email,
          orderNumber,
        })
      )

      navigate('/thank-you', {
        state: {
          email: form.email || user?.email,
          orderNumber,
        },
      })
    } catch {
      setErrorMsg('Netzwerkfehler – bitte versuche es erneut.')
    }
  }

  const handleCheckout = async () => {
    setErrorMsg('')

    const allFields = [
      ...(!user ? ['firstName', 'lastName', 'email', 'phone'] : []),
      'address',
      'postal',
      'city',
      'country',
    ]

    setTouched(Object.fromEntries(allFields.map((field) => [field, true])))

    if (!validateAll()) return

    if (items.length === 0) {
      setErrorMsg('Dein Warenkorb ist leer.')
      return
    }

    setShowPaymentPopup(true)
  }

  // ─── Gate ─────────────────────────────────────────────────────────────
  if (!user && !guestMode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white border rounded-xl p-6 sm:p-8 text-center max-w-md w-full shadow">
          <h2 className="text-xl font-semibold mb-3">Kasse</h2>
          <p className="text-sm text-gray-600 mb-6">Möchten Sie als Gast bestellen oder ein Konto verwenden?</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setGuestMode(true)} className="bg-[#D4A574] text-white py-2 rounded-full hover:bg-[#c4945f] transition-colors">
              Als Gast bestellen
            </button>
            <button onClick={() => navigate('/login')} className="border py-2 rounded-full hover:bg-gray-50 transition-colors">
              Anmelden / Konto
            </button>
          </div>
        </div>
      </div>
    )
  }
const formatPrice = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10 font-sans max-w-5xl">

      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Link to="/cart" className="hover:opacity-70 transition-opacity">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold">Kasse</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-center">
          {errorMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">

        {/* ── LEFT ── */}
        <div className="space-y-8">

          {/* Kundendaten */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Kundendaten</h2>
            {user ? (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Vorname *</label>
                    <input {...inputProps('firstName')} placeholder="Max"
                      onChange={e => { if (/^[a-zA-ZäöüÄÖÜßàáâãèéêìíîòóôùúû\s'\-]*$/.test(e.target.value)) handleChange('firstName', e.target.value) }} />
                    <ErrorMsg field="firstName" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Nachname *</label>
                    <input {...inputProps('lastName')} placeholder="Mustermann"
                      onChange={e => { if (/^[a-zA-ZäöüÄÖÜßàáâãèéêìíîòóôùúû\s'\-]*$/.test(e.target.value)) handleChange('lastName', e.target.value) }} />
                    <ErrorMsg field="lastName" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">E-Mail *</label>
                    <input {...inputProps('email')} type="email" placeholder="max@beispiel.de" />
                    <ErrorMsg field="email" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Telefon *</label>
                    <input {...inputProps('phone')} placeholder="+49 151 12345678"
                      onChange={e => { if (/^[+0-9\s\-\(\)]*$/.test(e.target.value)) handleChange('phone', e.target.value) }} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">PLZ *</label>
                <input {...inputProps('postal')} placeholder="10115" maxLength={5}
                  onChange={e => { if (/^[0-9]*$/.test(e.target.value)) handleChange('postal', e.target.value) }} />
                <ErrorMsg field="postal" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Stadt *</label>
                <input {...inputProps('city')} placeholder="Berlin"
                  onChange={e => { if (/^[a-zA-ZäöüÄÖÜßàáâ\s\-\.]*$/.test(e.target.value)) handleChange('city', e.target.value) }} />
                <ErrorMsg field="city" />
              </div>
              <div className="col-span-1 sm:col-span-2 md:col-span-1">
                <label className="text-xs text-gray-500 mb-1 block">Land *</label>
                <input {...inputProps('country')} placeholder="Deutschland"
                  onChange={e => { if (/^[a-zA-ZäöüÄÖÜßàáâ\s\-\.]*$/.test(e.target.value)) handleChange('country', e.target.value) }} />
                <ErrorMsg field="country" />
              </div>
            </div>
          </section>

         {/* ── Zahlungsmethode ── */}
<section>
  <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">
    Zahlungsmethode
  </h2>
<div className="flex flex-col sm:flex-row gap-3">

  {/* Klarna */}
  <button
    type="button"
    onClick={() => setPayment('klarna')}
    className={`
      flex-1 h-[64px] sm:h-[74px] rounded-2xl border transition-all duration-200
      flex items-center justify-between px-5 bg-white
      ${payment === 'klarna'
        ? 'border-gray-400'
        : 'border-gray-200 hover:bg-gray-50'
      }
    `}
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/4/40/Klarna_Payment_Badge.svg"
      alt="Klarna"
      className="h-7 object-contain"
    />

    <div
      className={`
        w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${payment === 'klarna'
          ? 'border-pink-500'
          : 'border-gray-300'
        }
      `}
    >
      {payment === 'klarna' && (
        <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
      )}
    </div>
  </button>

  {/* PayPal */}
  <button
    type="button"
    onClick={() => setPayment('paypal')}
    className={`
      flex-1 h-[74px] rounded-2xl border transition-all duration-200
      flex items-center justify-between px-5 bg-white
      ${payment === 'paypal'
        ? 'border-gray-400'
       : 'border-gray-200 hover:bg-gray-50'
      }
    `}
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
      alt="PayPal"
      className="h-6 object-contain"
    />

    <div
      className={`
        w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${payment === 'paypal'
          ? 'border-blue-500'
          : 'border-gray-300'
        }
      `}
    >
      {payment === 'paypal' && (
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
      )}
    </div>
  </button>

</div>

</section>
        </div>

        {/* ── RECHTS – Bestellübersicht ── */}
        <div className="bg-[#F5E6D3] p-5 sm:p-6 rounded-xl h-fit static lg:sticky lg:top-6">
          <h2 className="font-semibold mb-5 text-gray-800">Bestellübersicht</h2>

          <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
            {items.map(item => (
              <div key={item.id} className="flex gap-3 items-center">
                <img src={item.image} className="w-12 h-12 rounded-lg object-cover shrink-0" alt={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-sm text-gray-600">

  {formatPrice(item.price)}

</p>
                </div>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500 shrink-0">×{item.quantity}</span>
              </div>
            ))}
          </div>

          <hr className="my-5 border-[#e0c9a8]" />

          {/* Discount */}
          <div className="mb-5">
            <label className="text-xs text-gray-600 mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Rabattcode
            </label>
            <div className="flex gap-2">
              <input value={discount}
                onChange={e => { setDiscount(e.target.value.toUpperCase()); setDiscountError(''); setDiscountApplied(false) }}
                className="flex-1 p-2 border border-[#e0c9a8] rounded-lg bg-white text-sm outline-none focus:border-[#D4A574]"
                placeholder="Code eingeben" />
              <button onClick={applyDiscount} className="bg-[#D4A574] text-white text-xs px-4 rounded-lg hover:bg-[#c4945f] transition-colors">
                Anwenden
              </button>
            </div>
            {discountError   && <p className="text-red-500 text-xs mt-1">{discountError}</p>}
            {discountApplied && <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Rabatt angewendet!</p>}
          </div>

         {/* Totals */}
<div className="space-y-2 text-sm">

 

  {/* Shipping */}
  <div className="flex justify-between text-gray-600">
    <span>Versand</span>
    <span>kostenlos</span>
  </div>

  {/* Discount */}
  {discountValue > 0 && (
    <div className="flex justify-between text-green-700 font-medium">
      <span>Rabatt</span>
      <span>−{formatPrice(discountValue)}</span>
    </div>
  )}

  {/* Final total */}
  <div className="flex justify-between font-bold text-base border-t border-[#e0c9a8] pt-3 mt-2">
    <span>Gesamt</span>
    <span>{formatPrice(finalTotal)}</span>
  </div>

</div>

          {/* Checkout button — shows payment method */}
        <button
  onClick={handleCheckout}
  disabled={hasErrors}
  className={`w-full mt-5 py-3 rounded-full text-white font-medium transition-colors ${
    hasErrors
      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
      : 'bg-[#D4A574] hover:bg-[#c4945f] active:scale-[0.98]'
  }`}
>
  Jetzt bestellen
</button>

          <p className="text-xs text-center text-gray-400 mt-3">Sichere, verschlüsselte Übertragung</p>
        </div>
      </div>
      {showPaymentPopup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {payment === 'klarna' ? 'Klarna Zahlung' : 'PayPal Zahlung'}
            </h2>

            <button
              type="button"
              onClick={() => setShowPaymentPopup(false)}
              disabled={isPaying}
              className="text-2xl leading-none text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Popup schließen"
            >
              ×
            </button>
          </div>

          <div
            className={`mb-5 rounded-xl border p-4 ${
              payment === 'klarna'
                ? 'border-pink-100 bg-pink-50'
                : 'border-blue-100 bg-blue-50'
            }`}
          >
            <p className="text-sm font-medium text-gray-900">
              Demo-Zahlung mit {payment === 'klarna' ? 'Klarna' : 'PayPal'}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Dies ist eine simulierte Zahlung für das SelfGlow-Projekt.
              Es wird keine echte Zahlung durchgeführt.
            </p>
          </div>

          <div className="mb-5 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Zahlungsmethode</span>
              <span className="font-medium">
                {payment === 'klarna' ? 'Klarna' : 'PayPal'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Gesamtbetrag</span>
              <span className="font-medium">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowPaymentPopup(false)}
              disabled={isPaying}
              className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              Abbrechen
            </button>

            <button
              type="button"
              disabled={isPaying}
              onClick={async () => {
                setIsPaying(true)

                try {
                  await submitOrder()
                  setShowPaymentPopup(false)
                } finally {
                  setIsPaying(false)
                }
              }}
              className={`flex-1 rounded-full py-2.5 text-sm font-medium text-white disabled:opacity-60 ${
                payment === 'klarna'
                  ? 'bg-pink-500 hover:bg-pink-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isPaying ? 'Wird verarbeitet...' : 'Jetzt zahlen'}
            </button>
          </div>
        </div>
      </div>
)}
    </div>
  )
}
