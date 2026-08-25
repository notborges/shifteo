<template>
  <div
    class="home-page"
    @dragenter="handlePageDragEnter"
    @dragover.prevent="handlePageDragOver"
    @dragleave="handlePageDragLeave"
    @drop.prevent="handlePageDrop"
  >
    <Transition name="drag-overlay">
      <div v-if="isPageDragging && state !== 'idle' && (state !== 'images' || imageProcessorPhase === 'ready')" class="page-drag-overlay">
        <div class="page-drag-warmth"></div>

        <div class="page-drag-words">
          <span class="page-drag-word page-drag-word--add">Add</span>
          <span class="page-drag-word page-drag-word--more">more</span>
        </div>

        <div class="page-drag-gateway">
          <div class="page-drag-ring"></div>
        </div>

        <div class="page-drag-formats">
          <span>png</span>
          <span>jpg</span>
          <span>webp</span>
          <span>avif</span>
          <span>heic</span>
          <span>svg</span>
        </div>
      </div>
    </Transition>

    <DropZone
      v-if="state === 'idle'"
      @files="handleFilesDropped"
    />

    <ImageProcessor
      v-else-if="state === 'images'"
      :initial-files="pendingFiles"
      :initial-state="restoredSessionState"
      @reset="handleReset"
      @phase-change="imageProcessorPhase = $event"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DropZone from '@/components/DropZone.vue'
import ImageProcessor from '@/components/ImageProcessor.vue'
import { useQueueStore } from '@/app/stores/queue'
import { useToastStore } from '@/app/stores/toast'
import { restoreQueueJobs, restoreSessionState, storeQueueJob, clearSessionState } from '@/utils/idb'
import { getImageDimensions, generateThumbnail } from '@/utils/file'
import { isFormatSupported } from '@/utils/format'
import { QUEUE_THUMBNAIL_SIZE } from '@/constants/image'
import type { ExtendedImageFormat } from '@/constants/image'

type AppState = 'idle' | 'images'

const queueStore = useQueueStore()
const toastStore = useToastStore()

const state = ref<AppState>('idle')
const pendingFiles = ref<File[]>([])
const imageProcessorPhase = ref<'ready' | 'shifting' | 'done'>('ready')

const restoredSessionState = ref<{
  phase?: 'ready' | 'shifting' | 'done'
  recipe?: {
    format: string | null
    resize: number | null
    cropAspect: string | null
    brightness: number
    contrast: number
    saturation: number
    sharpness: number
    filter: string | null
    rotate: number | null
    flipH: boolean
    flipV: boolean
  }
  activeImageIndex?: number
} | undefined>(undefined)

const isPageDragging = ref(false)
const dragCounter = ref(0)

function isImageFile(file: File): boolean {
  return isFormatSupported(file)
}

function classifyFiles(files: File[]): { images: File[]; unsupported: File[] } {
  const images: File[] = []
  const unsupported: File[] = []

  for (const file of files) {
    if (isImageFile(file)) {
      images.push(file)
    } else {
      unsupported.push(file)
    }
  }

  return { images, unsupported }
}

async function addImagesToQueue(images: File[]) {
  for (const file of images) {
    const id = queueStore.addJob({ file, status: 'idle', originalDimensions: undefined, thumbnail: undefined })
    const [dims, thumb] = await Promise.all([
      getImageDimensions(file).catch(() => null),
      generateThumbnail(file, QUEUE_THUMBNAIL_SIZE).catch(() => null)
    ])
    queueStore.updateJob(id, { originalDimensions: dims || undefined, thumbnail: thumb || undefined })
    const tb = thumb ? await fetch(thumb).then(response => response.blob()).catch(() => undefined) : undefined
    await storeQueueJob({ id, file, originalDimensions: dims || undefined, thumbnailBlob: tb })
  }
}

function handleFilesDropped(files: File[]) {
  isPageDragging.value = false
  dragCounter.value = 0

  const { images, unsupported } = classifyFiles(files)

  if (unsupported.length > 0) {
    toastStore.warning(
      'Unsupported Files',
      `${unsupported.length} file${unsupported.length > 1 ? 's' : ''} skipped (unsupported format)`
    )
  }

  if (images.length > 0) {
    if (state.value === 'images') {
      if (imageProcessorPhase.value !== 'ready') {
        return
      }
      addImagesToQueue(images)
      toastStore.success('Added', `${images.length} image${images.length > 1 ? 's' : ''} added`)
    } else {
      pendingFiles.value = images
      state.value = 'images'
    }
  }
}

