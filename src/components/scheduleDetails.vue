<script setup>
/* eslint-disable vue/no-mutating-props */
import { computed, ref } from 'vue'

const props = defineProps({
  schedule: { type: Object, required: true },
  editing: { type: Boolean, default: false },
  form: { type: Object, required: true },
  users: { type: Array, default: () => [] },
  requiredRule: { type: Function, required: true },
  actionError: { type: String, default: '' },
  updating: Boolean,
  cancelLoading: Boolean,
  completeLoading: Boolean,
  deleteLoading: Boolean,
  // Only the creator can edit, cancel or delete; the assignee can only complete.
  canManage: { type: Boolean, default: true },
})

const emit = defineEmits(['edit', 'back', 'save', 'cancel', 'complete', 'delete', 'close'])

const editFormRef = ref(null)

const statuses = {
  scheduled: { label: 'Scheduled', color: '#3858e9', bg: '#eaeefe', icon: 'mdi-calendar-clock' },
  completed: { label: 'Completed', color: '#1b7f4b', bg: '#e3f6ec', icon: 'mdi-check-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#b4372f', bg: '#fdeceb', icon: 'mdi-close-circle-outline' },
}

const status = computed(() => statuses[props.schedule.status] ?? statuses.scheduled)
const isScheduled = computed(() => props.schedule.status === 'scheduled')
const busy = computed(
  () => props.updating || props.cancelLoading || props.completeLoading || props.deleteLoading,
)

const assignee = computed(() => {
  const id = props.schedule.assigned_to

  return (
    props.schedule.assignee?.name ??
    (id ? props.users.find((user) => user.id === id)?.name ?? `User #${id}` : null)
  )
})

const creator = computed(() => props.schedule.creator?.name || 'Unknown')

const initials = computed(() =>
  assignee.value
    ? assignee.value
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '',
)

