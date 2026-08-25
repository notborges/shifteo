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
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from '@lucide/vue'
import { useToastStore } from '@/app/stores/toast'
import { storeToRefs } from 'pinia'

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)

function removeToast(id: string) {
  toastStore.remove(id)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
}

.toast {
  border: 1px solid var(--ink-border);
  border-left: 3px solid var(--info);
  border-radius: var(--radius-md);
  background: rgba(25, 29, 34, 0.96);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  color: var(--ink-primary);
  backdrop-filter: blur(12px);
}

.toast--success { border-left-color: var(--success); }
.toast--warning { border-left-color: var(--warning); }
.toast--error { border-left-color: var(--error); }

.toast__content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
}

.toast__icon { color: var(--info); }
.toast--success .toast__icon { color: var(--success); }
.toast--warning .toast__icon { color: var(--warning); }
.toast--error .toast__icon { color: var(--error); }

.toast__message {
  min-width: 0;
  flex: 1;
}

.toast__title {
  font-weight: 600;
  line-height: 1.3;
}

.toast__body {
  margin-top: 4px;
  color: var(--ink-secondary);
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.toast__close {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 2px;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
}

.toast__close:hover { color: var(--ink-primary); }

.toast-enter-active,
.toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
