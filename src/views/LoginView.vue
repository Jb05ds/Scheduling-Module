<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { apiFetch } from '../services/api.js'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function login() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await apiFetch('/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result.message || 'Login failed. Please check your credentials.',
      )
    }

    localStorage.setItem('auth_token', result.token)
    localStorage.setItem('auth_user', JSON.stringify(result.user))

    await router.push('/')
  } catch (error) {
    errorMessage.value = error.message || 'Could not connect to the server.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card width="100%" max-width="420" class="pa-6">
      <v-card-title class="text-h5 text-center">
        Scheduling Module
      </v-card-title>

      <v-card-subtitle class="text-center mb-4">
        Sign in to continue
      </v-card-subtitle>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ errorMessage }}
      </v-alert>

      <v-form @submit.prevent="login">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          autocomplete="username"
          required
        />

        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          required
        />

        <v-btn
          type="submit"
          color="primary"
          block
          :loading="loading"
          class="mt-2"
        >
          Log in
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>