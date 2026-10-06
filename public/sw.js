/* Service worker: shows push notifications and opens the app when one is clicked. */

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload

  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Schedules', body: event.data.text() }
  }

  const { title = 'Schedules', ...options } = payload

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => 'focus' in client)

      if (existing) {
        return existing.focus()
      }

      return self.clients.openWindow(url)
    }),
  )
})
