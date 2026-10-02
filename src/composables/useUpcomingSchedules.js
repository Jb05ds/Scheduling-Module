import { ref } from 'vue'
import { apiFetch } from '../services/api'

const startOf = (schedule) =>
  new Date(`${String(schedule.scheduled_date).slice(0, 10)}T${schedule.start_time}`)

export function useUpcomingSchedules(scope, limit = 5) {
  const upcoming = ref([])

  async function loadUpcoming() {
    try {
      const response = await apiFetch(`/schedules?scope=${scope}&status=scheduled`)

      if (!response.ok) {
        return
      }

      const result = await response.json()
      const now = new Date()

      upcoming.value = (result.data || [])
        .filter((schedule) => startOf(schedule) >= now)
        .sort((a, b) => startOf(a) - startOf(b))
        .slice(0, limit)
    } catch (error) {
      console.error('Failed to load upcoming schedules:', error)
    }
  }

  return { upcoming, loadUpcoming }
}