async function handleReset() {
  await queueStore.clearAll()
  await clearSessionState()
  pendingFiles.value = []
  restoredSessionState.value = undefined
  imageProcessorPhase.value = 'ready'
  state.value = 'idle'
}

function handlePageDragEnter(event: DragEvent) {
  event.preventDefault()
  dragCounter.value++
  if (event.dataTransfer?.types.includes('Files')) isPageDragging.value = true
}

function handlePageDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer?.types.includes('Files')) isPageDragging.value = true
}

function handlePageDragLeave() {
  dragCounter.value--
  if (dragCounter.value <= 0) { dragCounter.value = 0; isPageDragging.value = false }
}

function handlePageDrop(event: DragEvent) {
  isPageDragging.value = false
  dragCounter.value = 0
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length > 0) {
    event.preventDefault()
    event.stopPropagation()
    handleFilesDropped(files)
  }
}

async function handlePaste(event: ClipboardEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  const items = event.clipboardData?.items
  if (!items) return

  const imageFiles: File[] = []
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        const ext = file.type.split('/')[1] || 'png'
        const pastedFile = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type })
        imageFiles.push(pastedFile)
      }
    }
  }

  if (imageFiles.length > 0) {
    event.preventDefault()
    handleFilesDropped(imageFiles)
    toastStore.success('Pasted', `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} added from clipboard`)
  }
}

onMounted(async () => {
  document.addEventListener('paste', handlePaste)

  const sessionState = await restoreSessionState()

  const restoredJobs = await restoreQueueJobs()
  if (restoredJobs.length > 0) {
    for (const job of restoredJobs) {
      const status = job.status === 'completed' ? 'completed' : 'idle'
      queueStore.restoreJob({
        id: job.id,
        file: job.file,
        status: status,
        originalDimensions: job.originalDimensions,
        thumbnail: job.thumbnailUrl,
        result: job.resultBlob,
        outputDimensions: job.outputDimensions,
        outputFormat: job.outputFormat as ExtendedImageFormat | undefined
      })
    }

    if (sessionState) {
      restoredSessionState.value = sessionState
    }

    state.value = 'images'
  }
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
</script>

<style scoped>
.home-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-void);
}

.page-drag-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 18, 22, 0.96);
  z-index: 1000;
}

.page-drag-warmth {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(var(--immersive-accent-rgb), 0.22) 0%,
    rgba(var(--immersive-accent-rgb), 0.1) 40%,
    transparent 60%
  );
  filter: blur(60px);
  pointer-events: none;
  animation: warmth-grow 0.5s var(--ease-immersive) forwards;
}

@keyframes warmth-grow {
  from {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 1;
  }
}

.page-drag-words {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  pointer-events: none;
  z-index: 10;
}

.page-drag-word {
  font-family: var(--font-display);
  font-size: clamp(48px, 12vw, 80px);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.9;
  color: var(--immersive-text-bright);
}

.page-drag-word--add {
  animation: word-part-up 0.6s var(--ease-immersive) forwards;
}

.page-drag-word--more {
  animation: word-part-down 0.6s var(--ease-immersive) forwards;
}

@keyframes word-part-up {
  from {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 1;
  }
  to {
    transform: translateY(-40px) translateX(-30px) rotate(-2deg);
    opacity: 0.7;
  }
}

@keyframes word-part-down {
  from {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 1;
  }
  to {
    transform: translateY(40px) translateX(30px) rotate(2deg);
    opacity: 0.7;
  }
}

.page-drag-gateway {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  pointer-events: none;
  animation: gateway-appear 0.5s var(--ease-immersive) forwards;
}

@keyframes gateway-appear {
  from {
    opacity: 0;
    width: 100px;
    height: 100px;
  }
  to {
    opacity: 1;
    width: 180px;
    height: 180px;
  }
}

.page-drag-ring {
  position: absolute;
  inset: 0;
  border: 2px solid var(--immersive-accent-border-hover);
  border-radius: 50%;
}

.page-drag-formats {
  position: absolute;
  bottom: 120px;
  left: 50%;
  display: flex;
  gap: 20px;
  pointer-events: none;
  animation: formats-rise 0.6s var(--ease-immersive) forwards;
}

@keyframes formats-rise {
  from {
    transform: translateX(-50%) translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.page-drag-formats span {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--immersive-text-bright);
}

.drag-overlay-enter-active,
.drag-overlay-leave-active {
  transition: opacity var(--duration-normal) ease;
}

.drag-overlay-enter-from,
.drag-overlay-leave-to {
  opacity: 0;
}
</style>
