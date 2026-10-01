<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScheduleCalendar from '../components/ScheduleCalendar.vue'
import ScheduleDetails from '../components/scheduleDetails.vue'
import { apiFetch } from '../services/api'

const router = useRouter()

const calendarRef = ref(null)
const scheduleForm = ref(null)

const upcomingSchedules = ref([])

const dialog = ref(false)
const saving = ref(false)
const serverError = ref('')
const usersError = ref('')
const users = ref([])

const detailsDialog = ref(false)
const selectedSchedule = ref(null)
const detailsError = ref('')

const editing = ref(false)
const updating = ref(false)
const actionError = ref('')
const cancelLoading = ref(false)
const completeLoading = ref(false)
const deleteLoading = ref(false)

const form = reactive({
  title: '',
  description: '',
  scheduled_date: '',
  start_time: '',
  end_time: '',
  assigned_to: null,
})

const filters = reactive({
  search: '',
  status: '',
  assigned_to: null,
})

const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const activeFilterCount = computed(
  () => Object.values(filters).filter((value) => value !== '' && value !== null && value !== undefined).length,
)

const statusItems = [
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' },
]


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

function jumpToMonth() {
  if (!viewYear.value || !viewMonth.value) return

  const month = String(viewMonth.value).padStart(2, '0')
  calendarRef.value?.gotoDate(`${viewYear.value}-${month}-01`)
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
  calendarRef.value?.goToToday()

  const now = new Date()
  viewMonth.value = now.getMonth() + 1
  viewYear.value = now.getFullYear()
}

function onCalendarMonthChange({ year, month }) {
  viewYear.value = year
  viewMonth.value = month
}

function applyFilters() {
  calendarRef.value?.loadSchedules(filters)
}

function clearFilters() {
  filters.search = ''
  filters.status = ''
  filters.assigned_to = null

  applyFilters()
}


const toDate = (date) => new Date(`${String(date).slice(0, 10)}T00:00:00`)

