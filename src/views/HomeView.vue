<script setup>
import { onMounted, reactive, ref } from 'vue'
import ScheduleCalendar from '../components/ScheduleCalendar.vue'

const calendarRef = ref(null)
const scheduleForm = ref(null)

const dialog = ref(false)
const saving = ref(false)
const serverError = ref('')
const usersError = ref('')
const users = ref([])

const detailsDialog = ref(false)
const selectedSchedule = ref(null)
const detailsError = ref('')

const editing = ref(false)
const editForm = ref(null)
const updating = ref(false)
const actionError = ref('')

const filters = reactive({
  search: '',
  status: '',
  scheduled_date: '',
  assigned_to: null,
})

function applyFilters() {
  calendarRef.value?.loadSchedules(filters)
}

function clearFilters() {
  filters.search = ''
  filters.status = ''
  filters.scheduled_date = ''
  filters.assigned_to = null

  applyFilters()
}
const requiredRule = (value) => !!value || 'This field is required.'

onMounted(async () => {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/users')

    if (!response.ok) {
      throw new Error('Could not load users.')
    }

    const result = await response.json()
    users.value = result.data
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
    const response = await fetch(
      `http://127.0.0.1:8000/api/schedules/${id}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

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

  const validation = await editForm.value.validate()
  if (!validation.valid) return

  if (form.end_time <= form.start_time) {
    actionError.value = 'End time must be later than start time.'
    return
  }

  updating.value = true

  try {
    const id = selectedSchedule.value.id

    const response = await fetch(`http://127.0.0.1:8000/api/schedules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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

    const response = await fetch(
      `http://127.0.0.1:8000/api/schedules/${id}/cancel`,
      {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
      },
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Could not cancel schedule.')
    }

    detailsDialog.value = false
    await calendarRef.value?.loadSchedules(filters)
  } catch (error) {
    actionError.value = error.message
  }
}

async function deleteSchedule() {
  if (!selectedSchedule.value) return
  if (!window.confirm('Permanently delete this schedule?')) return

  actionError.value = ''

  try {
    const id = selectedSchedule.value.id

    const response = await fetch(`http://127.0.0.1:8000/api/schedules/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || 'Could not delete schedule.')
    }

    detailsDialog.value = false
    await calendarRef.value?.loadSchedules(filters)
  } catch (error) {
    actionError.value = error.message
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
    const response = await fetch('http://127.0.0.1:8000/api/schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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
  } catch (error) {
    serverError.value = error.message
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-container class="py-8" fluid>
    <v-row align="center">
      <v-col>
        <h1 class="text-h4 font-weight-bold">
          Scheduling Module
        </h1>

        <p class="text-body-1 text-medium-emphasis mt-2">
          Manage and view your schedules.
        </p>
      </v-col>

      <v-col cols="auto">
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openDialog"
        >
          Create Schedule
        </v-btn>
      </v-col>
    </v-row>

    <v-alert
      v-if="usersError"
      type="warning"
      variant="tonal"
      class="mt-4"
    >
      {{ usersError }}
    </v-alert>

    <v-card class="mt-6 pa-4" width="100%">
      <v-row align="center">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="filters.search"
            label="Search by title"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            @keyup.enter="applyFilters"
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filters.status"
            label="Status"
            :items="['scheduled', 'completed', 'cancelled']"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-text-field
            v-model="filters.scheduled_date"
            label="Date"
            type="date"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-select
            v-model="filters.assigned_to"
            label="Assigned user"
            :items="users"
            item-title="name"
            item-value="id"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="12" md="6" class="d-flex justify-end ga-2">
          <v-btn variant="text" @click="clearFilters">
            Clear
          </v-btn>

          <v-btn color="primary" @click="applyFilters">
            Apply Filters
          </v-btn>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <ScheduleCalendar ref="calendarRef" />
    </v-card>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title class="text-h5 pa-5">
          Create Schedule
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">
          <v-form ref="scheduleForm" @submit.prevent="createSchedule">
            <v-text-field
              v-model="form.title"
              label="Title"
              placeholder="e.g. Team Meeting"
              :rules="[requiredRule]"
              required
            />

            <v-textarea
              v-model="form.description"
              label="Description"
              placeholder="Add schedule details (optional)"
              rows="3"
              auto-grow
            />

            <v-text-field
              v-model="form.scheduled_date"
              label="Date"
              type="date"
              :rules="[requiredRule]"
              required
            />

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.start_time"
                  label="Start Time"
                  type="time"
                  :rules="[requiredRule]"
                  required
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.end_time"
                  label="End Time"
                  type="time"
                  :rules="[requiredRule]"
                  required
                />
              </v-col>
            </v-row>

            <v-select
              v-model="form.assigned_to"
              label="Assign To (optional)"
              :items="users"
              item-title="name"
              item-value="id"
              clearable
            />

            <v-alert
              v-if="serverError"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ serverError }}
            </v-alert>

            <div class="d-flex justify-end ga-2">
              <v-btn
                variant="text"
                :disabled="saving"
                @click="dialog = false"
              >
                Cancel
              </v-btn>

              <v-btn
                color="primary"
                type="submit"
                :loading="saving"
              >
                Save Schedule
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedSchedule">
        <v-card-title class="text-h5 pa-5">
          {{ editing ? 'Edit Schedule' : 'Schedule Details' }}
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">
          <v-form
            v-if="editing"
            ref="editForm"
            @submit.prevent="updateSchedule"
          >
            <v-text-field
              v-model="form.title"
              label="Title"
              :rules="[requiredRule]"
              required
            />

            <v-textarea
              v-model="form.description"
              label="Description"
              rows="3"
              auto-grow
            />

            <v-text-field
              v-model="form.scheduled_date"
              label="Date"
              type="date"
              :rules="[requiredRule]"
              required
            />

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.start_time"
                  label="Start Time"
                  type="time"
                  :rules="[requiredRule]"
                  required
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.end_time"
                  label="End Time"
                  type="time"
                  :rules="[requiredRule]"
                  required
                />
              </v-col>
            </v-row>

            <v-select
              v-model="form.assigned_to"
              label="Assign To (optional)"
              :items="users"
              item-title="name"
              item-value="id"
              clearable
            />

            <v-alert
              v-if="actionError"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ actionError }}
            </v-alert>

            <div class="d-flex justify-end ga-2">
              <v-btn variant="text" :disabled="updating" @click="stopEditing">
                Back
              </v-btn>

              <v-btn color="primary" type="submit" :loading="updating">
                Save Changes
              </v-btn>
            </div>
          </v-form>

          <div v-else>
            <div class="text-h6 mb-2">
              {{ selectedSchedule.title }}
            </div>

            <p class="mb-3">
              {{ selectedSchedule.description || 'No description provided.' }}
            </p>

            <p><strong>Date:</strong> {{ selectedSchedule.scheduled_date }}</p>
            <p>
              <strong>Time:</strong>
              {{ selectedSchedule.start_time }} – {{ selectedSchedule.end_time }}
            </p>
            <p><strong>Status:</strong> {{ selectedSchedule.status }}</p>
            <p>
              <strong>Assigned to:</strong>
              {{ selectedSchedule.assignee?.name || 'Unassigned' }}
            </p>
            <p>
              <strong>Created by:</strong>
              {{ selectedSchedule.creator?.name || 'Unknown' }}
            </p>

            <v-alert
              v-if="actionError"
              type="error"
              variant="tonal"
              class="mt-4"
            >
              {{ actionError }}
            </v-alert>

            <div class="d-flex justify-end flex-wrap ga-2 mt-5">
              <v-btn
                variant="text"
                @click="detailsDialog = false"
              >
                Close
              </v-btn>

              <v-btn
                v-if="selectedSchedule.status !== 'cancelled'"
                color="primary"
                variant="tonal"
                @click="startEditing"
              >
                Edit
              </v-btn>

              <v-btn
                v-if="selectedSchedule.status !== 'cancelled'"
                color="warning"
                variant="tonal"
                @click="cancelSchedule"
              >
                Cancel Schedule
              </v-btn>

              <v-btn
                color="error"
                variant="tonal"
                @click="deleteSchedule"
              >
                Delete
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-alert
      v-if="detailsError"
      type="error"
      variant="tonal"
      class="mt-4"
    >
      {{ detailsError }}
    </v-alert>
  </v-container>
</template>