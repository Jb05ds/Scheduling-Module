<script setup>
import { useRouter } from 'vue-router'
import { logoutUser } from '../services/auth'

const router = useRouter()

const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
</script>

<template>
  <header class="sch-header">
    <div class="d-flex align-center ga-4">
      <div class="brand-mark">
        <v-icon icon="mdi-calendar-clock" size="26" />
      </div>

      <div>
        <h1 class="sch-title">Schedules</h1>
        <p class="sch-subtitle">{{ todayLabel }}</p>
      </div>
    </div>

    <v-theme-provider theme="light">
      <div class="sch-actions">
        <nav class="view-switch" aria-label="Schedule views">
          <router-link to="/" class="view-switch__item" exact-active-class="is-active">
            <v-icon icon="mdi-calendar-account-outline" size="18" />
            My calendar
          </router-link>

          <router-link to="/assigned" class="view-switch__item" exact-active-class="is-active">
            <v-icon icon="mdi-account-arrow-right-outline" size="18" />
            Assigned by me
          </router-link>
        </nav>

        <v-btn
          color="error"
          variant="outlined"
          size="large"
          rounded="lg"
          prepend-icon="mdi-logout"
          class="text-none font-weight-semibold"
          @click="logoutUser(router)"
        >
          Log out
        </v-btn>
      </div>
    </v-theme-provider>
  </header>
</template>

<style scoped>
.sch-header {
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

.sch-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.sch-subtitle {
  margin-top: 2px;
  font-size: 0.95rem;
  color: var(--muted);
}

.sch-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.view-switch {
  display: inline-flex;
  padding: 4px;
  gap: 4px;
  background: #e9edf4;
  border-radius: 14px;
}

.view-switch__item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.view-switch__item:hover {
  color: var(--ink);
}

.view-switch__item.is-active {
  background: #fff;
  color: var(--accent);
  box-shadow: 0 1px 3px rgba(23, 32, 46, 0.12);
}

.view-switch__item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .sch-title {
    font-size: 1.4rem;
  }
}
</style>
