import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  LockKeyhole,
  LogIn,
  ShoppingBag,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'
import { apiUrl } from '@/lib/api'
import { useAuth, type User } from '@/context/AuthContext'

type AuthResponse = {
  message?: string
  token?: string
  user?: User
}

type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>
type LoginLocationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const specialCharacterPattern = /[^A-Za-z0-9]/
const userNamePattern = /^[A-Za-z0-9 _-]+$/

function getPasswordValidationMessage(password: string) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.'
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.'
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.'
  }

  if (!specialCharacterPattern.test(password)) {
    return 'Password must contain at least one special character.'
  }

  return ''
}

function getUserNameValidationMessage(userName: string) {
  if (!userName) {
    return ''
  }

  if (userName.length < 2 || userName.length > 30) {
    return 'User name must be between 2 and 30 characters.'
  }

  if (!userNamePattern.test(userName)) {
    return 'User name can only contain letters, numbers, spaces, underscores, and hyphens.'
  }

  return ''
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null

  function handleClose() {
    navigate(-1)
  }

  function validateForm() {
    const errors: FieldErrors = {}
    const normalizedEmail = email.trim()
    const normalizedName = name.trim()

    if (!normalizedEmail) {
      errors.email = 'Enter your email address.'
    } else if (!emailPattern.test(normalizedEmail)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!password) {
      errors.password = 'Enter your password.'
    } else if (mode === 'register') {
      const passwordValidationMessage = getPasswordValidationMessage(password)

      if (passwordValidationMessage) {
        errors.password = passwordValidationMessage
      }
    }

    if (mode === 'register') {
      const userNameValidationMessage = getUserNameValidationMessage(normalizedName)

      if (userNameValidationMessage) {
        errors.name = userNameValidationMessage
      }

      if (!confirmPassword) {
        errors.confirmPassword = 'Confirm your password.'
      } else if (confirmPassword !== password) {
        errors.confirmPassword = 'Passwords do not match.'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(apiUrl(`/api/auth/${mode}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(mode === 'register' ? { name: name.trim() } : {}),
        }),
      })

      const data: AuthResponse = await response.json()

      if (!response.ok) {
        setError(data.message || 'Something went wrong. Please try again.')
        return
      }

      if (mode === 'register') {
        setSuccess('Account created. You can log in now.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        return
      }

      if (!data.token || !data.user) {
        setError('Login response is missing user data.')
        return
      }

      login(data.token, data.user, rememberMe)
      navigate(
        `${locationState?.from?.pathname || '/'}${locationState?.from?.search || ''}${
          locationState?.from?.hash || ''
        }`,
        { replace: true }
      )
    } catch {
      setError('Could not reach the backend. Please check that it is running on port 5050.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchMode() {
    setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'))
    setError('')
    setSuccess('')
    setFieldErrors({})
    setPassword('')
    setConfirmPassword('')
  }

  const isLoginMode = mode === 'login'
  const title = isLoginMode ? 'Welcome back' : 'Create your account'
  const subtitle = isLoginMode
    ? 'Sign in to continue shopping with SelfGlow.'
    : 'Save favorites, checkout faster, and keep your skincare profile in one place.'

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-background shadow-sm lg:grid-cols-[1.05fr_0.95fr]"
        noValidate
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 transition-colors hover:bg-accent"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <section className="flex flex-col justify-between bg-[#F8F1EA] px-6 py-8 sm:px-8 lg:px-10">
          <div className="space-y-6 pr-10 lg:pr-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5C7A4] bg-white px-3 py-1 text-sm font-medium text-[#7A5730]">
              <LockKeyhole className="h-4 w-4" />
              Secure customer account
            </div>

            <div className="space-y-3">
              <h1 className="max-w-md text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Your SelfGlow account keeps skincare shopping simple.
              </h1>
              <p className="max-w-md text-base leading-7 text-muted-foreground">
                Sign in once to save favorites, speed through checkout, and keep your beauty routine close.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-foreground">
            {[
              { icon: Heart, text: 'Keep your wishlist ready across devices' },
              { icon: ShoppingBag, text: 'Return to checkout with fewer steps' },
              { icon: Sparkles, text: 'Keep your skincare profile in one place' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-md border border-[#E9D5BE] bg-white/70 px-4 py-3"
              >
                <Icon className="h-5 w-5 shrink-0 text-[#A9733F]" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 px-6 py-8 sm:px-8 lg:px-10">
          <div className="space-y-2 pr-10">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
          </div>

          {mode === 'register' && (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              <span>
                User name <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <input
                className="rounded-md border border-input bg-background px-3 py-2.5 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                type="text"
                autoComplete="name"
                placeholder="Your user name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <span className="text-sm font-normal text-red-600">{fieldErrors.name}</span>}
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Email
            <input
              className="rounded-md border border-input bg-background px-3 py-2.5 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <span className="text-sm font-normal text-red-600">{fieldErrors.email}</span>}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Password
            <div className="relative">
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-11 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-sm font-normal text-red-600">{fieldErrors.password}</span>
            )}
            {mode === 'register' && (
              <span className="text-xs font-normal leading-5 text-muted-foreground">
                Password must be at least 8 characters,
                <br />
                include an uppercase letter,
                <br />
                a lowercase letter,
                <br />
                a number,
                <br />a special character such as !, @, #, $, or %.
              </span>
            )}
          </label>

          {mode === 'register' && (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Confirm password
              <div className="relative">
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-11 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span className="text-sm font-normal text-red-600">{fieldErrors.confirmPassword}</span>
              )}
            </label>
          )}

          {mode === 'login' && (
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-[#A9733F]"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember me on this device
            </label>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {success && (
            <p className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </p>
          )}

          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A574] px-4 py-3 font-medium text-white transition-colors hover:bg-[#C19660] disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            className="text-sm font-medium text-[#8A6337] hover:underline"
            onClick={switchMode}
          >
            {mode === 'login'
              ? 'New to SelfGlow? Create an account'
              : 'Already have an account? Sign in'}
          </button>
        </section>
      </form>
    </div>
  )
}
