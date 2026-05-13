import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Checkout() {
const [discount, setDiscount] = useState('')
const [discountValue, setDiscountValue] = useState(0)
  const { items, totalPrice } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [guestMode, setGuestMode] = useState(false)
  const [payment, setPayment] = useState<'card' | 'paypal'>('card')

  const [success, setSuccess] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    postal: '',
    city: '',
    country: '',
    cardNumber: '',
    expire: '',
    cvv: '',
    paypalEmail: '',
    paypalPassword: '',
    paypalName: '',
  })

  const handleChange = (e: any) => {
  const updatedForm = { ...form, [e.target.name]: e.target.value }
  setForm(updatedForm)

  setTimeout(validate, 0)
}
  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const newErrors: Record<string, string> = {}

    if (!user) {
      if (!form.firstName) newErrors.firstName = 'Pflichtfeld'
      if (!form.lastName) newErrors.lastName = 'Pflichtfeld'
      if (!form.email) newErrors.email = 'Pflichtfeld'
      if (!form.phone) newErrors.phone = 'Pflichtfeld'
    }

    if (!form.address) newErrors.address = 'Pflichtfeld'
    if (!form.postal) newErrors.postal = 'Pflichtfeld'
    if (!form.city) newErrors.city = 'Pflichtfeld'
    if (!form.country) newErrors.country = 'Pflichtfeld'

    if (payment === 'card') {
      if (!form.cardNumber) newErrors.cardNumber = 'Pflichtfeld'
      if (!form.expire) newErrors.expire = 'Pflichtfeld'
      if (!form.cvv) newErrors.cvv = 'Pflichtfeld'
    }

    if (payment === 'paypal') {
  if (!form.paypalName) newErrors.paypalName = 'Pflichtfeld'
  if (!form.paypalEmail) {
  newErrors.paypalEmail = 'Pflichtfeld'
} else if (!emailRegex.test(form.paypalEmail)) {
  newErrors.paypalEmail = 'Ungültige Email (muss @ enthalten)'
}
  if (!form.paypalPassword) newErrors.paypalPassword = 'Pflichtfeld'
}

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

