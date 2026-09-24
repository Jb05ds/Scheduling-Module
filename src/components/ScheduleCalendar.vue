<script setup>
import { onMounted, ref } from 'vue'

import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/vue3/daygrid'
import timeGridPlugin from '@fullcalendar/vue3/timegrid'
import interactionPlugin from '@fullcalendar/vue3/interaction'
import themePlugin from '@fullcalendar/vue3/themes/classic'

import '@fullcalendar/vue3/skeleton.css'
import '@fullcalendar/vue3/themes/classic/theme.css'
import '@fullcalendar/vue3/themes/classic/palette.css'

const emit = defineEmits(['schedule-clicked'])

const error = ref('')

const calendarOptions = ref({
  plugins: [
    themePlugin,
    dayGridPlugin,
    timeGridPlugin,
    interactionPlugin,
  ],

  initialView: 'dayGridMonth',
  height: 650,

  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },

  eventClick(info) {
    emit('schedule-clicked', info.event.id)
  },

  events: [],
})

async function loadSchedules(filters = {}) {
  try {
    error.value = ''

    const params = new URLSearchParams()

    if (filters.search) {
      params.append('search', filters.search)
    }

    if (filters.status) {
      params.append('status', filters.status)
    }

    if (filters.scheduled_date) {
      params.append('scheduled_date', filters.scheduled_date)
    }

    if (filters.assigned_to) {
      params.append('assigned_to', filters.assigned_to)
    }

    const queryString = params.toString()
    const url = queryString
      ? `http://127.0.0.1:8000/api/schedules?${queryString}`
      : 'http://127.0.0.1:8000/api/schedules'

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch schedules.')
    }

    const result = await response.json()

    calendarOptions.value.events = result.data.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      start: `${schedule.scheduled_date}T${schedule.start_time}`,
      end: `${schedule.scheduled_date}T${schedule.end_time}`,
      extendedProps: {
        description: schedule.description,
        status: schedule.status,
      },
    }))
  } catch (err) {
    error.value = 'Could not load schedules. Check that your Laravel server is running.'
    console.error(err)
  }
}

onMounted(loadSchedules)

defineExpose({
  loadSchedules,
})
</script>

<template>
  <div>
    <p v-if="error" class="text-error mb-4">
      {{ error }}
    </p>

    <FullCalendar :options="calendarOptions" />
  </div>
</template>