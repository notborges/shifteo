<template>
  <div class="page-shell">
    <div class="page-grid">
      <UiPanel :inset="true" class="col-span-12">
        <template #header>
          <span>Add Images</span>
          <span class="panel__meta">Accepts PNG · JPEG · WEBP · AVIF</span>
        </template>
        <DropZone
          accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
          @files-selected="handleFilesSelected"
        />
      </UiPanel>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Queue</span>
          <div class="panel__meta">
            {{ queueStore.totalJobs }} Files · {{ queueStore.pendingJobs.length }} Pending
          </div>
        </div>
        <div class="panel__body">
          <div v-if="queueStore.totalJobs === 0" class="empty-state">
            <ListX :size="48" :stroke-width="1" class="text-text-muted" />
            <div class="empty-state__title">Queue Empty</div>
            <div class="empty-state__meta">Add files to start processing.</div>
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
            <span>{{ queueStore.totalJobs }} file{{ queueStore.totalJobs > 1 ? 's' : '' }}</span>
            <div class="flex gap-2">
              <UiButton
                v-if="queueStore.completedJobs.length > 0"
                variant="quiet"
                size="sm"
                type="button"
                @click="queueStore.clearCompleted()"
              >Clear Completed</UiButton>
              <UiButton variant="quiet" size="sm" type="button" @click="queueStore.clearAll()">Clear All</UiButton>
            </div>
          </div>
        </div>
      </div>

      <div class="panel col-span-12 xl:col-span-6">
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
            <span class="mono tracking-wider">{{ format.value.toUpperCase() }}</span>
            <span
              :class="['block text-[11px] tracking-wide', options.to === format.value ? 'text-[#070909]' : 'text-text-muted']"
            >{{ format.desc }}</span>
          </UiButton>
        </div>
      </div>

      <div class="panel col-span-12 xl:col-span-6">
        <div class="panel__header">
          <span>Quality Controls</span>
          <span class="panel__meta" v-if="options.to !== 'png' && options.to !== 'original'">Adjust compression and metadata</span>
          <span class="panel__meta" v-else>Lossless mode</span>
        </div>
        <div class="panel__body gap-6">
          <div v-if="options.to !== 'png' && options.to !== 'original'">
            <div class="flex items-center justify-between">
              <span class="body-text text-text-secondary uppercase tracking-wider">Quality</span>
              <span class="mono tracking-wide">{{ Math.round(options.quality * 100) }}%</span>
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

          <label class="flex items-center gap-3 body-text text-text-secondary uppercase tracking-wider">
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
        <div class="panel__header">
          <span>Resize</span>
          <span class="panel__meta">Optional</span>
        </div>
        <div class="panel__body gap-6">
          <div class="flex flex-wrap gap-3">
            <UiButton
              @click="resizeMode = 'none'"
              :tone="resizeMode === 'none' ? 'accent' : 'default'"
              variant="solid"
              size="sm"
              type="button"
            >No Resize</UiButton>
            <UiButton
              @click="resizeMode = 'scale'"
              :tone="resizeMode === 'scale' ? 'accent' : 'default'"
              variant="solid"
              size="sm"
              type="button"
            >Scale %</UiButton>
            <UiButton
              @click="resizeMode = 'longEdge'"
              :tone="resizeMode === 'longEdge' ? 'accent' : 'default'"
              variant="solid"
              size="sm"
              type="button"
            >Long Edge</UiButton>
            <UiButton
              @click="resizeMode = 'custom'"
              :tone="resizeMode === 'custom' ? 'accent' : 'default'"
              variant="solid"
              size="sm"
              type="button"
            >Custom</UiButton>
          </div>

          <div v-if="resizeMode === 'scale'" class="grid grid-cols-4 gap-2">
            <UiButton
              v-for="scale in [50, 75, 150, 200]"
              :key="scale"
              @click="scalePercent = scale"
              :tone="scalePercent === scale ? 'accent' : 'default'"
              variant="solid"
              size="sm"
              type="button"
            >{{ scale }}%</UiButton>
          </div>

          <div v-if="resizeMode === 'longEdge'" class="grid grid-cols-4 gap-2">
            <UiButton
              v-for="size in [3840, 1920, 1080, 720]"
              :key="size"
              @click="longEdgeSize = size"
              :tone="longEdgeSize === size ? 'accent' : 'default'"
              variant="solid"
              size="sm"
              type="button"
            >{{ size }}px</UiButton>
          </div>

          <div v-if="resizeMode === 'custom'" class="grid md:grid-cols-2 gap-4">
            <div class="form-field">
              <label class="body-text text-text-secondary uppercase tracking-wider">Width (px)</label>
              <input
                type="number"
                v-model.number="customWidth"
                placeholder="Auto"
                min="1"
                max="7680"
                class="input"
              />
            </div>
            <div class="form-field">
              <label class="body-text text-text-secondary uppercase tracking-wider">Height (px)</label>
              <input
                type="number"
                v-model.number="customHeight"
                placeholder="Auto"
                min="1"
                max="7680"
                class="input"
              />
            </div>
            <p class="body-text text-text-muted col-span-full">
              Leave one dimension empty to maintain aspect ratio. Provide both for exact dimensions.
            </p>
          </div>

          <p v-if="resizeMode !== 'none'" class="body-text text-text-muted">
            <span v-if="resizeMode === 'scale'">Images scaled to {{ scalePercent }}% of original size.</span>
            <span v-if="resizeMode === 'longEdge'">Longest side resized to {{ longEdgeSize }}px, aspect ratio maintained.</span>
            <span v-if="resizeMode === 'custom'">Custom dimensions with {{ customWidth && customHeight ? 'exact sizing' : 'aspect ratio maintained' }}.</span>
          </p>
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="body-text text-text-muted">
            All processing happens locally in your browser. Processing time depends on file size and format.
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
              <span v-else-if="queueStore.pendingJobs.length > 0">
                {{ options.to === 'original' ? 'Process Files' : `Shift to ${options.to.toUpperCase()}` }}
              </span>
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
import { ref, toRaw, watch } from 'vue'
import DropZone from '@/components/DropZone.vue'
import FileListItem from '@/components/FileListItem.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiPanel from '@/components/ui/UiPanel.vue'
import { useQueueStore } from '@/app/stores/queue'
import { useSettingsStore } from '@/app/stores/settings'
import { imageWorkerPool as imageWorker } from '@/workers/workerPool'
import { isFormatSupported, generateOutputFilename } from '@/utils/format'
import { getImageDimensions } from '@/utils/file'
import { downloadFile } from '@/utils/file'
import { Upload, ListX } from 'lucide-vue-next'
import type { ImageConvertOpts, ImageFormat, Job } from '@/workers/types'