const handleCheckout = async () => {
  setSuccess('')

  if (!validate()) return

const orderData = {
  items,
  totalPrice,
  payment,
  customer: {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
  },
  shipping: {
    address: form.address,
    postal: form.postal,
    city: form.city,
    country: form.country,
  },
  paymentData: {
    cardNumber: form.cardNumber,
    expire: form.expire,
    cvv: form.cvv,
    paypalName: form.paypalName,
    paypalEmail: form.paypalEmail,
    paypalPassword: form.paypalPassword,
  }
}

  const res = await fetch('http://localhost:5050/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  })

  const data = await res.json()

  if (res.ok) {
    setSuccess('Deine Bestellung wurde erfolgreich abgeschlossen!')
  } else {
    setSuccess(data.message || 'Fehler beim Checkout')
  }
}
const applyDiscount = () => {
  if (discount === 'SAVE10') {
    setDiscountValue(totalPrice * 0.1)
  } else {
    setDiscountValue(0)
  }
}
const finalTotal = totalPrice * 1.19 + 5 - discountValue

  const inputClass = (field: string) =>
    `w-full p-2 border rounded bg-white ${
      errors[field] ? 'border-red-500' : 'border-gray-300'
    }`

if (!user && !guestMode) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="bg-white border rounded-xl p-8 text-center max-w-md w-full shadow">

        <h2 className="text-xl font-semibold mb-3">
          Checkout
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Möchten Sie als Gast bestellen oder ein Konto verwenden?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setGuestMode(true)}
            className="bg-[#D4A574] text-white py-2 rounded-full"
          >
            Als Gast bestellen
          </button>

          <button
            onClick={() => navigate('/login')}
            className="border py-2 rounded-full"
          >
            Login / Konto
          </button>
        </div>

      </div>
    </div>
  )
}
  return (
    <div className="container mx-auto px-4 py-10 font-sans">

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cart">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      {/* GUEST / LOGIN */}
      {!user && !guestMode && (
        <div className="bg-gray-100 p-6 rounded text-center mb-8 max-w-md mx-auto">
          <p className="mb-4">
            Möchten Sie als Gast bestellen oder ein Konto erstellen?
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setGuestMode(true)}
              className="bg-[#D4A574] text-white py-2 rounded-full"
            >
              Als Gast bestellen
            </button>

            <button
              onClick={() => navigate('/login')}
              className="border py-2 rounded-full"
            >
              Login / Konto
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-6 text-center">
          {success}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-10">

        {/* LEFT */}
        <div className="space-y-8">

          {/* CUSTOMER */}
          {(user || guestMode) && (
            <div>
              <h2 className="font-semibold mb-3">Customer Details</h2>

              {!user && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input name="firstName" onChange={handleChange} className={inputClass('firstName')} placeholder="First Name" />
                      {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
                    </div>

                    <div>
                      <input name="lastName" onChange={handleChange} className={inputClass('lastName')} placeholder="Last Name" />
                      {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <input
  type="email"
  name="email"
  value={form.email}
  onChange={handleChange}
  className={inputClass('email')}
  placeholder="Email"
/>
                      {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                    </div>

                    <div>
                    <input
  name="phone"
  value={form.phone}
  onChange={(e) => {
    const value = e.target.value
    if (/^[0-9+\s-]*$/.test(value)) {
      handleChange(e)
    }
  }}
  className={inputClass('phone')}
  placeholder="Phone"
/>
                      {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                    </div>
                  </div>
                </>
              )}

              {user && (
                <div className="bg-gray-100 p-3 rounded">
                  <p>{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              )}
            </div>
          )}

          {/* SHIPPING */}
          {(user || guestMode) && (
            <div>
              <h2 className="font-semibold mb-3">Shipping</h2>

              <div>
                <input name="address" onChange={handleChange} className={inputClass('address')} placeholder="Address" />
                {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                 <input
  name="postal"
  value={form.postal}
  onChange={(e) => {
    const value = e.target.value
    if (/^[0-9]*$/.test(value)) {
      handleChange(e)
    }
  }}
  className={inputClass('postal')}
  placeholder="Postal"
/>
                  {errors.postal && <p className="text-red-500 text-xs">{errors.postal}</p>}
                </div>

                <div>
                  <input
  name="city"
  value={form.city}
  onChange={(e) => {
    const value = e.target.value
    if (/^[a-zA-ZäöüÄÖÜß\s-]*$/.test(value)) {
      handleChange(e)
    }
  }}
  className={inputClass('city')}
  placeholder="City"
/>
                  {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
                </div>

                <div>
                 <input
  name="country"
  value={form.country}
   onChange={(e) => {

    const value = e.target.value

    if (/^[a-zA-ZäöüÄÖÜß\s-]*$/.test(value)) {

      handleChange(e)

    }

  }}
  className={inputClass('country')}
  placeholder="country"
>
  
</input>
                  {errors.country && <p className="text-red-500 text-xs">{errors.country}</p>}
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT */}

          <div>

            <h2 className="font-semibold mb-3">Payment Method</h2>

            <div className="flex gap-3 mb-4">

              <button

                onClick={() => setPayment('paypal')}

                className={`px-4 py-2 rounded-full border text-sm ${

                  payment === 'paypal' ? 'bg-[#D4A574] text-white' : 'bg-[#F5E6D3]'

                }`}

              >

                PayPal

              </button>

              <button

                onClick={() => setPayment('card')}

                className={`px-4 py-2 rounded-full border text-sm ${

                  payment === 'card' ? 'bg-[#D4A574] text-white' : 'bg-[#F5E6D3]'

                }`}

              >

                Card

              </button>

            </div>

            {/* PAYPAL FORM */}

            {payment === 'paypal' && (

              <div className="space-y-2">

               <input
  name="paypalName"
  value={form.paypalName}
  onChange={(e) => {
    const value = e.target.value
    if (/^[a-zA-ZäöüÄÖÜß\s-]*$/.test(value)) {
      handleChange(e)
    }
  }}
  className="w-full p-2 border rounded"
  placeholder="Name"
/>

              <input
  type="email"
  name="paypalEmail"
  value={form.paypalEmail}
  onChange={handleChange}
  className={inputClass('paypalEmail')}
  placeholder="PayPal Email"
/>
              <input
  type="password"
  name="paypalPassword"
  value={form.paypalPassword}
  onChange={handleChange}
  className={inputClass('paypalPassword')}
  placeholder="Password"
/>
              </div>

            )}

            {/* CARD FORM */}

            {payment === 'card' && (

              <div className="space-y-2">
<input
  name="cardNumber"
  value={form.cardNumber}
  onChange={(e) => {
    const value = e.target.value
    if (/^[0-9]*$/.test(value)) {
      handleChange(e)
    }
  }}
  className="w-full p-2 border rounded"
  placeholder="Card Number"
/>

                <div className="grid grid-cols-2 gap-3">

                 <input

  name="expire"

  value={form.expire}

  onChange={handleChange}

  className="p-2 border rounded"

  placeholder="Expire Date"

/>

                 <input
  name="cvv"
  value={form.cvv}
  onChange={(e) => {
    const value = e.target.value
    if (/^[0-9]{0,4}$/.test(value)) {
      handleChange(e)
    }
  }}
  className="p-2 border rounded"
  placeholder="CVV"
/>

                </div>

              </div>

            )}

          </div>

        </div>

        {/* RIGHT SIDE - FULL RESTORED SUMMARY */}

        <div className="bg-[#F5E6D3] p-6 rounded-xl h-fit">

          <h2 className="font-semibold mb-4">Order Summary</h2>

          {/* PRODUCTS */}

          <div className="space-y-4">

            {items.map((item) => (

              <div key={item.id} className="flex gap-3">

                <img src={item.image} className="w-12 h-12 rounded object-cover" />

                <div className="min-w-0">

                  <p className="text-sm truncate max-w-[180px]">

                    {item.name}

                  </p>

                  <p className="text-sm">€{item.price}</p>

                  <p className="text-xs text-gray-600">Anzahl: {item.quantity}</p>

                </div>

              </div>

            ))}

          </div>

          <hr className="my-4" />

          {/* DISCOUNT */}

          <div className="mb-4">

            <h3 className="text-sm mb-2">Discount Code</h3>

            <div className="flex gap-2">

              <input

                value={discount}

                onChange={(e) => setDiscount(e.target.value)}

                className="flex-1 p-2 border rounded bg-white"

                placeholder="Enter code"

              />

              <button

                onClick={applyDiscount}

                className="bg-[#D4A574] text-white text-xs px-3 py-1 rounded"

              >

                Apply

              </button>

            </div>

          </div>

          {/* TOTALS */}

          <div className="space-y-2 text-sm">

            <div className="flex justify-between">

              <span>Subtotal</span>

              <span>€{totalPrice.toFixed(2)}</span>

            </div>

            <div className="flex justify-between">

              <span>Shipping</span>

              <span>€5.00</span>

            </div>

            <div className="flex justify-between">

              <span>Taxes</span>

              <span>€{(totalPrice * 0.19).toFixed(2)}</span>

            </div>

            {discountValue > 0 && (

              <div className="flex justify-between text-green-700">

                <span>Discount</span>

                <span>-€{discountValue.toFixed(2)}</span>

              </div>

            )}

            <div className="flex justify-between font-bold border-t pt-2">

              <span>Total</span>

              <span>€{finalTotal.toFixed(2)}</span>

            </div>

          </div>

          {/* CHECKOUT */}

          <button
  onClick={handleCheckout}
  disabled={Object.keys(errors).length > 0}
  className={`w-full mt-4 py-3 rounded-full text-white ${
    Object.keys(errors).length > 0
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-[#D4A574]'
  }`}
>
  Checkout
</button>

        </div>

      </div>

    </div>

  )

}