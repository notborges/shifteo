<template>
  <div
    class="page-shell"
    @dragenter="handlePageDragEnter"
    @dragover.prevent="handlePageDragOver"
    @dragleave="handlePageDragLeave"
    @drop="handlePageDrop"
  >
    <Transition name="drag-overlay">
      <div v-if="isPageDragging" class="page-drag-overlay">
        <div class="page-drag-indicator">
          <Upload :size="64" :stroke-width="1.5" />
          <div class="page-drag-text">Drop files to add to queue</div>
        </div>
      </div>
    </Transition>

    <div class="page-grid">
      <UiPanel :inset="true" class="col-span-12">
        <template #header>
          <span>Queue</span>
          <div class="panel__meta">
            {{ queueStore.totalJobs }} Files · {{ queueStore.pendingJobs.length }} Pending
          </div>
        </template>

        <div class="panel__body">
          <!-- Empty State with Upload -->
          <div v-if="queueStore.totalJobs === 0">
            <DropZone
              :accept="acceptString"
              :formats="dropzoneFormats"
              @files-selected="handleFilesSelected"
              @drop-complete="clearPageDragState"
            />
          </div>

          <!-- Queue List -->
          <div v-else>
            <FileListItem
              v-for="job in queueStore.jobs"
              :key="job.id"
              :job="job"
              @download="handleDownload"
              @retry="handleRetry"
              @remove="queueStore.removeJob"
              @preview="openPreview"
            />
          </div>
        </div>

        <div class="panel__footer" v-if="queueStore.totalJobs > 0">
          <div class="flex w-full items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3">
              <UiButton
                variant="solid"
                size="sm"
                type="button"
                @click="triggerFileInput"
              >
                <Upload :size="14" />
                Add More Images
              </UiButton>
              <span v-if="queueStore.completedJobs.length > 0" class="text-text-muted text-xs mono">
                {{ formatStats() }}
              </span>
            </div>
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

        <input
          ref="fileInput"
          type="file"
          multiple
          :accept="acceptString"
          class="hidden"
          @change="handleFileInputChange"
        />
      </UiPanel>

      <div class="panel col-span-12 xl:col-span-6">
        <div class="panel__header">
          <span>Output Format</span>
          <span class="panel__meta">Select one target</span>
        </div>
        <div class="panel__body">
          <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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

          <div class="body-text text-text-muted text-xs mt-4 px-1">
            {{ formatHints[options.to] }}
          </div>
        </div>
      </div>

      <div class="panel col-span-12 xl:col-span-6">
        <div class="panel__header">
          <span>Quality Controls</span>
          <span class="panel__meta" v-if="showQualitySlider">Adjust compression and metadata</span>
          <span class="panel__meta" v-else>Lossless mode</span>
        </div>
        <div class="panel__body gap-6">
          <div v-if="showQualitySlider">
            <div class="flex gap-2 mb-3">
              <UiButton
                v-for="preset in qualityPresets"
                :key="preset.value"
                @click="options.quality = preset.value"
                :tone="Math.abs(options.quality - preset.value) < 0.01 ? 'accent' : 'default'"
                variant="solid"
                size="sm"
                type="button"
              >{{ preset.label }}</UiButton>
            </div>

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

          <p v-if="!showQualitySlider" class="body-text text-text-secondary text-xs">
            {{ options.to === 'original' ? 'Quality is unchanged because the original format is preserved.' : 'Selected format is lossless; file size depends on image content.' }}
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
        <div class="panel__body">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="checkbox">
                  <input type="checkbox" v-model="autoDownload" />
                  <span class="checkbox__mark" />
                </span>
                <span class="body-text text-text-secondary uppercase tracking-wide text-sm">
                  Auto-download
                </span>
              </label>

              <div class="body-text text-text-muted text-xs mono">
                {{ settingsPreview }}
              </div>
            </div>

            <div class="flex flex-wrap gap-3 sm:justify-end w-full sm:w-auto">
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
                size="lg"
              >
                Download ZIP ({{ queueStore.completedJobs.length }})
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ImagePreviewModal
      :job="previewJob"
      :isOpen="isPreviewOpen"
      @close="closePreview"
      @download="handleDownload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, toRaw, watch, computed } from 'vue'
