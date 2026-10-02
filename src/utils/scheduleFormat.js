export const toDate = (date) => new Date(`${String(date).slice(0, 10)}T00:00:00`)

export function formatDate(date) {
  if (!date) return ''

  return toDate(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(time) {
  if (!time) return ''

  const [hours, minutes] = time.split(':')

  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const dayNumber = (date) => toDate(date).getDate()

export const monthShort = (date) =>
  toDate(date).toLocaleDateString('en-US', { month: 'short' })

export function relativeDay(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diff = Math.round((toDate(date) - today) / 86400000)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 1 && diff < 7) {
    return toDate(date).toLocaleDateString('en-US', { weekday: 'long' })
  }
  return formatDate(date)
}

export function initialsOf(name) {
  return (name || '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
