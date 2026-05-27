import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
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
    return 'Das Passwort muss mindestens 8 Zeichen lang sein.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Das Passwort muss mindestens einen Großbuchstaben enthalten.'
  }

  if (!/[a-z]/.test(password)) {
    return 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.'
  }

  if (!/[0-9]/.test(password)) {
    return 'Das Passwort muss mindestens eine Zahl enthalten.'
  }

  if (!specialCharacterPattern.test(password)) {
    return 'Das Passwort muss mindestens ein Sonderzeichen enthalten.'
  }

  return ''
}

function getUserNameValidationMessage(userName: string) {
  if (!userName) {
    return ''
  }

  if (userName.length < 2 || userName.length > 30) {
    return 'Der Benutzername muss zwischen 2 und 30 Zeichen lang sein.'
  }

  if (!userNamePattern.test(userName)) {
    return 'Der Benutzername darf nur Buchstaben, Zahlen, Leerzeichen, Unterstriche und Bindestriche enthalten.'
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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('verified') === '1') {
      setMode('login')
      setSuccess('E-Mail bestätigt. Du kannst dich jetzt anmelden.')
    }
  }, [location.search])

  function handleClose() {
    navigate(-1)
  }

  function validateForm() {
    const errors: FieldErrors = {}
    const normalizedEmail = email.trim()
    const normalizedName = name.trim()

    if (!normalizedEmail) {
      errors.email = 'Gib deine E-Mail-Adresse ein.'
    } else if (!emailPattern.test(normalizedEmail)) {
      errors.email = 'Gib eine gültige E-Mail-Adresse ein.'
    }

    if (!password) {
      errors.password = 'Gib dein Passwort ein.'
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
        errors.confirmPassword = 'Bestätige dein Passwort.'
      } else if (confirmPassword !== password) {
        errors.confirmPassword = 'Die Passwörter stimmen nicht überein.'
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
        setError(data.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.')
        return
      }

      if (mode === 'register') {
        setSuccess(data.message || 'Konto erstellt. Bitte bestätige deine E-Mail-Adresse.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        return
      }

      if (!data.token || !data.user) {
        setError('In der Anmeldeantwort fehlen Benutzerdaten.')
        return
      }

      login(data.token, { ...data.user, token: data.token }, rememberMe)
      navigate(
        `${locationState?.from?.pathname || '/'}${locationState?.from?.search || ''}${
          locationState?.from?.hash || ''
        }`,
        { replace: true }
      )
    } catch {
      setError('Das Backend ist nicht erreichbar. Bitte prüfe, ob es auf Port 5050 läuft.')
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
  const title = isLoginMode ? 'Willkommen zurück' : 'Konto erstellen'
  const subtitle = isLoginMode
    ? 'Melde dich an, um weiter bei SelfGlow einzukaufen.'
    : 'Speichere Favoriten, bezahle schneller und verwalte dein Hautpflegeprofil an einem Ort.'

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border bg-background shadow-sm"
        noValidate
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 transition-colors hover:bg-accent"
          aria-label="Schließen"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <section className="flex flex-col gap-5 px-6 py-8 sm:px-8 lg:px-10">
          <div className="space-y-2 pr-10">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
          </div>

          {mode === 'register' && (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              <span>
                Benutzername <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <input
                className="rounded-md border border-input bg-background px-3 py-2.5 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                type="text"
                autoComplete="name"
                placeholder="Dein Benutzername"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <span className="text-sm font-normal text-red-600">{fieldErrors.name}</span>}
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            E-Mail
            <input
              className="rounded-md border border-input bg-background px-3 py-2.5 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
              type="email"
              autoComplete="email"
              placeholder="dein.name@beispiel.de"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <span className="text-sm font-normal text-red-600">{fieldErrors.email}</span>}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Passwort
            <div className="relative">
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-11 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Passwort"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-sm font-normal text-red-600">{fieldErrors.password}</span>
            )}
            {mode === 'register' && (
              <span className="text-xs font-normal leading-5 text-muted-foreground">
                Das Passwort muss mindestens 8 Zeichen lang sein,
                <br />
                einen Großbuchstaben,
                <br />
                einen Kleinbuchstaben,
                <br />
                eine Zahl
                <br />
                und ein Sonderzeichen wie !, @, #, $ oder % enthalten.
              </span>
            )}
          </label>

          {mode === 'register' && (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Passwort bestätigen
              <div className="relative">
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-11 text-base font-normal outline-none transition focus:ring-2 focus:ring-[#D4A574]"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Passwort bestätigen"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? 'Passwortbestätigung ausblenden' : 'Passwortbestätigung anzeigen'}
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
              Auf diesem Gerät angemeldet bleiben
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
            {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>

          <button
            type="button"
            className="text-sm font-medium text-[#8A6337] hover:underline"
            onClick={switchMode}
          >
            {mode === 'login'
              ? 'Neu bei SelfGlow? Konto erstellen'
              : 'Du hast bereits ein Konto? Anmelden'}
          </button>
        </section>
      </form>
    </div>
  )
}
