<template>
  <div class="page-shell page-shell--constrained">
    <div class="page-grid">
      <UiPanel class="col-span-12 lg:col-span-6">
        <template #header>
          <div class="flex items-center gap-2">
            <Image :size="16" />
            <span>Default Image Format</span>
          </div>
          <span class="panel__meta">Applies to new jobs</span>
        </template>
        <div class="grid grid-cols-2 gap-3">
          <UiButton
            v-for="format in formats"
            :key="format"
            @click="updateSetting('defaultImageFormat', format)"
            type="button"
            variant="solid"
            :tone="settings.defaultImageFormat === format ? 'accent' : 'default'"
          >
            <span class="mono tracking-wider">{{ format.toUpperCase() }}</span>
          </UiButton>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12 lg:col-span-6">
        <template #header>
          <div class="flex items-center gap-2">
            <Sliders :size="16" />
            <span>Default Quality</span>
          </div>
          <span class="panel__meta mono">{{ Math.round(settings.defaultImageQuality * 100) }}%</span>
        </template>
        <div class="gap-4">
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
          <div class="flex justify-between text-text-muted uppercase tracking-wide">
            <span>Min</span>
            <span>Max</span>
          </div>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12 lg:col-span-6">
        <template #header>
          <div class="flex items-center gap-2">
            <Shield :size="16" />
            <span>Privacy Defaults</span>
          </div>
          <span class="panel__meta">Metadata handling</span>
        </template>
        <div class="gap-4">
          <label class="flex items-center gap-3 body-text text-text-secondary uppercase tracking-wider">
            <span class="checkbox">
              <input
                type="checkbox"
                :checked="settings.stripExifByDefault"
                @change="updateSetting('stripExifByDefault', !settings.stripExifByDefault)"
              />
              <span class="checkbox__mark" />
            </span>
            Strip EXIF by default
          </label>
          <p class="body-text text-text-muted">
            Remove camera and location data from images by default. You can change this per file in Images.
          </p>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12 lg:col-span-6">
        <template #header>
          <div class="flex items-center gap-2">
            <Database :size="16" />
            <span>Local Storage</span>
          </div>
          <span class="panel__meta mono">{{ storageStats.tempFilesCount }} files · {{ formatFileSize(storageStats.tempFilesSize) }}</span>
        </template>
        <div class="gap-4">
          <p class="body-text text-text-muted">
            Processed files are temporarily stored in your browser. Clear to free up space.
          </p>
          <UiButton type="button" variant="destructive" @click="clearStorage">Clear Temp Storage</UiButton>
        </div>
      </UiPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/app/stores/settings'
import { getStorageStats, clearAllTempFiles } from '@/utils/idb'
import UiButton from '@/components/ui/UiButton.vue'
import UiPanel from '@/components/ui/UiPanel.vue'
import { formatFileSize } from '@/utils/format'
import { Image, Sliders, Shield, Database } from 'lucide-vue-next'
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
