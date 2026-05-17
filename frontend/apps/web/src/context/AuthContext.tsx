import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type User = {
  id: number
  email: string
  name?: string | null
}

type AuthContextType = {
  token: string | null
  user: User | null
  isLoggedIn: boolean
  login: (token: string, user: User, remember?: boolean) => void
  logout: () => void
}

type AuthState = {
  token: string | null
  user: User | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function isTokenExpired(token: string) {
  try {
    const payload = token.split('.')[1]
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    )
    const decodedPayload = JSON.parse(atob(paddedPayload))

    if (typeof decodedPayload.exp !== 'number') {
      return false
    }

    return decodedPayload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function clearStoredAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

function getStoredAuth(): AuthState {
  const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token')
  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')

  if (!storedToken || !storedUser) {
    return { token: null, user: null }
  }

  try {
    if (isTokenExpired(storedToken)) {
      clearStoredAuth()
      return { token: null, user: null }
    }

    return {
      token: storedToken,
      user: JSON.parse(storedUser),
    }
  } catch {
    clearStoredAuth()
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(getStoredAuth)

  const login = useCallback((token: string, user: User, remember = true) => {
    clearStoredAuth()

    const storage = remember ? localStorage : sessionStorage
    storage.setItem('token', token)
    storage.setItem('user', JSON.stringify(user))

    setAuth({ token, user })
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setAuth({ token: null, user: null })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        token: auth.token,
        user: auth.user,
        isLoggedIn: Boolean(auth.token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
