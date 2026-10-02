import { computed, reactive, ref } from 'vue'
import { apiFetch } from '../services/api'
import { getCurrentUser } from '../services/auth'

export function useScheduleActions(onChanged = async () => {}) {
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

  const canManage = computed(() => {
    const me = getCurrentUser()

    return (
      !!selectedSchedule.value &&
      !!me &&
      Number(selectedSchedule.value.created_by) === Number(me.id)
    )
  })

  async function showScheduleDetails(id) {
    detailsError.value = ''
    actionError.value = ''
    editing.value = false
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
      await onChanged()
    } catch (error) {
      actionError.value = error.message
    } finally {
      updating.value = false
    }
  }

  async function runStatusAction(path, confirmText, loadingRef, fallbackError) {
    if (!selectedSchedule.value) return
    if (!window.confirm(confirmText)) return

    actionError.value = ''
    loadingRef.value = true

    try {
      const response = await apiFetch(`/schedules/${selectedSchedule.value.id}/${path}`, {
        method: 'PATCH',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || fallbackError)
      }

      detailsDialog.value = false
      await onChanged()
    } catch (error) {
      actionError.value = error.message
    } finally {
      loadingRef.value = false
    }
  }

  const cancelSchedule = () =>
    runStatusAction('cancel', 'Cancel this schedule?', cancelLoading, 'Could not cancel schedule.')

  const completeSchedule = () =>
    runStatusAction('complete', 'Complete this schedule?', completeLoading, 'Could not complete schedule.')

  async function deleteSchedule(id = selectedSchedule.value?.id) {
    if (!id) return
    if (!window.confirm('Permanently delete this schedule?')) return

    actionError.value = ''
    deleteLoading.value = true

    try {
      const response = await apiFetch(`/schedules/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Could not delete schedule.')
      }

      detailsDialog.value = false
      await onChanged()
    } catch (error) {
      if (detailsDialog.value) {
        actionError.value = error.message
      } else {
        detailsError.value = error.message
      }
    } finally {
      deleteLoading.value = false
    }
  }

  return {
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
  }
}
