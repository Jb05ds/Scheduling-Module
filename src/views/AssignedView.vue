<script setup>
/* "Assigned by me": schedules I created for other people.
   They show on the assignee's calendar, not mine. */
import { computed, onMounted, reactive, ref } from 'vue'

import '../assets/schedule-page.css'

import ScheduleHeader from '../components/ScheduleHeader.vue'
import ScheduleFilters from '../components/ScheduleFilters.vue'
import ScheduleCalendar from '../components/ScheduleCalendar.vue'
import ScheduleDetails from '../components/scheduleDetails.vue'
import CreateScheduleDialog from '../components/CreateScheduleDialog.vue'

import { apiFetch } from '../services/api'
import { getCurrentUser } from '../services/auth'
import { useScheduleActions } from '../composables/useScheduleActions'
import { useUpcomingSchedules } from '../composables/useUpcomingSchedules'
import {
  dayNumber,
  formatTime,
  initialsOf,
  monthShort,
  relativeDay,
} from '../utils/scheduleFormat'

const me = getCurrentUser()

const calendarRef = ref(null)
const createDialog = ref(false)
const users = ref([])
const usersError = ref('')

const filters = reactive({
  search: '',
  status: '',
  assigned_to: null,
})

// Everyone except me, since a schedule for myself belongs on "My calendar".
const otherUsers = computed(() => users.value.filter((user) => user.id !== me?.id))

const { upcoming, loadUpcoming } = useUpcomingSchedules('assigned', 8)

async function refresh() {
  await calendarRef.value?.loadSchedules(filters)
  loadUpcoming()
}

const {
  detailsDialog,
  selectedSchedule,
  detailsError,
  editing,
  form,
  updating,
  actionError,
  cancelLoading,
  completeLoading,
  deleteLoading,
  canManage,
  showScheduleDetails,
  startEditing,
  stopEditing,
  updateSchedule,
  cancelSchedule,
  completeSchedule,
  deleteSchedule,
} = useScheduleActions(refresh)

function applyFilters() {
  calendarRef.value?.loadSchedules(filters)
}

function clearFilters() {
  filters.search = ''
  filters.status = ''
  filters.assigned_to = null
  applyFilters()
}

const requiredRule = (value) => !!value || 'This field is required.'

onMounted(async () => {
  loadUpcoming()

  try {
    const response = await apiFetch('/users')

    if (!response.ok) {
      throw new Error('Could not load users.')
    }

    users.value = (await response.json()).data
  } catch (error) {
    usersError.value = 'Could not load users, so you can not assign schedules right now.'
    console.error(error)
  }
})
</script>

<template>
  <div class="schedule-page">
    <v-container class="sch-container" fluid>
      <ScheduleHeader />

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

      <ScheduleFilters
        :filters="filters"
        :users="otherUsers"
        show-assignee
        assignee-label="Assigned to"
        @apply="applyFilters"
        @clear="clearFilters"
      />

      <v-row class="mt-2">
        <v-col cols="12" lg="8">
          <section class="sch-panel h-100">
            <div class="sch-panel-head">
              <div>
                <h2 class="sch-panel-title">Assigned by me</h2>
                <p class="sch-panel-sub">
                  Schedules you created for other people. They appear on their calendar, not yours.
                </p>
              </div>
            </div>

            <ScheduleCalendar
              ref="calendarRef"
              scope="assigned"
              @schedule-clicked="showScheduleDetails"
            >
              <template #actions>
                <v-btn
                  color="primary"
                  rounded="lg"
                  elevation="0"
                  prepend-icon="mdi-account-arrow-right-outline"
                  class="text-none font-weight-semibold"
                  @click="createDialog = true"
                >
                  Assign schedule
                </v-btn>
              </template>
            </ScheduleCalendar>
          </section>
        </v-col>

        <v-col cols="12" lg="4">
          <section class="sch-panel h-100">
            <div class="sch-panel-head">
              <div>
                <h2 class="sch-panel-title">Upcoming assignments</h2>
                <p class="sch-panel-sub">Delete one here if it's no longer needed.</p>
              </div>

              <v-chip size="small" color="primary" variant="flat">
                {{ upcoming.length }}
              </v-chip>
            </div>

            <div v-if="upcoming.length" class="sch-upcoming-list">
              <div
                v-for="schedule in upcoming"
                :key="schedule.id"
                class="sch-upcoming-item"
                role="button"
                tabindex="0"
                @click="showScheduleDetails(schedule.id)"
                @keydown.enter.self="showScheduleDetails(schedule.id)"
              >
                <div class="sch-date-tile">
                  <span class="sch-date-tile__day">{{ dayNumber(schedule.scheduled_date) }}</span>
                  <span class="sch-date-tile__month">{{ monthShort(schedule.scheduled_date) }}</span>
                </div>

                <div class="sch-upcoming-body">
                  <div class="sch-upcoming-title">{{ schedule.title }}</div>

                  <div class="sch-upcoming-meta">
                    <v-icon icon="mdi-clock-outline" size="15" />
                    {{ relativeDay(schedule.scheduled_date) }},
                    {{ formatTime(schedule.start_time) }} – {{ formatTime(schedule.end_time) }}
                  </div>

                  <div v-if="schedule.assignee" class="sch-upcoming-meta">
                    <span class="sch-avatar">{{ initialsOf(schedule.assignee.name) }}</span>
                    {{ schedule.assignee.name }}
                  </div>
                </div>

                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  color="error"
                  title="Delete schedule"
                  :disabled="deleteLoading"
                  @click.stop="deleteSchedule(schedule.id)"
                />
              </div>
            </div>

            <div v-else class="sch-empty">
              <div class="sch-empty__icon">
                <v-icon icon="mdi-account-arrow-right-outline" size="32" />
              </div>

              <div class="sch-empty__title">Nothing assigned yet</div>
              <p class="sch-empty__text">
                Schedules you assign to other people will be listed here.
              </p>

              <v-btn
                color="primary"
                variant="tonal"
                rounded="lg"
                prepend-icon="mdi-plus"
                class="text-none mt-4"
                @click="createDialog = true"
              >
                Assign schedule
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

    <CreateScheduleDialog
      v-model="createDialog"
      mode="assign"
      :users="users"
      @created="refresh"
    />

    <v-dialog v-model="detailsDialog" max-width="600">
      <ScheduleDetails
        v-if="selectedSchedule"
        :schedule="selectedSchedule"
        :editing="editing"
        :form="form"
        :users="otherUsers"
        :required-rule="requiredRule"
        :action-error="actionError"
        :updating="updating"
        :cancel-loading="cancelLoading"
        :complete-loading="completeLoading"
        :delete-loading="deleteLoading"
        :can-manage="canManage"
        @edit="startEditing"
        @back="stopEditing"
        @save="updateSchedule"
        @cancel="cancelSchedule"
        @complete="completeSchedule"
        @delete="deleteSchedule()"
        @close="detailsDialog = false"
      />
    </v-dialog>
  </div>
</template>
