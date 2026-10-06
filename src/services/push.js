import { apiFetch } from './api'

const SW_URL = '/sw.js'

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)

  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

// A subscription is tied to the VAPID key it was created with.
function usesKey(subscription, keyBytes) {
  const current = subscription.options?.applicationServerKey

  if (!current) return false

  const a = new Uint8Array(current)
  return a.length === keyBytes.length && a.every((value, index) => value === keyBytes[index])
}

async function getSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL)
  return registration?.pushManager.getSubscription() ?? null
}

async function saveSubscription(subscription) {
  const { endpoint, keys } = subscription.toJSON()

  const response = await apiFetch('/push-subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      endpoint,
      keys,
      contentEncoding: (PushManager.supportedContentEncodings || ['aes128gcm'])[0],
    }),
  })

  if (!response.ok) {
    throw new Error('Could not save your notification settings.')
  }
}

/** 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' */
export async function getPushStatus() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'

  const subscription = await getSubscription()

  return subscription && Notification.permission === 'granted' ? 'subscribed' : 'unsubscribed'
}

export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error('This browser does not support push notifications.')
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('Notifications are blocked. Allow them in your browser settings first.')
  }

  await navigator.serviceWorker.register(SW_URL)
  const registration = await navigator.serviceWorker.ready

  const keyResponse = await apiFetch('/push/public-key')
  const publicKey = (await keyResponse.json()).data?.public_key

  if (!publicKey) {
    throw new Error('Push notifications are not set up on the server yet.')
  }

  const keyBytes = urlBase64ToUint8Array(publicKey)
  let subscription = await registration.pushManager.getSubscription()

  // Left over from different VAPID keys: replace it, otherwise sends would fail.
  if (subscription && !usesKey(subscription, keyBytes)) {
    await subscription.unsubscribe()
    subscription = null
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes,
    })
  }

  await saveSubscription(subscription)
}

/** Re-links this browser to the logged-in user (safe to call repeatedly). */
export async function syncPushSubscription() {
  const subscription = await getSubscription()

  if (subscription && Notification.permission === 'granted') {
    await saveSubscription(subscription)
  }
}

async function removeFromServer(subscription) {
  await apiFetch('/push-subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
}

export async function disablePush() {
  const subscription = await getSubscription()

  if (!subscription) return

  await removeFromServer(subscription)
  await subscription.unsubscribe()
}

/** Used on log out so the next person on this browser doesn't get your notifications. */
export async function forgetPushSubscription() {
  if (!isPushSupported()) return

  const subscription = await getSubscription()

  if (subscription) {
    await removeFromServer(subscription)
  }
}