import DropZone from '@/components/DropZone.vue'
import FileListItem from '@/components/FileListItem.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiPanel from '@/components/ui/UiPanel.vue'
import ImagePreviewModal from '@/components/ImagePreviewModal.vue'
import { useQueueStore } from '@/app/stores/queue'
import { useSettingsStore } from '@/app/stores/settings'
import { useToastStore } from '@/app/stores/toast'
import { imageWorkerPool as imageWorker } from '@/workers/workerPool'
import { isFormatSupported, generateOutputFilename, formatFileSize, inferOriginalImageFormat, inferProcessingFormat } from '@/utils/format'
import { getImageDimensions, generateThumbnail, downloadFile, downloadAsZip, wrapImageBlobAsSvg } from '@/utils/file'
import { storeQueueJob, removeQueueJob } from '@/utils/idb'
import { Upload } from 'lucide-vue-next'
import type { ImageConvertOpts, ImageFormat, Job, ExtendedImageFormat } from '@/workers/types'

const queueStore = useQueueStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const acceptedFormats = [
  { label: 'PNG', mime: 'image/png' },
  { label: 'JPEG', mime: 'image/jpeg' },
  { label: 'JPEG', mime: 'image/jpg' },
  { label: 'WEBP', mime: 'image/webp' },
  { label: 'AVIF', mime: 'image/avif' },
  { label: 'SVG', mime: 'image/svg+xml' },
  { label: 'TIFF', mime: 'image/tiff' },
  { label: 'BMP', mime: 'image/bmp' },
  { label: 'ICO', mime: 'image/x-icon' },
  { label: 'ICO', mime: 'image/vnd.microsoft.icon' }
]

const acceptString = computed(() => acceptedFormats.map(entry => entry.mime).join(','))
const dropzoneFormats = computed(() => {
  const labels = new Set<string>()
  acceptedFormats.forEach(entry => labels.add(entry.label))
  return Array.from(labels)
})

type UiImageFormat = ImageFormat | 'original' | 'svg'
type UiImageOptions = Omit<ImageConvertOpts, 'to'> & {
  to: UiImageFormat
  quality: number
  stripExif: boolean
}

const formatOptions: Array<{ value: UiImageFormat; desc: string }> = [
  { value: 'original' as const, desc: '' },
  { value: 'png' as ImageFormat, desc: 'LOSSLESS' },
  { value: 'jpeg' as ImageFormat, desc: 'SMALLEST' },
  { value: 'webp' as ImageFormat, desc: 'BALANCED' },
  { value: 'avif' as ImageFormat, desc: 'MODERN' },
  { value: 'bmp' as ImageFormat, desc: 'LEGACY' },
  { value: 'tiff' as ImageFormat, desc: 'ARCHIVAL' },
  { value: 'ico' as ImageFormat, desc: 'ICON' },
  { value: 'svg', desc: 'VECTOR' }
]

const qualityPresets = [
  { label: 'Web', value: 0.70 },
  { label: 'Balanced', value: 0.85 },
  { label: 'High', value: 0.95 }
]

const formatHints: Record<string, string> = {
  original: 'Process without changing format',
  png: 'Lossless - Best for graphics, screenshots, transparency',
  jpeg: 'Lossy - Smallest files, best for photos',
  webp: 'Modern - Better compression, wide browser support',
  avif: 'Best compression - Slower encoding, newer format',
  bmp: 'Legacy - 32-bit bitmap for compatibility with older systems',
  tiff: 'Archival - Lossless, high bit depth support (larger files)',
  ico: 'Icon - Windows-compatible favicon container',
  svg: 'Vector - Embeds raster data inside an SVG wrapper'
}

const losslessFormats = new Set<UiImageFormat>(['png', 'bmp', 'tiff', 'ico', 'svg'])
const showQualitySlider = computed(() => {
  const target = options.value.to
  return target !== 'original' && !losslessFormats.has(target)
})

const options = ref<UiImageOptions>({
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

// Auto-download
const autoDownload = ref(false)

// Preview modal
const previewJob = ref<Job | null>(null)
const isPreviewOpen = ref(false)

// File input for "Add More Images" button
const fileInput = ref<HTMLInputElement | null>(null)

function openPreview(job: Job) {
  if (job.status !== 'completed' || !job.result) return
  previewJob.value = job
  isPreviewOpen.value = true
}

function closePreview() {
  isPreviewOpen.value = false
  previewJob.value = null
}

// Global page drag/drop
const isPageDragging = ref(false)
const dragCounter = ref(0)

function handlePageDragEnter(event: DragEvent) {
  event.preventDefault()
  dragCounter.value++

  if (event.dataTransfer?.types.includes('Files')) {
    isPageDragging.value = true
  }
}

function handlePageDragOver(event: DragEvent) {
  event.preventDefault()

  if (event.dataTransfer?.types.includes('Files')) {
    isPageDragging.value = true
  }
}

function handlePageDragLeave(_event: DragEvent) {
  dragCounter.value--

  if (dragCounter.value <= 0) {
    dragCounter.value = 0
    isPageDragging.value = false
  }
}

function handlePageDrop(event: DragEvent) {
  // Always clear overlay, even if we don't handle the drop
  isPageDragging.value = false
  dragCounter.value = 0

  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length > 0) {
    event.preventDefault()
    event.stopPropagation()
    handleFilesSelected(files)
  }
}

function clearPageDragState() {
  isPageDragging.value = false
  dragCounter.value = 0
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length > 0) {
    handleFilesSelected(files)
  }
  // Reset input so same file can be selected again
  if (target) target.value = ''
}

