import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as Toast[]
  }),

  actions: {
    add(toast: Omit<Toast, 'id'>) {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const duration = toast.duration ?? 4000
      const newToast: Toast = {
        ...toast,
        id,
        duration
      }

      this.toasts.push(newToast)

      if (duration > 0) {
        setTimeout(() => {
          this.remove(id)
        }, duration)
      }

      return id
    },

    remove(id: string) {
      const index = this.toasts.findIndex(t => t.id === id)
      if (index !== -1) {
        this.toasts.splice(index, 1)
      }
    },

    clear() {
      this.toasts = []
    },

    success(title: string, message?: string) {
      this.add({ type: 'success', title, message })
    },

    error(title: string, message?: string) {
      this.add({ type: 'error', title, message, duration: 6000 })
    },

    warning(title: string, message?: string) {
      this.add({ type: 'warning', title, message, duration: 5000 })
    },

    info(title: string, message?: string) {
      this.add({ type: 'info', title, message })
    }
  }
})
