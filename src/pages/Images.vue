<template>
  <div class="page-shell">
    <div class="page-grid">
      <div class="panel panel--inset col-span-12">
        <div class="panel__header">
          <span>Input Channel</span>
          <span class="panel__meta">Accepts PNG · JPEG · WEBP · AVIF</span>
        </div>
        <div class="panel__body">
          <DropZone
            accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
            @files-selected="handleFilesSelected"
            :disabled="queueStore.hasActiveJobs"
          />
        </div>
      </div>

      <div class="panel col-span-12 xl:col-span-8">
        <div class="panel__header">
          <span>Shift Queue</span>
          <div class="panel__meta">
            {{ queueStore.totalJobs }} Files · {{ queueStore.pendingJobs.length }} Pending
          </div>
        </div>
        <div class="panel__body">
          <div v-if="queueStore.totalJobs === 0" class="empty-state">
            <div class="empty-state__title">Queue Idle</div>
            <div class="empty-state__meta">Drop assets to arm the conversion pipeline.</div>
          </div>
          <div v-else>
            <FileListItem
              v-for="job in queueStore.jobs"
              :key="job.id"
              :job="job"
              @download="handleDownload"
              @retry="handleRetry"
              @remove="queueStore.removeJob"
            />
          </div>
        </div>
        <div class="panel__footer" v-if="queueStore.totalJobs > 0">
          <div class="flex w-full items-center justify-between">
            <span>Throughput stable</span>
            <UiButton variant="quiet" size="sm" type="button" @click="queueStore.clearAll()">Clear Queue</UiButton>
          </div>
        </div>
      </div>

      <div class="panel col-span-12 xl:col-span-4">
        <div class="panel__header">
          <span>Signal</span>
          <span class="panel__meta">Runtime telemetry</span>
        </div>
        <div class="panel__body gap-4">
          <div>
            <span class="badge badge--live">Local</span>
            <p class="body-text text-text-muted mt-3">
              Processing happens client-side using WebAssembly codecs stocked in the worker pool.
            </p>
          </div>
          <div>
            <span class="badge">Active Format</span>
            <p class="body-text text-text-secondary mt-2 mono" style="letter-spacing: 0.18em;">
              {{ options.to.toUpperCase() }}
            </p>
          </div>
          <div>
            <span class="badge">Quality</span>
            <p class="body-text text-text-secondary mt-2 mono" style="letter-spacing: 0.18em;">
              {{ Math.round(options.quality * 100) }}%
            </p>
          </div>
        </div>
      </div>

      <div class="panel col-span-12 xl:col-span-5">
        <div class="panel__header">
          <span>Output Format</span>
          <span class="panel__meta">Select one target</span>
        </div>
        <div class="panel__body grid sm:grid-cols-2 gap-4">
          <UiButton
            v-for="format in formatOptions"
            :key="format.value"
            type="button"
            @click="options.to = format.value"
            variant="solid"
            :tone="options.to === format.value ? 'accent' : 'default'"
          >
            <span class="mono" style="letter-spacing: 0.24em;">{{ format.value.toUpperCase() }}</span>
            <span
              :class="['block text-[11px]', options.to === format.value ? 'text-[#070909]' : 'text-text-muted']"
              style="letter-spacing: 0.2em;"
            >{{ format.desc }}</span>
          </UiButton>
        </div>
      </div>

      <div class="panel col-span-12 xl:col-span-7">
        <div class="panel__header">
          <span>Quality Controls</span>
          <span class="panel__meta" v-if="options.to !== 'png'">Adjust compression and metadata</span>
          <span class="panel__meta" v-else>Lossless channel active</span>
        </div>
        <div class="panel__body gap-6">
          <div v-if="options.to !== 'png'">
            <div class="flex items-center justify-between">
              <span class="body-text text-text-secondary" style="letter-spacing: 0.24em; text-transform: uppercase;">Quality</span>
              <span class="mono" style="letter-spacing: 0.2em;">{{ Math.round(options.quality * 100) }}%</span>
            </div>
            <input
              type="range"
              v-model.number="options.quality"
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
          </div>

          <label class="flex items-center gap-3 body-text text-text-secondary" style="letter-spacing: 0.24em; text-transform: uppercase;">
            <span class="checkbox">
              <input type="checkbox" v-model="options.stripExif" />
              <span class="checkbox__mark" />
            </span>
            Strip Metadata
          </label>

          <p class="body-text text-text-muted">
            Metadata removal protects privacy by eliminating EXIF signatures. Leave disabled to preserve camera and author details.
          </p>
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="body-text text-text-muted">
            Conversion executes locally using thread-safe workers. Execution time scales with input size and requested format.
          </div>
          <div class="flex flex-col gap-3 md:flex-row md:items-center">
            <UiButton
              variant="solid"
              tone="accent"
              size="lg"
              @click="startConversion"
              :disabled="queueStore.pendingJobs.length === 0 || queueStore.hasActiveJobs"
            >
              <span v-if="queueStore.hasActiveJobs">Shifting…</span>
              <span v-else-if="queueStore.pendingJobs.length > 0">Shift to {{ options.to.toUpperCase() }}</span>
              <span v-else>Select Files</span>
            </UiButton>
            <UiButton
              v-if="queueStore.completedJobs.length > 0"
              @click="downloadAll"
              type="button"
              variant="solid"
            >
              Download All ({{ queueStore.completedJobs.length }})
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRaw } from 'vue'
import DropZone from '@/components/DropZone.vue'
import FileListItem from '@/components/FileListItem.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useQueueStore } from '@/app/stores/queue'
import { useSettingsStore } from '@/app/stores/settings'
import { imageWorker } from '@/workers/imageWorkerManager'
import { isFormatSupported, generateOutputFilename } from '@/utils/format'
import { downloadFile } from '@/utils/file'
import type { ImageConvertOpts, ImageFormat } from '@/workers/types'