// Settings preview
const settingsPreview = computed(() => {
  const parts: string[] = []

  if (options.value.to === 'original') {
    parts.push('Keep original format')
  } else {
    parts.push(`Shift to ${options.value.to.toUpperCase()}`)
  }

  if (options.value.to !== 'png' && options.value.to !== 'original') {
    parts.push(`${Math.round(options.value.quality * 100)}% quality`)
  }

  if (resizeMode.value === 'scale' && scalePercent.value !== 100) {
    parts.push(`Scale to ${scalePercent.value}%`)
  } else if (resizeMode.value === 'longEdge') {
    parts.push(`Resize long edge to ${longEdgeSize.value}px`)
  } else if (resizeMode.value === 'custom') {
    if (customWidth.value && customHeight.value) {
      parts.push(`Resize to ${customWidth.value}×${customHeight.value}`)
    } else if (customWidth.value) {
      parts.push(`Resize width to ${customWidth.value}px`)
    } else if (customHeight.value) {
      parts.push(`Resize height to ${customHeight.value}px`)
    }
  }

  if (options.value.stripExif) {
    parts.push('Strip EXIF')
  }

  return parts.join(' • ')
})

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

// Watch for newly completed jobs and auto-download
watch(
  () => queueStore.completedJobs.length,
  async (newCount, oldCount) => {
    if (!autoDownload.value) return
    if (newCount <= oldCount) return

    // Find recently completed job(s)
    const recentlyCompleted = queueStore.completedJobs.filter(job => {
      return job.completedAt && Date.now() - job.completedAt < 1000
    })

    for (const job of recentlyCompleted) {
      await handleDownload(job)
    }
  }
)

function getJobTargetFormat(job: Job): ExtendedImageFormat {
  if (job.outputFormat) {
    return job.outputFormat
  }

  const originalFormat = inferOriginalImageFormat(job.file)
  if (originalFormat) {
    return originalFormat === 'svg' ? 'svg' : originalFormat
  }

  return inferProcessingFormat(job.file)
}

async function convertSVGToPNG(file: File, targetSize: number): Promise<Blob> {
  const svgText = await file.text()

  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
  const svgElement = svgDoc.documentElement

  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number)
  let width = parseFloat(svgElement.getAttribute('width') || '0')
  let height = parseFloat(svgElement.getAttribute('height') || '0')

  if (!width && !height && viewBox && viewBox.length >= 4) {
    width = viewBox[2]!
    height = viewBox[3]!
  }

  const fallbackEdge = Math.round(Math.sqrt(1_000_000))

  if (!width && !height) {
    width = fallbackEdge
    height = fallbackEdge
  } else if (!width && height) {
    width = Math.round((fallbackEdge * fallbackEdge) / Math.max(height, 1))
  } else if (width && !height) {
    height = Math.round((fallbackEdge * fallbackEdge) / Math.max(width, 1))
  }

  if (!width || !height || width <= 0 || height <= 0) {
    width = targetSize
    height = targetSize
  }

  const maxEdge = Math.max(width, height)
  if (maxEdge > 0 && targetSize > 0 && maxEdge !== targetSize) {
    const scale = targetSize / maxEdge
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))
  }

  const blob = new Blob([svgText], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(url)
        if (pngBlob) {
          resolve(pngBlob)
        } else {
          reject(new Error('Failed to create PNG blob'))
        }
      }, 'image/png')
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG'))
    }

    img.src = url
  })
}

function formatStats() {
  const completed = queueStore.completedJobs.filter(j => j.result)
  if (completed.length === 0) return ''

  const originalSize = completed.reduce((sum, job) => sum + job.file.size, 0)
  const newSize = completed.reduce((sum, job) => {
    const size = Array.isArray(job.result) ? job.result[0]!.size : job.result!.size
    return sum + size
  }, 0)

  const saved = originalSize - newSize
  const percent = Math.round((saved / originalSize) * 100)

  return `${formatFileSize(originalSize)} → ${formatFileSize(newSize)} (${percent >= 0 ? '-' : '+'}${Math.abs(percent)}%)`
}

