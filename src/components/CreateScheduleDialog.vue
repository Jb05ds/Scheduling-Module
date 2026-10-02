<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { apiFetch } from '../services/api'
import { getCurrentUser } from '../services/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  users: { type: Array, default: () => [] },
  // 'personal' = only for me (no assignee), 'assign' = hand it to someone else
  mode: { type: String, default: 'personal' },
})

const emit = defineEmits(['update:modelValue', 'created'])

const formRef = ref(null)
const saving = ref(false)
const serverError = ref('')

const form = reactive({
  title: '',
  description: '',
  scheduled_date: '',
  start_time: '',
  end_time: '',
  assigned_to: null,
})

const isAssign = computed(() => props.mode === 'assign')

const dialogTitle = computed(() => (isAssign.value ? 'Assign a schedule' : 'New schedule'))
const dialogSub = computed(() =>
  isAssign.value
    ? 'It appears on their calendar, not yours.'
    : 'Only you can see this schedule.',
)

// You can't assign a schedule to yourself — that's just a personal one.
const assignableUsers = computed(() => {
  const me = getCurrentUser()
  return props.users.filter((user) => user.id !== me?.id)
})

const requiredRule = (value) => !!value || 'This field is required.'

function resetForm() {
  Object.assign(form, {
    title: '',
    description: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    assigned_to: null,
  })
  serverError.value = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  serverError.value = ''

  const validation = await formRef.value.validate()
  if (!validation.valid) return

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
        assigned_to: isAssign.value ? form.assigned_to : null,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      const messages = result.errors
        ? Object.values(result.errors).flat().join(' ')
        : ''

      throw new Error(messages || result.message || 'Could not create the schedule.')
    }

    close()
    emit('created')
  } catch (error) {
    serverError.value = error.message
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card theme="light" rounded="xl" class="dialog-card">
      <div class="dialog-head">
        <div class="brand-mark">
          <v-icon :icon="isAssign ? 'mdi-account-arrow-right-outline' : 'mdi-calendar-plus'" size="20" />
        </div>

        <div class="flex-grow-1">
          <h2 class="dialog-title">{{ dialogTitle }}</h2>
          <p class="dialog-sub">{{ dialogSub }}</p>
        </div>

        <v-btn icon="mdi-close" variant="text" size="small" :disabled="saving" @click="close" />
      </div>

      <v-card-text class="px-6 pb-2">
        <v-form ref="formRef" @submit.prevent="submit">
          <v-select
            v-if="isAssign"
            v-model="form.assigned_to"
            label="Assign to"
            :items="assignableUsers"
            item-title="name"
            item-value="id"
            variant="outlined"
            rounded="lg"
            :rules="[requiredRule]"
          />

          <v-text-field
            v-model="form.title"
            label="Title"
            placeholder="e.g. Team meeting"
            variant="outlined"
            rounded="lg"
            :rules="[requiredRule]"
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
            <v-btn variant="text" rounded="lg" class="text-none" :disabled="saving" @click="close">
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
              {{ isAssign ? 'Assign schedule' : 'Save schedule' }}
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Dialogs render outside the page root, so the tokens live on the card. */
.dialog-card {
  --ink: #17202e;
  --muted: #647084;
  --accent: #3858e9;

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

.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
}

.dialog-title {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.dialog-sub {
  margin-top: 2px;
  font-size: 0.875rem;
  color: var(--muted);
}
</style>