const queueStore = useQueueStore()
const settingsStore = useSettingsStore()

type UiImageOptions = ImageConvertOpts & { quality: number; stripExif: boolean }

const formatOptions = [
  { value: 'png' as ImageFormat, desc: 'LOSSLESS' },
  { value: 'jpeg' as ImageFormat, desc: 'SMALLEST' },
  { value: 'webp' as ImageFormat, desc: 'BALANCED' },
  { value: 'avif' as ImageFormat, desc: 'MODERN' }
]

const options = ref<UiImageOptions>({
  to: settingsStore.defaultImageFormat,
  quality: settingsStore.defaultImageQuality,
  width: undefined,
  height: undefined,
  longEdge: undefined,
  stripExif: settingsStore.stripExifByDefault
})

function handleFilesSelected(files: File[]) {
  for (const file of files) {
    if (!isFormatSupported(file)) {
      alert(`File ${file.name} is not a supported image format`)
      continue
    }
    queueStore.addJob({
      file,
      kind: 'image',
      status: 'idle'
    })
  }
}

async function startConversion() {
  const pendingJobs = queueStore.pendingJobs

  for (const job of pendingJobs) {
    try {
      queueStore.updateJobStatus(job.id, 'running')
      const result = await imageWorker.convert(job.file, toRaw(options.value))
      queueStore.setJobResult(job.id, result.blob)
    } catch (error) {
      console.error('Conversion failed:', error)
      queueStore.setJobError(job.id, error instanceof Error ? error.message : 'Conversion failed')
    }
  }
}

async function handleDownload(job: any) {
  if (!job.result) return
  const blob = Array.isArray(job.result) ? job.result[0] : job.result
  const filename = generateOutputFilename(job.file.name, options.value.to, settingsStore.outputNamingPattern)
  await downloadFile(blob, filename)
}

async function downloadAll() {
  for (const job of queueStore.completedJobs) {
    await handleDownload(job)
    await new Promise(resolve => setTimeout(resolve, 300))
  }
}

async function handleRetry(jobId: string) {
  queueStore.retryJob(jobId)
}
</script>
