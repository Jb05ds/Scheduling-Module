<script setup>
/* eslint-disable vue/no-mutating-props */
import { computed } from 'vue'

const props = defineProps({
  filters: { type: Object, required: true },
  users: { type: Array, default: () => [] },
  showAssignee: { type: Boolean, default: false },
  assigneeLabel: { type: String, default: 'Assigned to' },
})

const emit = defineEmits(['apply', 'clear'])

const statusItems = [
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' },
]

const activeCount = computed(
  () => Object.values(props.filters).filter((value) => value !== '' && value !== null && value !== undefined).length,
)
</script>

<template>
  <v-theme-provider theme="light">
    <section class="filters-bar">
      <v-row dense align="center">
        <v-col cols="12" :md="showAssignee ? 4 : 6">
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
            @keyup.enter="emit('apply')"
          />
        </v-col>

        <v-col cols="6" :md="showAssignee ? 3 : 4">
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

        <v-col v-if="showAssignee" cols="6" md="3">
          <v-select
            v-model="filters.assigned_to"
            :placeholder="assigneeLabel"
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
            v-if="activeCount"
            variant="text"
            rounded="lg"
            class="text-none"
            @click="emit('clear')"
          >
            Clear ({{ activeCount }})
          </v-btn>

          <v-btn
            color="primary"
            variant="tonal"
            rounded="lg"
            class="text-none font-weight-semibold"
            @click="emit('apply')"
          >
            Apply
          </v-btn>
        </v-col>
      </v-row>
    </section>
  </v-theme-provider>
</template>

<style scoped>
.filters-bar {
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e6eaf0);
  border-radius: 18px;
  padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(23, 32, 46, 0.04);
}
</style>
