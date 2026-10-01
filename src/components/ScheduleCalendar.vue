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

import { apiFetch } from '../services/api.js'

const emit = defineEmits(['schedule-clicked', 'month-changed'])

const error = ref('')
const fullCalendar = ref(null)

function toYearMonth(value) {
  if (!value) return null

  if (value instanceof Date) {
    return { year: value.getFullYear(), month: value.getMonth() + 1 }
  }

  if (typeof value.year === 'number' && typeof value.month === 'number') {
    return { year: value.year, month: value.month }
  }

  const match = String(value).match(/^(\d{4})-(\d{2})/)
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null
}

const statusColors = {
  scheduled: '#3858e9',
  completed: '#1b7f4b',
  cancelled: '#8b95a7',
}

const legend = [
  { label: 'Scheduled', color: statusColors.scheduled },
  { label: 'Completed', color: statusColors.completed },
  { label: 'Cancelled', color: statusColors.cancelled },
]

const calendarOptions = ref({
  plugins: [
    themePlugin,
    dayGridPlugin,
    timeGridPlugin,
    interactionPlugin,
  ],

  initialView: 'dayGridMonth',
  height: 650,
  nowIndicator: true,

  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },

  buttonText: {
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
  },

  eventClick(info) {
    emit('schedule-clicked', info.event.id)
  },

  datesSet(info) {
    const current = toYearMonth(info.view?.currentStart ?? info.start)

    if (current) {
      setTimeout(() => emit('month-changed', current), 0)
    }
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
    const path = queryString
      ? `/schedules?${queryString}`
      : '/schedules'

    const response = await apiFetch(path)

    if (!response.ok) {
      throw new Error('Failed to fetch schedules.')
    }

    const result = await response.json()

    calendarOptions.value.events = result.data.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      start: `${schedule.scheduled_date}T${schedule.start_time}`,
      end: `${schedule.scheduled_date}T${schedule.end_time}`,
      color: statusColors[schedule.status] ?? statusColors.scheduled,
      className: `event-${schedule.status}`,
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

function refreshEvents() {
  setTimeout(() => {
    calendarOptions.value.events = [...calendarOptions.value.events]
  }, 50)
}

function gotoDate(date) {
  fullCalendar.value?.getApi().gotoDate(date)
  refreshEvents()
}

function goToToday() {
  fullCalendar.value?.getApi().today()
  refreshEvents()
}

defineExpose({
  loadSchedules,
  gotoDate,
  goToToday,
})
</script>

<template>
  <v-theme-provider theme="light">
    <div class="schedule-calendar">
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="comfortable"
        rounded="lg"
        class="mb-4"
      >
        {{ error }}
      </v-alert>

      <ul class="legend">
        <li v-for="item in legend" :key="item.label" class="legend-item">
          <span class="legend-dot" :style="{ background: item.color }" />
          {{ item.label }}
        </li>
      </ul>

      <FullCalendar ref="fullCalendar" :options="calendarOptions" />
    </div>
  </v-theme-provider>
</template>

<style scoped>

.schedule-calendar {
  --fc-classic-background: #ffffff;
  --fc-classic-primary: #3858e9;
  --fc-classic-primary-foreground: #ffffff;
  --fc-classic-button: #3858e9;
  --fc-classic-button-border: #3858e9;
  --fc-classic-button-strong: #2a45c4;
  --fc-classic-button-strong-border: #2a45c4;
  --fc-classic-button-foreground: #ffffff;

  color: #17202e;
  color-scheme: light;
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 0;
  margin: 0 0 14px;
  list-style: none;
  font-size: 0.85rem;
  color: #647084;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>