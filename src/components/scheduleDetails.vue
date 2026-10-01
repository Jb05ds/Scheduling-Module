<script setup>
const props = defineProps({
  schedule: {
    type: Object,
    required: true,
  },
  editing: {
    type: Boolean,
    default: false,
  },
  form: {
    type: Object,
    required: true,
  },
  users: {
    type: Array,
    default: () => [],
  },
  requiredRule: {
    type: Function,
    required: true,
  },
  actionError: {
    type: String,
    default: '',
  },
  updating: {
    type: Boolean,
    default: false,
  },
  cancelLoading: {
    type: Boolean,
    default: false,
  },
  completeLoading: {
    type: Boolean,
    default: false,
  },
  deleteLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'edit',
  'back',
  'save',
  'cancel',
  'complete',
  'delete',
  'close',
])

function formatDate(date) {
  if (!date) return ''

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
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
</script>

<template>
  <v-card>
    <v-card-title class="text-h5 pa-5">
      {{ editing ? 'Edit Schedule' : 'Schedule Details' }}
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-5">
      <v-form
        v-if="editing"
        @submit.prevent="emit('save')"
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
          <v-btn
            variant="text"
            :disabled="updating"
            @click="emit('back')"
          >
            Back
          </v-btn>

          <v-btn
            color="primary"
            type="submit"
            :loading="updating"
          >
            Save Changes
          </v-btn>
        </div>
      </v-form>

      <div v-else>
        <div class="text-h6 mb-2">
          {{ schedule.title }}
        </div>

        <p class="mb-3">
          {{ schedule.description || 'No description provided.' }}
        </p>

        <p>
          <strong>Date:</strong>
          {{ formatDate(schedule.scheduled_date) }}
        </p>

        <p>
          <strong>Time:</strong>
          {{ formatTime(schedule.start_time) }} –
          {{ formatTime(schedule.end_time) }}
        </p>

        <div class="mb-4 d-flex align-center">
          <strong class="mr-2">Status:</strong>

          <v-chip
            size="small"
            :color="
              schedule.status === 'scheduled'
                ? 'primary'
                : schedule.status === 'completed'
                  ? 'success'
                  : 'error'
            "
            variant="tonal"
          >
            {{
              schedule.status === 'scheduled'
                ? 'Scheduled'
                : schedule.status === 'completed'
                  ? 'Completed'
                  : 'Cancelled'
            }}
          </v-chip>
        </div>

        <p>
          <strong>Assigned to:</strong>
          {{ schedule.assignee?.name || 'Unassigned' }}
        </p>

        <p>
          <strong>Created by:</strong>
          {{ schedule.creator?.name || 'Unknown' }}
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
            @click="emit('close')"
          >
            Close
          </v-btn>

          <v-btn
            v-if="schedule.status !== 'cancelled' && schedule.status !== 'completed'"
            color="primary"
            variant="tonal"
            @click="emit('edit')"
          >
            Edit
          </v-btn>

          <v-btn
            v-if="schedule.status !== 'cancelled' && schedule.status !== 'completed'"
            color="warning"
            variant="tonal"
            :loading="cancelLoading"
            @click="emit('cancel')"
          >
            Cancel Schedule
          </v-btn>

          <v-btn
            v-if="schedule.status !== 'completed' && schedule.status !== 'cancelled'"
            color="primary"
            variant="tonal"
            :loading="completeLoading"
            @click="emit('complete')"
          >
            Complete
          </v-btn>

          <v-btn
            color="error"
            variant="tonal"
            :loading="deleteLoading"
            @click="emit('delete')"
          >
            Delete
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>