function formatDate(date) {
  if (!date) return ''

  return toDate(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(time) {
  if (!time) return ''

  const [hours, minutes] = time.split(':')

  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const dayNumber = (date) => toDate(date).getDate()

const monthShort = (date) =>
  toDate(date).toLocaleDateString('en-US', { month: 'short' })

function relativeDay(date) {
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

function userName(id) {
  return users.value.find((user) => user.id === id)?.name ?? `User #${id}`
}


async function loadUpcomingSchedules() {
  try {
    const response = await apiFetch('/schedules?status=scheduled')

    if (!response.ok) {
      return
    }

    const result = await response.json()

    const schedules = result.data || []

    const now = new Date()

    upcomingSchedules.value = schedules
      .filter((schedule) => {
        const scheduleDateTime = new Date(
          `${schedule.scheduled_date}T${schedule.start_time}`
        )

        return scheduleDateTime >= now
      })
      .sort((a, b) => {
        const dateA = new Date(
          `${a.scheduled_date}T${a.start_time}`
        )

        const dateB = new Date(
          `${b.scheduled_date}T${b.start_time}`
        )

        return dateA - dateB
      })
      .slice(0, 5)

  } catch (error) {
    console.error('Failed to load upcoming schedules:', error)
  }
}

async function logout() {
  try {
    await apiFetch('/logout', {
      method: 'POST',
    })
  } catch (error) {
    console.error('Logout request failed:', error)
  } finally {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    router.push('/login')
  }
}

const requiredRule = (value) => !!value || 'This field is required.'

onMounted(async () => {
  try {
    const response = await apiFetch('/users')

    if (!response.ok) {
      throw new Error('Could not load users.')
    }

    const result = await response.json()
    users.value = result.data

    loadUpcomingSchedules()
  } catch (error) {
    usersError.value = 'Could not load users. You can still create an unassigned schedule.'
    console.error(error)
  }
})

function openDialog() {
  serverError.value = ''
  dialog.value = true
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.scheduled_date = ''
  form.start_time = ''
  form.end_time = ''
  form.assigned_to = null
}

async function showScheduleDetails(id) {
  detailsError.value = ''
  selectedSchedule.value = null

  try {
    const response = await apiFetch(`/schedules/${id}`)

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Could not load schedule details.')
    }

    selectedSchedule.value = result.data
    detailsDialog.value = true
  } catch (error) {
    detailsError.value = error.message
    console.error(error)
  }
}

function startEditing() {
  if (!selectedSchedule.value) return

  actionError.value = ''
  editing.value = true

  Object.assign(form, {
    title: selectedSchedule.value.title,
    description: selectedSchedule.value.description || '',
    scheduled_date: selectedSchedule.value.scheduled_date.slice(0, 10),
    start_time: selectedSchedule.value.start_time.slice(0, 5),
    end_time: selectedSchedule.value.end_time.slice(0, 5),
    assigned_to: selectedSchedule.value.assigned_to ?? null,
  })
}

function stopEditing() {
  editing.value = false
  actionError.value = ''
}

async function updateSchedule() {
  actionError.value = ''

  if (form.end_time <= form.start_time) {
    actionError.value = 'End time must be later than start time.'
    return
  }

  updating.value = true

  try {
    const id = selectedSchedule.value.id

    const response = await apiFetch(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        scheduled_date: form.scheduled_date,
        start_time: form.start_time,
        end_time: form.end_time,
        assigned_to: form.assigned_to,
        status: selectedSchedule.value.status,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      const messages = result.errors
        ? Object.values(result.errors).flat().join(' ')
        : ''

      throw new Error(messages || result.message || 'Could not update schedule.')
    }

    selectedSchedule.value = result.data
    editing.value = false
    await calendarRef.value?.loadSchedules(filters)
  } catch (error) {
    actionError.value = error.message
  } finally {
    updating.value = false
  }
}

async function cancelSchedule() {
  if (!selectedSchedule.value) return
  if (!window.confirm('Cancel this schedule?')) return

  actionError.value = ''

  try {
    const id = selectedSchedule.value.id

    cancelLoading.value = true

    const response = await apiFetch(`/schedules/${id}/cancel`, {
      method: 'PATCH',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Could not cancel schedule.')
    }

    detailsDialog.value = false
    await calendarRef.value?.loadSchedules(filters)
  } catch (error) {
    actionError.value = error.message
  } finally {
    cancelLoading.value = false
  }
}

async function completeSchedule() {
  if (!selectedSchedule.value) return
  if (!window.confirm('Complete this schedule?')) return

  actionError.value = ''

  try {
    const id = selectedSchedule.value.id

    completeLoading.value = true

    const response = await apiFetch(`/schedules/${id}/complete`, {
      method: 'PATCH',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Could not complete schedule.')
    }

    detailsDialog.value = false
    await calendarRef.value?.loadSchedules(filters)
  } catch (error) {
    actionError.value = error.message
  } finally {
    completeLoading.value = false
  }
}

async function deleteSchedule() {
  if (!selectedSchedule.value) return
  if (!window.confirm('Permanently delete this schedule?')) return

  actionError.value = ''

  try {
    const id = selectedSchedule.value.id

    deleteLoading.value = true

    const response = await apiFetch(`/schedules/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || 'Could not delete schedule.')
    }

    detailsDialog.value = false
    await calendarRef.value?.loadSchedules(filters)
  } catch (error) {
    actionError.value = error.message
  } finally {
    deleteLoading.value = false
  }
}

async function createSchedule() {
  serverError.value = ''

  const validation = await scheduleForm.value.validate()

  if (!validation.valid) {
    return
  }

  if (form.end_time <= form.start_time) {
    serverError.value = 'End time must be later than start time.'
    return
  }

  saving.value = true

  try {
    const response = await apiFetch('/schedules', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        scheduled_date: form.scheduled_date,
        start_time: form.start_time,
        end_time: form.end_time,
        assigned_to: form.assigned_to,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      const validationMessages = result.errors
        ? Object.values(result.errors).flat().join(' ')
        : ''

      throw new Error(
        validationMessages || result.message || 'Could not create the schedule.',
      )
    }

    dialog.value = false
    resetForm()

    await calendarRef.value?.loadSchedules(filters)
    loadUpcomingSchedules()
  } catch (error) {
    serverError.value = error.message
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="schedule-page">
    <v-container class="page-container" fluid>
      <header class="page-header">
        <div class="d-flex align-center ga-4">
          <div class="brand-mark">
            <v-icon icon="mdi-calendar-clock" size="26" />
          </div>

          <div>
            <h1 class="page-title">Schedules</h1>
            <p class="page-subtitle">{{ todayLabel }}</p>
          </div>
        </div>

        <v-theme-provider theme="light">
          <v-btn
            color="error"
            variant="outlined"
            size="large"
            rounded="lg"
            prepend-icon="mdi-logout"
            class="text-none font-weight-semibold"
            @click="logout"
          >
            Log out
          </v-btn>
        </v-theme-provider>
      </header>

      <v-alert
        v-if="usersError"
        type="warning"
        variant="tonal"
        density="comfortable"
        rounded="lg"
        class="mb-4"
        closable
      >
        {{ usersError }}
      </v-alert>

      <v-theme-provider theme="light">
      <section class="panel filters">
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.search"
              placeholder="Search by title"
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              flat
              rounded="lg"
              density="comfortable"
              hide-details
              clearable
              @keyup.enter="applyFilters"
            />
          </v-col>

          <v-col cols="6" md="3">
            <v-select
              v-model="filters.status"
              placeholder="Status"
              :items="statusItems"
              prepend-inner-icon="mdi-flag-outline"
              variant="solo-filled"
              flat
              rounded="lg"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>

          <v-col cols="6" md="3">
            <v-select
              v-model="filters.assigned_to"
              placeholder="Assigned to"
              :items="users"
              item-title="name"
              item-value="id"
              prepend-inner-icon="mdi-account-outline"
              variant="solo-filled"
              flat
              rounded="lg"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>

          <v-col cols="12" md="2" class="d-flex justify-end ga-1">
            <v-btn
              v-if="activeFilterCount"
              variant="text"
              rounded="lg"
              class="text-none"
              @click="clearFilters"
            >
              Clear ({{ activeFilterCount }})
            </v-btn>

            <v-btn
              color="primary"
              variant="tonal"
              rounded="lg"
              class="text-none font-weight-semibold"
              @click="applyFilters"
            >
              Apply
            </v-btn>
          </v-col>
        </v-row>
      </section>
      </v-theme-provider>

      <v-row class="mt-2">
        <v-col cols="12" lg="8">
          <section class="panel h-100">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Calendar</h2>
                <p class="panel-sub">Select a schedule to view or edit it.</p>
              </div>

              <v-theme-provider theme="light">
                <div class="month-nav">
                  <v-select
                    :model-value="viewMonth"
                    :items="monthItems"
                    aria-label="Month"
                    variant="solo-filled"
                    flat
                    rounded="lg"
                    density="comfortable"
                    hide-details
                    class="month-nav__month"
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
                    class="month-nav__year"
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

                  <v-btn
                    color="primary"
                    rounded="lg"
                    elevation="0"
                    prepend-icon="mdi-plus"
                    class="text-none font-weight-semibold"
                    @click="openDialog"
                  >
                    New schedule
                  </v-btn>
                </div>
              </v-theme-provider>
            </div>

            <ScheduleCalendar
              ref="calendarRef"
              @schedule-clicked="showScheduleDetails"
              @month-changed="onCalendarMonthChange"
            />
          </section>
        </v-col>

        <v-col cols="12" lg="4">
          <section class="panel h-100">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Up next</h2>
                <p class="panel-sub">Your next scheduled activities.</p>
              </div>

              <v-chip size="small" color="primary" variant="flat">
                {{ upcomingSchedules.length }}
              </v-chip>
            </div>

            <div v-if="upcomingSchedules.length" class="upcoming-list">
              <button
                v-for="(schedule, index) in upcomingSchedules"
                :key="schedule.id"
                type="button"
                class="upcoming-item"
                :class="{ 'is-next': index === 0 }"
                @click="showScheduleDetails(schedule.id)"
              >
                <div class="date-tile">
                  <span class="date-tile__day">{{ dayNumber(schedule.scheduled_date) }}</span>
                  <span class="date-tile__month">{{ monthShort(schedule.scheduled_date) }}</span>
                </div>

                <div class="upcoming-body">
                  <div class="upcoming-title">{{ schedule.title }}</div>

                  <div class="upcoming-meta">
                    <v-icon icon="mdi-clock-outline" size="15" />
                    {{ relativeDay(schedule.scheduled_date) }},
                    {{ formatTime(schedule.start_time) }} – {{ formatTime(schedule.end_time) }}
                  </div>

                  <div v-if="schedule.assigned_to" class="upcoming-meta">
                    <v-icon icon="mdi-account-outline" size="15" />
                    {{ userName(schedule.assigned_to) }}
                  </div>
                </div>

                <v-icon icon="mdi-chevron-right" size="20" class="upcoming-chevron" />
              </button>
            </div>

            <div v-else class="empty-state">
              <div class="empty-state__icon">
                <v-icon icon="mdi-calendar-check-outline" size="32" />
              </div>

              <div class="empty-state__title">Nothing coming up</div>
              <p class="empty-state__text">
                Create a schedule and it will show up here.
              </p>

              <v-btn
                color="primary"
                variant="tonal"
                rounded="lg"
                prepend-icon="mdi-plus"
                class="text-none mt-4"
                @click="openDialog"
              >
                New schedule
              </v-btn>
            </div>
          </section>
        </v-col>
      </v-row>

      <v-alert
        v-if="detailsError"
        type="error"
        variant="tonal"
        rounded="lg"
        class="mt-4"
        closable
        @click:close="detailsError = ''"
      >
        {{ detailsError }}
      </v-alert>
    </v-container>

    <v-dialog v-model="dialog" max-width="560" scrollable>
      <v-card theme="light" rounded="xl" class="dialog-card">
        <div class="dialog-head">
          <div class="brand-mark brand-mark--sm">
            <v-icon icon="mdi-calendar-plus" size="20" />
          </div>

          <div class="flex-grow-1">
            <h2 class="dialog-title">New schedule</h2>
            <p class="panel-sub">Add the details for this activity.</p>
          </div>

          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="saving"
            @click="dialog = false"
          />
        </div>

        <v-card-text class="px-6 pb-2">
          <v-form ref="scheduleForm" @submit.prevent="createSchedule">
            <v-text-field
              v-model="form.title"
              label="Title"
              placeholder="e.g. Team meeting"
              variant="outlined"
              rounded="lg"
              :rules="[requiredRule]"
              required
            />

            <v-textarea
              v-model="form.description"
              label="Description (optional)"
              placeholder="Add any details"
              variant="outlined"
              rounded="lg"
              rows="3"
              auto-grow
            />

            <v-text-field
              v-model="form.scheduled_date"
              label="Date"
              type="date"
              variant="outlined"
              rounded="lg"
              :rules="[requiredRule]"
              required
            />

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.start_time"
                  label="Start time"
                  type="time"
                  variant="outlined"
                  rounded="lg"
                  :rules="[requiredRule]"
                  required
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.end_time"
                  label="End time"
                  type="time"
                  variant="outlined"
                  rounded="lg"
                  :rules="[requiredRule]"
                  required
                />
              </v-col>
            </v-row>

            <v-select
              v-model="form.assigned_to"
              label="Assign to (optional)"
              :items="users"
              item-title="name"
              item-value="id"
              variant="outlined"
              rounded="lg"
              clearable
            />

            <v-alert
              v-if="serverError"
              type="error"
              variant="tonal"
              density="comfortable"
              rounded="lg"
              class="mb-2"
            >
              {{ serverError }}
            </v-alert>

            <div class="d-flex justify-end ga-2 py-4">
              <v-btn
                variant="text"
                rounded="lg"
                class="text-none"
                :disabled="saving"
                @click="dialog = false"
              >
                Cancel
              </v-btn>

              <v-btn
                color="primary"
                type="submit"
                rounded="lg"
                elevation="0"
                class="text-none font-weight-semibold px-6"
                :loading="saving"
              >
                Save schedule
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="detailsDialog" max-width="600">
      <ScheduleDetails
        v-if="selectedSchedule"
        :schedule="selectedSchedule"
        :editing="editing"
        :form="form"
        :users="users"
        :required-rule="requiredRule"
        :action-error="actionError"
        :updating="updating"
        :cancel-loading="cancelLoading"
        :complete-loading="completeLoading"
        :delete-loading="deleteLoading"
        @edit="startEditing"
        @back="stopEditing"
        @save="updateSchedule"
        @cancel="cancelSchedule"
        @complete="completeSchedule"
        @delete="deleteSchedule"
        @close="detailsDialog = false"
      />
    </v-dialog>
  </div>
</template>

<style scoped>
.schedule-page {
  --ink: #17202e;
  --muted: #647084;
  --line: #e6eaf0;
  --paper: #f4f6fa;
  --surface: #ffffff;
  --accent: #3858e9;
  --accent-soft: #eaeefe;

  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.page-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 28px 48px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 6px 16px rgba(56, 88, 233, 0.28);
}

.brand-mark--sm {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  box-shadow: none;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.page-subtitle {
  margin-top: 2px;
  font-size: 0.95rem;
  color: var(--muted);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(23, 32, 46, 0.04);
}

.filters {
  padding: 14px 16px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.month-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.month-nav__month {
  width: 150px;
}

.month-nav__year {
  width: 110px;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.panel-sub {
  margin-top: 2px;
  font-size: 0.875rem;
  color: var(--muted);
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 12px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.upcoming-item:hover {
  border-color: #c7d1f8;
  box-shadow: 0 6px 18px rgba(56, 88, 233, 0.1);
}

.upcoming-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.upcoming-item.is-next {
  background: var(--accent-soft);
  border-color: #c7d1f8;
}

.date-tile {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 56px;
  border-radius: 12px;
  background: var(--paper);
  line-height: 1;
}

.is-next .date-tile {
  background: var(--accent);
  color: #fff;
}

.date-tile__day {
  font-size: 1.35rem;
  font-weight: 700;
}

.date-tile__month {
  margin-top: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.75;
}

.upcoming-body {
  flex: 1;
  min-width: 0;
}

.upcoming-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  font-size: 0.82rem;
  color: var(--muted);
}

.upcoming-chevron {
  flex: none;
  color: var(--muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 16px;
}

.empty-state__icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 14px;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--accent);
}

.empty-state__title {
  font-weight: 700;
}

.empty-state__text {
  margin-top: 4px;
  max-width: 220px;
  font-size: 0.875rem;
  color: var(--muted);
}

.dialog-card {
  --ink: #17202e;
  --muted: #647084;
  --accent: #3858e9;
  --accent-soft: #eaeefe;

  overflow: hidden;
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.dialog-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px 12px;
}

.dialog-title {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

@media (max-width: 600px) {
  .page-container {
    padding: 20px 14px 32px;
  }

  .page-title {
    font-size: 1.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .upcoming-item {
    transition: none;
  }
}
</style>