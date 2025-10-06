import { defineStore } from 'pinia'
import type { AppSettings } from '@/workers/types'
import { getSettings, saveSettings as saveSettingsToIDB } from '@/utils/idb'

export const useSettingsStore = defineStore('settings', {
  state: (): AppSettings => ({
    defaultImageFormat: 'webp',
    defaultImageQuality: 0.85,
    stripExifByDefault: true,
    defaultPdfPaperSize: 'A4',
    defaultPdfMargin: 20,
    defaultPdfDpi: 150,
    outputNamingPattern: '${name}.${ext}',
    darkMode: true,
    showPreview: true,
  }),

  actions: {
    async loadSettings() {
      const settings = await getSettings()
      this.$patch(settings)
    },

    async updateSettings(updates: Partial<AppSettings>) {
      this.$patch(updates)
      await saveSettingsToIDB(this.$state)
    },

    async toggleDarkMode() {
      await this.updateSettings({ darkMode: !this.darkMode })
      this.applyDarkMode()
    },

    applyDarkMode() {
      if (this.darkMode) {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
      }
    }
  }
})
