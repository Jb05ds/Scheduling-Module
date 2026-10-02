const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function apiFetch(path, options = {}) {
  const token = localStorage.getItem('auth_token')

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
}