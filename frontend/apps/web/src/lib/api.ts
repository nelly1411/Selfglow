export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5050'

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