const dateLabel = computed(() =>
  new Date(`${String(props.schedule.scheduled_date).slice(0, 10)}T00:00:00`).toLocaleDateString(
    'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  ),
)

function formatTime(time) {
  if (!time) return ''

  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)

  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const duration = computed(() => {
  const [startH, startM] = props.schedule.start_time.split(':').map(Number)
  const [endH, endM] = props.schedule.end_time.split(':').map(Number)
  const minutes = endH * 60 + endM - (startH * 60 + startM)

  if (!(minutes > 0)) return ''

  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(' ')
})

async function onSave() {
  const validation = await editFormRef.value?.validate()
  if (validation && !validation.valid) return

  emit('save')
}
</script>

<template>
  <v-card theme="light" rounded="xl" class="details-card">
    <!-- Header -->
    <div class="details-head">
      <div class="head-main">
        <span
          class="status-badge"
          :style="{ color: status.color, background: status.bg }"
        >
          <v-icon :icon="status.icon" size="16" />
          {{ status.label }}
        </span>

        <h2 class="details-title">
          {{ editing ? 'Edit schedule' : schedule.title }}
        </h2>
      </div>

      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        title="Close"
        :disabled="busy"
        @click="emit('close')"
      />
    </div>

    <!-- View mode -->
    <template v-if="!editing">
      <v-card-text class="details-body">
        <ul class="info-list">
          <li class="info-row">
            <div class="info-icon">
              <v-icon icon="mdi-calendar-outline" size="20" />
            </div>
            <div>
              <div class="info-label">Date</div>
              <div class="info-value">{{ dateLabel }}</div>
            </div>
          </li>

          <li class="info-row">
            <div class="info-icon">
              <v-icon icon="mdi-clock-outline" size="20" />
            </div>
            <div>
              <div class="info-label">Time</div>
              <div class="info-value">
                {{ formatTime(schedule.start_time) }} – {{ formatTime(schedule.end_time) }}
                <span v-if="duration" class="info-note">({{ duration }})</span>
              </div>
            </div>
          </li>

          <li class="info-row">
            <div class="info-icon">
              <v-icon icon="mdi-account-outline" size="20" />
            </div>
            <div>
              <div class="info-label">Assigned to</div>

              <div v-if="assignee" class="info-value d-flex align-center ga-2">
                <span class="avatar">{{ initials }}</span>
                {{ assignee }}
              </div>

              <div v-else class="info-value info-value--muted">Unassigned</div>
            </div>
          </li>

          <li class="info-row">
            <div class="info-icon">
              <v-icon icon="mdi-account-edit-outline" size="20" />
            </div>
            <div>
              <div class="info-label">Created by</div>
              <div class="info-value">{{ creator }}</div>
            </div>
          </li>
        </ul>

        <div class="description">
          <div class="info-label">Description</div>

          <p v-if="schedule.description" class="description-text">
            {{ schedule.description }}
          </p>

          <p v-else class="description-text info-value--muted">
            No description added.
          </p>
        </div>

        <v-alert
          v-if="actionError"
          type="error"
          variant="tonal"
          density="comfortable"
          rounded="lg"
          class="mt-4"
        >
          {{ actionError }}
        </v-alert>
      </v-card-text>

      <div class="details-actions">
        <v-btn
          v-if="canManage"
          icon="mdi-delete-outline"
          color="error"
          variant="text"
          title="Delete schedule"
          :loading="deleteLoading"
          :disabled="busy && !deleteLoading"
          @click="emit('delete')"
        />

        <v-spacer />

        <v-btn
          v-if="isScheduled && canManage"
          variant="text"
          rounded="lg"
          class="text-none"
          :loading="cancelLoading"
          :disabled="busy && !cancelLoading"
          @click="emit('cancel')"
        >
          Cancel schedule
        </v-btn>

        <v-btn
          v-if="!isScheduled"
          variant="tonal"
          rounded="lg"
          class="text-none"
          :disabled="busy"
          @click="emit('close')"
        >
          Close
        </v-btn>

        <v-btn
          v-if="isScheduled && canManage"
          variant="tonal"
          rounded="lg"
          prepend-icon="mdi-pencil-outline"
          class="text-none"
          :disabled="busy"
          @click="emit('edit')"
        >
          Edit
        </v-btn>

        <v-btn
          v-if="isScheduled"
          color="primary"
          rounded="lg"
          elevation="0"
          prepend-icon="mdi-check"
          class="text-none font-weight-semibold"
          :loading="completeLoading"
          :disabled="busy && !completeLoading"
          @click="emit('complete')"
        >
          Mark as complete
        </v-btn>
      </div>
    </template>

    <!-- Edit mode -->
    <v-form v-else ref="editFormRef" @submit.prevent="onSave">
      <v-card-text class="details-body">
        <v-text-field
          v-model="form.title"
          label="Title"
          variant="outlined"
          rounded="lg"
          :rules="[requiredRule]"
        />

        <v-textarea
          v-model="form.description"
          label="Description (optional)"
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
          v-if="actionError"
          type="error"
          variant="tonal"
          density="comfortable"
          rounded="lg"
        >
          {{ actionError }}
        </v-alert>
      </v-card-text>

      <div class="details-actions">
        <v-spacer />

        <v-btn
          variant="text"
          rounded="lg"
          class="text-none"
          :disabled="updating"
          @click="emit('back')"
        >
          Back
        </v-btn>

        <v-btn
          color="primary"
          type="submit"
          rounded="lg"
          elevation="0"
          class="text-none font-weight-semibold px-6"
          :loading="updating"
        >
          Save changes
        </v-btn>
      </div>
    </v-form>
  </v-card>
</template>

<style scoped>
/* Dialogs render outside the page root, so the tokens live on the card. */
.details-card {
  --ink: #17202e;
  --muted: #647084;
  --line: #e6eaf0;
  --paper: #f4f6fa;
  --accent: #3858e9;
  --accent-soft: #eaeefe;

  color: var(--ink);
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  overflow: hidden;
}

.details-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 8px;
}

.head-main {
  min-width: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.details-title {
  margin-top: 10px;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.details-body {
  padding: 12px 24px 8px;
}

/* Info rows */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  margin: 8px 0 20px;
  list-style: none;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.info-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
}

.info-label {
  font-size: 0.8rem;
  color: var(--muted);
}

.info-value {
  margin-top: 1px;
  font-weight: 600;
}

.info-value--muted {
  font-weight: 400;
  color: var(--muted);
}

.info-note {
  font-weight: 400;
  color: var(--muted);
}

.avatar {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

/* Description */
.description {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--paper);
}

.description-text {
  margin-top: 4px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.55;
}

/* Actions */
.details-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 14px 24px 20px;
  border-top: 1px solid var(--line);
  margin-top: 8px;
}

@media (max-width: 480px) {
  .details-head,
  .details-body,
  .details-actions {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
