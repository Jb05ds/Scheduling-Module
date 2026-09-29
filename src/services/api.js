const API_BASE_URL = 'http://127.0.0.1:8000/api'

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