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
            <FileText :size="16" />
            <span>Document Defaults</span>
          </div>
          <span class="panel__meta">Used for upcoming PDF tools</span>
        </template>
        <div class="space-y-6">
          <div>
            <span class="body-text text-text-secondary uppercase tracking-wider">Paper Size</span>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <UiButton
                v-for="paper in paperSizes"
                :key="paper"
                @click="updateSetting('defaultPdfPaperSize', paper)"
                type="button"
                variant="solid"
                :tone="settings.defaultPdfPaperSize === paper ? 'accent' : 'default'"
              >
                <span class="mono tracking-wider">{{ paper }}</span>
              </UiButton>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div class="form-field">
              <label>Margin (mm)</label>
              <input
                type="number"
                class="input"
                :value="settings.defaultPdfMargin"
                min="0"
                max="100"
                step="1"
                @change="handleNumberChange('defaultPdfMargin', $event, { min: 0, max: 100 })"
              />
            </div>
            <div class="form-field">
              <label>DPI</label>
              <input
                type="number"
                class="input"
                :value="settings.defaultPdfDpi"
                min="72"
                max="600"
                step="1"
                @change="handleNumberChange('defaultPdfDpi', $event, { min: 72, max: 600 })"
              />
            </div>
          </div>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12 lg:col-span-6">
        <template #header>
          <div class="flex items-center gap-2">
            <Type :size="16" />
            <span>File Naming</span>
          </div>
          <span class="panel__meta">Tokens: ${name} ${ext} ${w} ${h} ${p}</span>
        </template>
        <div class="space-y-4">
          <div class="form-field">
            <label>Pattern</label>
            <input
              type="text"
              class="input mono"
              :value="settings.outputNamingPattern"
              @change="handlePatternChange"
            />
          </div>
          <p class="body-text text-text-muted">
            Customize exported filenames using tokens. For example, <span class="mono">${name}-${w}x${h}.${ext}</span>
            adds output dimensions.
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
import { Image, Sliders, Shield, Database, FileText, Type } from 'lucide-vue-next'
import type { AppSettings, ImageFormat } from '@/workers/types'

const settingsStore = useSettingsStore()
const settings = settingsStore.$state

const formats: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif', 'bmp', 'tiff', 'ico']
const paperSizes: AppSettings['defaultPdfPaperSize'][] = ['A4', 'Letter']

const storageStats = ref({
  tempFilesCount: 0,
  tempFilesSize: 0
})

onMounted(async () => {
  storageStats.value = await getStorageStats()
})

async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  await settingsStore.updateSettings({ [key]: value } as Partial<AppSettings>)
}

function updateQuality(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  updateSetting('defaultImageQuality', value)
}

type NumericSettingKey = {
  [K in keyof AppSettings]: AppSettings[K] extends number ? K : never
}[keyof AppSettings]

function handleNumberChange<K extends NumericSettingKey>(key: K, event: Event, clamp: { min?: number; max?: number } = {}) {
  const input = event.target as HTMLInputElement
  const parsed = Number(input.value)
  if (!Number.isFinite(parsed)) return

  let next = parsed
  if (typeof clamp.min === 'number') next = Math.max(clamp.min, next)
  if (typeof clamp.max === 'number') next = Math.min(clamp.max, next)

  updateSetting(key, next as AppSettings[K])
  input.value = String(next)
}

function handlePatternChange(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim() || '${name}.${ext}'
  updateSetting('outputNamingPattern', value)
  input.value = value
}

async function clearStorage() {
  await clearAllTempFiles()
  storageStats.value = await getStorageStats()
}
</script>