const queueStore = useQueueStore()
const settingsStore = useSettingsStore()

type UiImageOptions = ImageConvertOpts & { quality: number; stripExif: boolean }

const formatOptions = [
  { value: 'original' as const, desc: 'KEEP ORIGINAL' },
  { value: 'png' as ImageFormat, desc: 'LOSSLESS' },
  { value: 'jpeg' as ImageFormat, desc: 'SMALLEST' },
  { value: 'webp' as ImageFormat, desc: 'BALANCED' },
  { value: 'avif' as ImageFormat, desc: 'MODERN' }
]

const options = ref<UiImageOptions & { to: ImageFormat | 'original' }>({
  to: settingsStore.defaultImageFormat,
  quality: settingsStore.defaultImageQuality,
  width: undefined,
  height: undefined,
  longEdge: undefined,
  scale: undefined,
  stripExif: settingsStore.stripExifByDefault
})

// Resize state
const resizeMode = ref<'none' | 'scale' | 'longEdge' | 'custom'>('none')
const scalePercent = ref(75)
const longEdgeSize = ref(1920)
const customWidth = ref<number | undefined>(undefined)
const customHeight = ref<number | undefined>(undefined)

// Update options when resize settings change
watch([resizeMode, scalePercent, longEdgeSize, customWidth, customHeight], () => {
  switch (resizeMode.value) {
    case 'none':
      options.value.width = undefined
      options.value.height = undefined
      options.value.longEdge = undefined
      options.value.scale = undefined
      break
    case 'scale':
      options.value.scale = scalePercent.value === 100 ? undefined : scalePercent.value / 100
      options.value.width = undefined
      options.value.height = undefined
      options.value.longEdge = undefined
      break
    case 'longEdge':
      options.value.longEdge = longEdgeSize.value
      options.value.width = undefined
      options.value.height = undefined
      options.value.scale = undefined
      break
    case 'custom':
      options.value.width = customWidth.value
      options.value.height = customHeight.value
      options.value.longEdge = undefined
      options.value.scale = undefined
      break
  }
})

function detectFormatFromFile(file: File): ImageFormat {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (ext === 'webp') return 'webp'
  if (ext === 'avif') return 'avif'
  return 'png'
}

async function handleFilesSelected(files: File[]) {
  for (const file of files) {
    if (!isFormatSupported(file)) {
      alert(`File ${file.name} is not a supported image format`)
      continue
    }

    // Extract original dimensions
    const dimensions = await getImageDimensions(file)

    queueStore.addJob({
      file,
      kind: 'image',
      status: 'idle',
      originalDimensions: dimensions || undefined
    })
  }
}

async function startConversion() {
  const pendingJobs = queueStore.pendingJobs

  // Process all files in parallel
  await Promise.all(
    pendingJobs.map(async (job) => {
      try {
        queueStore.updateJobStatus(job.id, 'running')

        const targetFormat = options.value.to === 'original'
          ? detectFormatFromFile(job.file)
          : options.value.to

        const result = await imageWorker.convert(
          job.file,
          {
            ...toRaw(options.value),
            to: targetFormat
          },
          (progress) => {
            queueStore.updateJobProgress(job.id, progress)
          },
          (stage) => {
            queueStore.updateJobStage(job.id, stage)
          }
        )
        queueStore.setJobResult(job.id, result.blob)
        queueStore.updateJob(job.id, {
          outputDimensions: { width: result.width, height: result.height }
        })
      } catch (error) {
        console.error('Conversion failed:', error)
        queueStore.setJobError(job.id, error instanceof Error ? error.message : 'Conversion failed')
      }
    })
  )
}

async function handleDownload(job: Job) {
  if (!job.result) return
  const blob = Array.isArray(job.result) ? job.result[0] : job.result
  const filename = generateOutputFilename(job.file.name, options.value.to, settingsStore.outputNamingPattern)
  await downloadFile(blob, filename)
}

async function downloadAll() {
  for (const job of queueStore.completedJobs) {
    await handleDownload(job)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

async function handleRetry(jobId: string) {
  queueStore.retryJob(jobId)
}
</script>
