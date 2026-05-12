import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LogIn, UserPlus, X } from 'lucide-react'
import { apiUrl } from '@/lib/api'
import { useAuth, type User } from '@/context/AuthContext'

type AuthResponse = {
  message?: string
  token?: string
  user?: User
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  function handleClose() {
    navigate(-1)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const response = await fetch(apiUrl(`/api/auth/${mode}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'register' ? { name } : {}),
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
        return
      }

      if (!data.token || !data.user) {
        setError('Login response is missing user data.')
        return
      }

      login(data.token, data.user)
      navigate('/', { replace: true })
    } catch {
      setError('Could not reach the backend. Please check that it is running on port 5050.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="relative flex w-full max-w-md flex-col gap-5 rounded-lg border border-border bg-background p-6 shadow-sm"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-accent transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="space-y-2 pr-10">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'login' ? 'Login' : 'Create account'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? 'Sign in to continue with SelfGlow.'
              : 'Create your SelfGlow account.'}
          </p>
        </div>

        {mode === 'register' && (
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Name
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-base font-normal outline-none focus:ring-2 focus:ring-[#D4A574]"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}

        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          Email
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-base font-normal outline-none focus:ring-2 focus:ring-[#D4A574]"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          Password
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-base font-normal outline-none focus:ring-2 focus:ring-[#D4A574]"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A574] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#C19660] disabled:cursor-not-allowed disabled:opacity-70"
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
          {mode === 'login' ? 'Login' : 'Register'}
        </button>

        <button
          type="button"
          className="text-sm font-medium text-[#8A6337] hover:underline"
          onClick={() => {
            setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'))
            setError('')
            setSuccess('')
          }}
        >
          {mode === 'login'
            ? 'Need an account? Register'
            : 'Already have an account? Login'}
        </button>
      </form>
    </div>
  )
}