async function handleFilesSelected(files: File[]) {
  let addedCount = 0

  const queueSingleFile = async (file: File, options: { pageIndex?: number; buffer?: ArrayBuffer } = {}) => {
    const jobId = queueStore.addJob({
      file,
      kind: 'image',
      status: 'idle',
      originalDimensions: undefined,
      thumbnail: undefined,
      sourcePage: options.pageIndex
    })

    addedCount++

    const [dimensions, thumbnail] = await Promise.all([
      getImageDimensions(file, { pageIndex: options.pageIndex, buffer: options.buffer }),
      generateThumbnail(file, 48, { pageIndex: options.pageIndex, buffer: options.buffer })
    ]).catch(error => {
      console.error('Failed to generate metadata for file:', error)
      return [null, null] as const
    })

    queueStore.updateJob(jobId, {
      originalDimensions: dimensions || undefined,
      thumbnail: thumbnail || undefined
    })

    let thumbnailBlob: Blob | undefined
    if (thumbnail) {
      try {
        const response = await fetch(thumbnail)
        thumbnailBlob = await response.blob()
      } catch (e) {
        console.warn('Failed to convert thumbnail to blob')
      }
    }

    await storeQueueJob({
      id: jobId,
      file,
      originalDimensions: dimensions || undefined,
      thumbnailBlob,
      sourcePage: options.pageIndex
    })

    if (thumbnail) {
      URL.revokeObjectURL(thumbnail)
    }
  }

  for (const file of files) {
    if (!isFormatSupported(file)) {
      toastStore.error('Unsupported Format', `${file.name} is not a supported image format`)
      continue
    }

    if (file.size > 100 * 1024 * 1024) {
      toastStore.warning(
        'Large File',
        `${file.name} is ${Math.round(file.size / 1024 / 1024)}MB. Processing may be slow.`
      )
    }

    const lowerName = file.name.toLowerCase()

    if (lowerName.endsWith('.tif') || lowerName.endsWith('.tiff') || file.type === 'image/tiff') {
      try {
        const buffer = await file.arrayBuffer()
        const { getPageCount } = await import('@/workers/codecs/local-tiff')
        const pageCount = await getPageCount(buffer)

        if (pageCount > 1) {
          for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
            await queueSingleFile(file, { pageIndex, buffer })
          }
          continue
        }

        await queueSingleFile(file, { pageIndex: 0, buffer })
        continue
      } catch (error) {
        console.error('Failed to process multi-page TIFF:', error)
        toastStore.error('TIFF Error', `Could not process ${file.name}`)
        continue
      }
    }

    await queueSingleFile(file)
  }

  if (addedCount > 0) {
    toastStore.success('Files Added', `${addedCount} file${addedCount > 1 ? 's' : ''} added to queue`)
  }
}

