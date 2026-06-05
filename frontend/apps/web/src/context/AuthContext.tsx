import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type User = {
  id:           number
  email:        string
  name?:        string | null
  token?:       string
  savedAddress?: string | null
  savedPostal?:  string | null
  savedCity?:    string | null
  savedCountry?: string | null
  savedPhone?:   string | null
  skinType?:     string | null
  usedWelcomeCode?: boolean | null
  emailVerified?:   boolean | null
  gender?:          'male' | 'female' | 'diverse' | null
}

type AuthContextType = {
  token:      string | null
  user:       User | null
  isLoggedIn: boolean
  login:      (token: string, user: User, remember?: boolean) => void
  logout:     () => void
  updateUser: (user: User) => void
}

type AuthState = {
  token: string | null
  user:  User | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function isTokenExpired(token: string) {
  try {
    const payload = token.split('.')[1]
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4), '='
    )
    const decodedPayload = JSON.parse(atob(paddedPayload))
    if (typeof decodedPayload.exp !== 'number') return false
    return decodedPayload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function clearStoredAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('cart')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
  sessionStorage.removeItem('cart')
}

function getStoredAuth(): AuthState {
  const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token')
  const storedUser  = localStorage.getItem('user')  || sessionStorage.getItem('user')

  if (!storedToken || !storedUser) return { token: null, user: null }

  try {
    if (isTokenExpired(storedToken)) {
      clearStoredAuth()
      return { token: null, user: null }
    }

    const parsed: User = JSON.parse(storedUser)

    if (!parsed.token) {
      parsed.token = storedToken
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(parsed))
    }

    return { token: storedToken, user: parsed }
  } catch {
    clearStoredAuth()
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(getStoredAuth)

  const login = useCallback((token: string, user: User, remember = true) => {
    clearStoredAuth()
    const userWithToken: User = { ...user, token }
    const storage = remember ? localStorage : sessionStorage
    storage.setItem('token', token)
    storage.setItem('user', JSON.stringify(userWithToken))
    setAuth({ token, user: userWithToken })
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setAuth({ token: null, user: null })
  }, [])

  const updateUser = useCallback((updatedUser: User) => {
    setAuth(prev => {
      const userWithToken: User = {
        ...updatedUser,
        token: updatedUser.token || prev.user?.token,
      }
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(userWithToken))
      return { ...prev, user: userWithToken }
    })
  }, [])

  return (
    <AuthContext.Provider value={{ token: auth.token, user: auth.user, isLoggedIn: Boolean(auth.token), login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}