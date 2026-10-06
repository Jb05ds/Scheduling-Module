import { apiFetch } from './api'
import { forgetPushSubscription } from './push'

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user'))
  } catch {
    return null
  }
}

export async function logoutUser(router) {
  try {
    await forgetPushSubscription()
  } catch (error) {
    console.error('Could not detach push subscription:', error)
  }

  try {
    await apiFetch('/logout', { method: 'POST' })
  } catch (error) {
    console.error('Logout request failed:', error)
  } finally {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    router.push('/login')
  }
}
