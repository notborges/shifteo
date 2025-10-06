<template>
  <div class="page-shell">
    <div class="page-grid">
      <div class="panel col-span-12 lg:col-span-6">
        <div class="panel__header">
          <span>Default Image Format</span>
          <span class="panel__meta">Applies to new jobs</span>
        </div>
        <div class="panel__body grid grid-cols-2 gap-3">
          <UiButton
            v-for="format in formats"
            :key="format"
            @click="updateSetting('defaultImageFormat', format)"
            type="button"
            :variant="settings.defaultImageFormat === format ? 'primary' : 'default'"
          >
            <span class="mono" style="letter-spacing: 0.24em;">{{ format.toUpperCase() }}</span>
          </UiButton>
        </div>
      </div>

      <div class="panel col-span-12 lg:col-span-6">
        <div class="panel__header">
          <span>Default Quality</span>
          <span class="panel__meta mono">{{ Math.round(settings.defaultImageQuality * 100) }}%</span>
        </div>
        <div class="panel__body gap-4">
          <input
            type="range"
            :value="settings.defaultImageQuality"
            @input="updateQuality"
            min="0"
            max="1"
            step="0.01"
            class="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line-hair)]
                   [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-bg-canvas)]
                   [&::-webkit-slider-thumb]:bg-[var(--color-acc-error)] [&::-webkit-slider-thumb]:transition-shadow
                   [&::-webkit-slider-thumb]:hover:shadow-glow
                   [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-acc-error)]"
          />
          <div class="flex justify-between text-text-muted" style="letter-spacing: 0.2em; text-transform: uppercase;">
            <span>Min</span>
            <span>Max</span>
          </div>
        </div>
      </div>

      <div class="panel col-span-12 lg:col-span-6">
        <div class="panel__header">
          <span>Privacy Defaults</span>
          <span class="panel__meta">Metadata handling</span>
        </div>
        <div class="panel__body gap-4">
          <label class="flex items-center gap-3 body-text text-text-secondary" style="letter-spacing: 0.24em; text-transform: uppercase;">
            <span class="checkbox">
              <input
                type="checkbox"
                :checked="settings.stripExifByDefault"
                @change="updateSetting('stripExifByDefault', !settings.stripExifByDefault)"
              />
              <span class="checkbox__mark" />
            </span>
            Strip EXIF on ingest
          </label>
          <p class="body-text text-text-muted">
            Enable to remove camera and author metadata from converted assets by default. You can override per job in the shift panel.
          </p>
        </div>
      </div>

      <div class="panel col-span-12 lg:col-span-6">
        <div class="panel__header">
          <span>Local Storage</span>
          <span class="panel__meta mono">{{ storageStats.tempFilesCount }} files · {{ formatFileSize(storageStats.tempFilesSize) }}</span>
        </div>
        <div class="panel__body gap-4">
          <p class="body-text text-text-muted">
            Temporary assets live in IndexedDB for quick retrieval. Clear storage to reclaim space after exports.
          </p>
          <UiButton type="button" @click="clearStorage">Clear Temp Storage</UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/app/stores/settings'
import { getStorageStats, clearAllTempFiles } from '@/utils/idb'
import UiButton from '@/components/ui/UiButton.vue'
import { formatFileSize } from '@/utils/format'
import type { ImageFormat } from '@/workers/types'

const settingsStore = useSettingsStore()
const settings = settingsStore.$state

const formats: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif']

const storageStats = ref({
  tempFilesCount: 0,
  tempFilesSize: 0
})

onMounted(async () => {
  storageStats.value = await getStorageStats()
})

function updateSetting(key: string, value: any) {
  settingsStore.updateSettings({ [key]: value })
}

function updateQuality(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  updateSetting('defaultImageQuality', value)
}

async function clearStorage() {
  await clearAllTempFiles()
  storageStats.value = await getStorageStats()
}
</script>