async function startConversion() {
  const pendingJobs = queueStore.pendingJobs
  const count = pendingJobs.length
  const startTime = performance.now()

  // Process all files in parallel
  await Promise.all(
    pendingJobs.map(async (job) => {
      try {
        queueStore.updateJobStatus(job.id, 'running')

        const originalFormat = inferOriginalImageFormat(job.file)
        const requestedFormat = options.value.to
        const desiredFormat: UiImageFormat = requestedFormat === 'original'
          ? (originalFormat ?? inferProcessingFormat(job.file))
          : requestedFormat

        const needsSvgOutput = desiredFormat === 'svg'
        const workerFormat: ImageFormat = needsSvgOutput ? 'png' : desiredFormat as ImageFormat
        const needsResize = Boolean(
          options.value.scale ||
          options.value.width ||
          options.value.height ||
          options.value.longEdge
        )
        const isSvgSource = originalFormat === 'svg'

        queueStore.updateJob(job.id, {
          outputFormat: (needsSvgOutput ? 'svg' : workerFormat) as ExtendedImageFormat,
          outputDimensions: undefined
        })

        if (needsSvgOutput && isSvgSource && !needsResize) {
          // Preserve original SVG when no raster processing is required
          queueStore.setJobResult(job.id, job.file)
          queueStore.updateJob(job.id, {
            outputDimensions: job.originalDimensions ?? undefined,
            outputFormat: 'svg' as ExtendedImageFormat
          })
          return
        }

        let fileToProcess = job.file

        // Pre-process SVG files (convert to PNG in main thread)
        if (isSvgSource) {
          queueStore.updateJobStage(job.id, 'Rendering SVG...')

          const size = options.value.longEdge || options.value.width || options.value.height || 1000
          const pngBlob = await convertSVGToPNG(job.file, size)

          fileToProcess = new File([pngBlob], job.file.name.replace(/\.svg$/i, '.png'), {
            type: 'image/png'
          })
        }

        const result = await imageWorker.convert(
          fileToProcess,
          {
            ...toRaw(options.value),
            to: workerFormat
          },
          (progress) => {
            queueStore.updateJobProgress(job.id, progress)
          },
          (stage) => {
            queueStore.updateJobStage(job.id, stage)
          }
        )

        let finalBlob: Blob = result.blob
        let finalFormat: ExtendedImageFormat = workerFormat

        if (needsSvgOutput) {
          finalBlob = await wrapImageBlobAsSvg(result.blob, result.width, result.height)
          finalFormat = 'svg'
        }

        queueStore.setJobResult(job.id, finalBlob)
        queueStore.updateJob(job.id, {
          outputDimensions: { width: result.width, height: result.height },
          outputFormat: finalFormat
        })
      } catch (error) {
        console.error('Conversion failed:', error)
        queueStore.setJobError(job.id, error instanceof Error ? error.message : 'Conversion failed')
        toastStore.error(
          'Processing Failed',
          `Failed to process ${job.file.name}`
        )
      }
    })
  )

  const elapsed = Math.round((performance.now() - startTime) / 1000)
  const errorCount = queueStore.errorJobs.length

  // Calculate stats
  const originalTotalSize = pendingJobs.reduce((sum, job) => sum + job.file.size, 0)
  const completed = queueStore.completedJobs.filter(job =>
    pendingJobs.some(pj => pj.id === job.id) && job.result
  )
  const newTotalSize = completed.reduce((sum, job) => {
    const size = Array.isArray(job.result) ? job.result[0]!.size : job.result!.size
    return sum + size
  }, 0)
  const savedBytes = originalTotalSize - newTotalSize
  const percentChange = originalTotalSize > 0 ? Math.round((savedBytes / originalTotalSize) * 100) : 0
  const sizeSummary = savedBytes >= 0
    ? `Saved ${formatFileSize(savedBytes)} (${percentChange}% compression)`
    : `Larger by ${formatFileSize(Math.abs(savedBytes))} (${Math.abs(percentChange)}% increase)`

  if (errorCount === 0) {
    toastStore.success(
      'Processing Complete',
      `${count} files in ${elapsed}s • ${sizeSummary}`
    )
  } else if (errorCount < count) {
    toastStore.warning(
      'Partially Complete',
      `${count - errorCount} succeeded, ${errorCount} failed in ${elapsed}s`
    )
  }
}

async function handleDownload(job: Job) {
  if (!job.result) return
  const blob = Array.isArray(job.result) ? job.result[0]! : job.result
  const targetFormat = getJobTargetFormat(job)
  const filename = generateOutputFilename(
    job.file.name,
    targetFormat,
    settingsStore.outputNamingPattern,
    {
      width: job.outputDimensions?.width ?? job.originalDimensions?.width,
      height: job.outputDimensions?.height ?? job.originalDimensions?.height,
      page: job.sourcePage != null ? job.sourcePage + 1 : undefined
    }
  )
  await downloadFile(blob, filename)

  // Remove from storage after download
  try {
    console.log('[Download] Removing job from IDB:', job.id)
    await removeQueueJob(job.id)
    console.log('[Download] Successfully removed from IDB')
  } catch (error) {
    console.error('[Download] Failed to remove from IDB:', error)
  }
}

async function downloadAll() {
  const completedIds = queueStore.completedJobs.map(j => j.id)

  const files = queueStore.completedJobs.map(job => ({
    blob: Array.isArray(job.result) ? job.result[0]! : job.result!,
    filename: generateOutputFilename(
      job.file.name,
      getJobTargetFormat(job),
      settingsStore.outputNamingPattern,
      {
        width: job.outputDimensions?.width ?? job.originalDimensions?.width,
        height: job.outputDimensions?.height ?? job.originalDimensions?.height,
        page: job.sourcePage != null ? job.sourcePage + 1 : undefined
      }
    )
  }))

  const timestamp = new Date().toISOString().split('T')[0]
  await downloadAsZip(files, `shifteo-${timestamp}.zip`)

  // Clear completed files from storage after ZIP download
  for (const id of completedIds) {
    await removeQueueJob(id)
  }

  toastStore.success(
    'Download Complete',
    `${files.length} file${files.length > 1 ? 's' : ''} downloaded as ZIP`
  )
}

async function handleRetry(jobId: string) {
  queueStore.retryJob(jobId)
}
</script>
