<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast--${toast.type}`]"
        >
          <div class="toast__content">
            <div class="toast__icon">
              <CheckCircle v-if="toast.type === 'success'" :size="20" />
              <AlertCircle v-if="toast.type === 'error'" :size="20" />
              <AlertTriangle v-if="toast.type === 'warning'" :size="20" />
              <Info v-if="toast.type === 'info'" :size="20" />
            </div>
            <div class="toast__message">
              <div class="toast__title">{{ toast.title }}</div>
              <div v-if="toast.message" class="toast__body">{{ toast.message }}</div>
            </div>
            <button @click="removeToast(toast.id)" class="toast__close">
              <X :size="16" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useToastStore } from '@/app/stores/toast'
import { storeToRefs } from 'pinia'

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)

function removeToast(id: string) {
  toastStore.remove(id)
}
</script>
