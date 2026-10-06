<script setup>
import { computed, onMounted, ref } from 'vue'

import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/vue3/daygrid'
import timeGridPlugin from '@fullcalendar/vue3/timegrid'
import interactionPlugin from '@fullcalendar/vue3/interaction'
import themePlugin from '@fullcalendar/vue3/themes/classic'

import '@fullcalendar/vue3/skeleton.css'
import '@fullcalendar/vue3/themes/classic/theme.css'
import '@fullcalendar/vue3/themes/classic/palette.css'

import { apiFetch } from '../services/api.js'

const props = defineProps({
  // 'mine' = my own calendar, 'assigned' = schedules I created for other people
  scope: { type: String, default: 'mine' },
})

const emit = defineEmits(['schedule-clicked'])

const error = ref('')
const fullCalendar = ref(null)

/* ---------- Month / year navigation ---------- */

const today = new Date()
const viewMonth = ref(today.getMonth() + 1)
const viewYear = ref(today.getFullYear())

const monthItems = Array.from({ length: 12 }, (_, index) => ({
  title: new Date(2000, index, 1).toLocaleDateString('en-US', { month: 'long' }),
  value: index + 1,
}))

const yearItems = computed(() => {
  const thisYear = new Date().getFullYear()
  const first = Math.min(thisYear - 5, viewYear.value)
  const last = Math.max(thisYear + 5, viewYear.value)

  return Array.from({ length: last - first + 1 }, (_, index) => first + index)
})

// FullCalendar may hand back a Date, a Temporal object or a string.
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

// Re-applies the current events once the new month has rendered, so a jump
// (Today / month picker) never leaves the view empty.
function refreshEvents() {
  setTimeout(() => {
    calendarOptions.value.events = [...calendarOptions.value.events]
  }, 50)
}

function gotoDate(date) {
  fullCalendar.value?.getApi().gotoDate(date)
  refreshEvents()
}

function jumpToMonth() {
  if (!viewYear.value || !viewMonth.value) return

  const month = String(viewMonth.value).padStart(2, '0')
  gotoDate(`${viewYear.value}-${month}-01`)
}

function onMonthPick(month) {
  viewMonth.value = month
  jumpToMonth()
}

function onYearPick(year) {
  viewYear.value = year
  jumpToMonth()
}

function goToToday() {
  fullCalendar.value?.getApi().today()
  refreshEvents()

  const now = new Date()
  viewMonth.value = now.getMonth() + 1
  viewYear.value = now.getFullYear()
}

/* ---------- Calendar ---------- */

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
  plugins: [themePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin],

  initialView: 'dayGridMonth',
  height: 650,
  nowIndicator: true,

  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },

  eventClick(info) {
    emit('schedule-clicked', info.event.id)
  },

  // Keeps the pickers in sync when the calendar's own prev/next buttons are used.
  datesSet(info) {
    const current = toYearMonth(info.view?.currentStart ?? info.start)

    // Deferred so the state update doesn't land in the middle of FullCalendar's render.
    if (current) {
      setTimeout(() => {
        viewYear.value = current.year
        viewMonth.value = current.month
      }, 0)
    }
  },

  events: [],
})

async function loadSchedules(filters = {}) {
  try {
    error.value = ''

    const params = new URLSearchParams({ scope: props.scope })

    if (filters.search) {
      params.append('search', filters.search)
    }

    if (filters.status) {
      params.append('status', filters.status)
    }

    if (filters.assigned_to) {
      params.append('assigned_to', filters.assigned_to)
    }

    const response = await apiFetch(`/schedules?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Failed to fetch schedules.')
    }

    const result = await response.json()

    calendarOptions.value.events = result.data.map((schedule) => ({
      id: schedule.id,
      // In the "assigned" view, show who each schedule was given to.
      title:
        props.scope === 'assigned' && schedule.assignee
          ? `${schedule.title} · ${schedule.assignee.name}`
          : schedule.title,
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

      <div class="cal-toolbar">
        <div class="cal-nav">
          <v-select
            :model-value="viewMonth"
            :items="monthItems"
            aria-label="Month"
            variant="solo-filled"
            flat
            rounded="lg"
            density="comfortable"
            hide-details
            class="cal-nav__month"
            @update:model-value="onMonthPick"
          />

          <v-select
            :model-value="viewYear"
            :items="yearItems"
            aria-label="Year"
            variant="solo-filled"
            flat
            rounded="lg"
            density="comfortable"
            hide-details
            class="cal-nav__year"
            @update:model-value="onYearPick"
          />

          <v-btn
            color="primary"
            variant="tonal"
            rounded="lg"
            prepend-icon="mdi-calendar-today"
            class="text-none font-weight-semibold"
            @click="goToToday"
          >
            Today
          </v-btn>
        </div>

        <div class="cal-actions">
          <slot name="actions" />
        </div>
      </div>

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
/*
  FullCalendar v7's Classic theme is configured through CSS variables,
  so setting them on this wrapper restyles the calendar without touching
  its internal class names.
*/
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

.cal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.cal-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cal-nav__month {
  width: 150px;
}

.cal-nav__year {
  width: 110px;
}

.cal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
