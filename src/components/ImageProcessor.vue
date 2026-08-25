<template>
  <div
    class="image-processor"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <div class="deep"></div>
    <div class="glow" :class="[glowState, { 'glow--format-hover': hoveredFormat }]"></div>

    <SiteNav @home="handleReset" />

    <div v-if="firstJob" class="stage" :class="{ 'stage--shifting': phase === 'shifting', 'stage--done': phase === 'done' }">

      <div class="recipe-container" :class="{ 'recipe-container--done': phase === 'done' }">
        <TransitionGroup name="pill" tag="div" class="recipe">
          <span
            v-if="recipe.format"
            key="format"
            class="pill"
            :class="{ 'pill--interactive': phase === 'ready' }"
            @click="phase === 'ready' && (recipe.format = null)"
          >
            {{ recipe.format }}
            <span v-if="phase === 'ready'" class="pill-x">×</span>
          </span>
          <span
            v-if="recipe.resize"
            key="resize"
            class="pill"
            :class="{ 'pill--interactive': phase === 'ready' }"
            @click="phase === 'ready' && (recipe.resize = null, expanded = expanded === 'reshape' ? null : expanded)"
          >
            {{ recipe.resize }}%
            <span v-if="phase === 'ready'" class="pill-x">×</span>
          </span>
          <span
            v-if="recipe.cropAspect"
            key="crop"
            class="pill"
            :class="{ 'pill--interactive': phase === 'ready' }"
            @click="phase === 'ready' && (recipe.cropAspect = null)"
          >
            crop {{ recipe.cropAspect }}
            <span v-if="phase === 'ready'" class="pill-x">×</span>
          </span>
          <span
            v-if="hasAdjustments"
            key="adjust"
            class="pill"
            :class="{ 'pill--interactive': phase === 'ready' }"
            @click="phase === 'ready' && (recipe.brightness = 0, recipe.contrast = 0, recipe.saturation = 0, recipe.sharpness = 0)"
          >
            adjusted
            <span v-if="phase === 'ready'" class="pill-x">×</span>
          </span>
          <span
            v-if="recipe.filter"
            key="filter"
            class="pill"
            :class="{ 'pill--interactive': phase === 'ready' }"
            @click="phase === 'ready' && (recipe.filter = null)"
          >
            {{ recipe.filter }}
            <span v-if="phase === 'ready'" class="pill-x">×</span>
          </span>
          <span
            v-if="recipe.rotate"
            key="rotate"
            class="pill"
            :class="{ 'pill--interactive': phase === 'ready' }"
            @click="phase === 'ready' && (recipe.rotate = null)"
          >
            {{ recipe.rotate }}°
            <span v-if="phase === 'ready'" class="pill-x">×</span>
          </span>
          <span
            v-if="recipe.flipH || recipe.flipV"
            key="flip"
            class="pill"
            :class="{ 'pill--interactive': phase === 'ready' }"
            @click="phase === 'ready' && (recipe.flipH = false, recipe.flipV = false)"
          >
            flip{{ recipe.flipH && recipe.flipV ? ' HV' : recipe.flipH ? ' H' : ' V' }}
            <span v-if="phase === 'ready'" class="pill-x">×</span>
          </span>
        </TransitionGroup>
      </div>

      <ImageStage
        :jobs="jobs"
        :active-image-index="activeImageIndex"
        :phase="phase"
        :is-comparing="isComparing"
        :hovered-format="hoveredFormat"
        :recipe="recipe"
        :formats="formats"
        @select-image="activeImageIndex = $event"
        @compare-start="startCompare"
        @compare-end="endCompare"
        @wheel="onWheel"
      />

      <div v-if="phase === 'ready'" class="image-info">
        <div class="image-name-row">
          <span class="image-name">{{ activeJob?.file.name || 'untitled' }}</span>
          <button v-if="phase === 'ready'" class="image-remove" @click="deleteImage(activeJob!.id)">remove</button>
        </div>
        <span v-if="activeJob?.originalDimensions" class="image-dims">
          {{ activeJob.originalDimensions.width }} × {{ activeJob.originalDimensions.height }}
          <template v-if="recipe.resize && recipe.resize !== 100">
            → {{ Math.round(activeJob.originalDimensions.width * recipe.resize / 100) }} × {{ Math.round(activeJob.originalDimensions.height * recipe.resize / 100) }}
          </template>
          <span v-if="jobs.length > 1" class="image-count">{{ activeImageIndex + 1 }} of {{ jobs.length }}</span>
        </span>
        <div class="image-actions">
          <span v-if="hasRecipe && !isComparing" class="compare-hint">hold to compare</span>
          <button v-if="phase === 'ready' && hasRecipe" class="clear-all" @click="clearRecipe">clear all</button>
          <button v-if="phase === 'ready'" class="cancel-btn" @click="handleReset">cancel</button>
        </div>
      </div>

      <ImageControls
        :phase="phase"
        :formats="formats"
        :filters="filters"
        :capabilities="capabilities"
        :crop-aspects="cropAspects"
        :recipe="recipe"
        :expanded="expanded"
        :hovered-format="hoveredFormat"
        @update-recipe="updateRecipe"
        @toggle-capability="toggleCapability"
        @format-hover="hoveredFormat = $event"
      />

      <ImageResult
        :phase="phase"
        :has-recipe="Boolean(hasRecipe)"
        :format="recipe.format"
        :shift-progress="shiftProgress"
        :active-job="activeJob"
        :active-image-index="activeImageIndex"
        :job-count="jobs.length"
        @shift="shift"
        @cancel-shift="cancelShift"
        @download-current="downloadCurrent"
        @download-all="download"
        @try-again="tryAgain"
        @reset="handleReset"
      />

    </div>

    <input ref="fileInput" type="file" multiple :accept="acceptTypes" class="sr-only" @change="onFileInput" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, toRaw, nextTick } from 'vue'
import { useQueueStore } from '@/app/stores/queue'
import { useToastStore } from '@/app/stores/toast'
import ImageStage from '@/components/ImageStage.vue'
import ImageControls from '@/components/ImageControls.vue'
import ImageResult from '@/components/ImageResult.vue'
import SiteNav from '@/components/SiteNav.vue'
import { imageWorkerPool } from '@/workers/workerPool'
import { isFormatSupported, generateOutputFilename, inferOriginalImageFormat } from '@/utils/format'
import { getImageDimensions, generateThumbnail, downloadAsZip } from '@/utils/file'
import { storeQueueJob, removeQueueJob, storeSessionState, clearSessionState } from '@/utils/idb'
import {
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_OUTPUT_FORMAT,
  FILTER_PRESETS,
  QUEUE_THUMBNAIL_SIZE,
  SELECTABLE_OUTPUT_FORMATS,
  SUPPORTED_INPUT_ACCEPT,
  isImageFormat
} from '@/constants/image'
import type { FilterPreset, ImageFormat, ExtendedImageFormat } from '@/constants/image'

interface InitialState {
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
}

const props = defineProps<{
  initialFiles: File[]
  initialState?: InitialState
}>()
const emit = defineEmits<{
  (e: 'reset'): void
  (e: 'phase-change', phase: 'ready' | 'shifting' | 'done'): void
}>()

const queue = useQueueStore()
const toast = useToastStore()

type Phase = 'ready' | 'shifting' | 'done'
const restoredPhase = props.initialState?.phase
const phase = ref<Phase>(restoredPhase === 'shifting' ? 'ready' : (restoredPhase ?? 'ready'))
const expanded = ref<string | null>(null)
const isComparing = ref(false)
const shiftProgress = ref(0)
let shiftRunId = 0
const hoveredFormat = ref<string | null>(null)
const activeImageIndex = ref(props.initialState?.activeImageIndex ?? 0)

const recipe = reactive({
  format: props.initialState?.recipe?.format ?? null as string | null,
  resize: props.initialState?.recipe?.resize ?? null as number | null,
  brightness: props.initialState?.recipe?.brightness ?? 0,
  contrast: props.initialState?.recipe?.contrast ?? 0,
  saturation: props.initialState?.recipe?.saturation ?? 0,
  sharpness: props.initialState?.recipe?.sharpness ?? 0,
  filter: props.initialState?.recipe?.filter ?? null as string | null,
  rotate: props.initialState?.recipe?.rotate ?? null as number | null,
  flipH: props.initialState?.recipe?.flipH ?? false,
  flipV: props.initialState?.recipe?.flipV ?? false,
  cropAspect: props.initialState?.recipe?.cropAspect ?? null as string | null
})

const formats: string[] = [...SELECTABLE_OUTPUT_FORMATS]
const filters: string[] = [...FILTER_PRESETS]
const capabilities = [
  { id: 'reshape', label: 'reshape' },
  { id: 'crop', label: 'crop' },
  { id: 'adjust', label: 'adjust' },
  { id: 'filter', label: 'filter' },
  { id: 'transform', label: 'transform' }
]

const cropAspects = [
  { id: '1:1', label: '1:1' },
  { id: '4:3', label: '4:3' },
  { id: '3:2', label: '3:2' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' }
]

const acceptTypes = SUPPORTED_INPUT_ACCEPT

const jobs = computed(() => queue.jobs)
const firstJob = computed(() => jobs.value[0])
const activeJob = computed(() => jobs.value[activeImageIndex.value] || jobs.value[0])
const completed = computed(() => queue.completedJobs)

const hasRecipe = computed(() => {
  return recipe.format ||
    recipe.resize ||
    recipe.filter ||
    recipe.rotate ||
    recipe.flipH ||
    recipe.flipV ||
    recipe.cropAspect ||
    recipe.brightness !== 0 ||
    recipe.contrast !== 0 ||
    recipe.saturation !== 0 ||
    recipe.sharpness !== 0
})

const hasAdjustments = computed(() => {
  return recipe.brightness !== 0 || recipe.contrast !== 0 || recipe.saturation !== 0 || recipe.sharpness !== 0
})

const glowState = computed(() => ({
  'glow--shifting': phase.value === 'shifting',
  'glow--done': phase.value === 'done'
}))

let lastScrollTime = 0
const SCROLL_COOLDOWN = 150 // ms between scrolls

function onWheel(e: WheelEvent) {
  e.stopPropagation()

  if (jobs.value.length <= 1) return

  const now = Date.now()
  if (now - lastScrollTime < SCROLL_COOLDOWN) return
  lastScrollTime = now

  if (e.deltaY > 0) {
    activeImageIndex.value = (activeImageIndex.value + 1) % jobs.value.length
  } else {
    activeImageIndex.value = activeImageIndex.value === 0
      ? jobs.value.length - 1
      : activeImageIndex.value - 1
  }
}

function updateRecipe(changes: Partial<typeof recipe>) {
  Object.assign(recipe, changes)
}

function toggleCapability(id: string) {
  expanded.value = expanded.value === id ? null : id
}

function startCompare() {
  if (hasRecipe.value) isComparing.value = true
}

function endCompare() {
  isComparing.value = false
}

function clearRecipe() {
  recipe.format = null
  recipe.resize = null
  recipe.cropAspect = null
  recipe.brightness = 0
  recipe.contrast = 0
  recipe.saturation = 0
  recipe.sharpness = 0
  recipe.filter = null
  recipe.rotate = null
  recipe.flipH = false
  recipe.flipV = false
  expanded.value = null
}

async function handleReset() {
  await queue.clearAll()
  await clearSessionState()

  phase.value = 'ready'
  expanded.value = null
  recipe.format = null
  recipe.resize = null
  recipe.cropAspect = null
  recipe.brightness = 0
  recipe.contrast = 0
  recipe.saturation = 0
  recipe.sharpness = 0
  recipe.filter = null
  recipe.rotate = null
  recipe.flipH = false
  recipe.flipV = false

  emit('reset')
}

async function deleteImage(id: string) {
  await removeQueueJob(id)

  queue.removeJob(id)

  if (jobs.value.length === 0) {
    emit('reset')
  } else if (activeImageIndex.value >= jobs.value.length) {
    activeImageIndex.value = jobs.value.length - 1
  }
}

function onDrop(e: DragEvent) {
  e.stopPropagation()
  if (phase.value !== 'ready') return
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length) addFiles(files)
}

function onFileInput(e: Event) {
  if (phase.value !== 'ready') return
  const el = e.target as HTMLInputElement
  const files = Array.from(el.files || [])
  if (files.length) addFiles(files)
  el.value = ''
}

async function addFiles(files: File[]) {
  for (const file of files) {
    if (!isFormatSupported(file)) {
      toast.error('Unsupported', file.name)
      continue
    }
    const id = queue.addJob({ file, status: 'idle', originalDimensions: undefined, thumbnail: undefined })
    const [dims, thumb] = await Promise.all([
      getImageDimensions(file).catch(() => null),
      generateThumbnail(file, QUEUE_THUMBNAIL_SIZE).catch(() => null)
    ])
    queue.updateJob(id, { originalDimensions: dims || undefined, thumbnail: thumb || undefined })
    const tb = thumb ? await fetch(thumb).then(response => response.blob()).catch(() => undefined) : undefined
    await storeQueueJob({ id, file, originalDimensions: dims || undefined, thumbnailBlob: tb })
  }
}

async function shift() {
  if (!hasRecipe.value) return

  const runId = ++shiftRunId
  phase.value = 'shifting'
  shiftProgress.value = 0

  const total = jobs.value.length
  const jobProgress = new Map<string, number>()

  function updateTotalProgress() {
    if (total === 0) return
    let sum = 0
    for (const p of jobProgress.values()) {
      sum += p
    }
    shiftProgress.value = Math.round(sum / total)
  }

  await Promise.all(jobs.value.map(async (job) => {
    jobProgress.set(job.id, 0)
    if (runId !== shiftRunId) return

    try {
      queue.updateJobStatus(job.id, 'running')

      let file = job.file
      const orig = inferOriginalImageFormat(file)

      let targetFormat: ImageFormat
      if (recipe.format) {
        targetFormat = recipe.format as ImageFormat
      } else if (orig === 'svg') {
        targetFormat = 'png' // SVG defaults to PNG when no format selected
      } else if (orig && isImageFormat(orig)) {
        targetFormat = orig
      } else {
        targetFormat = DEFAULT_OUTPUT_FORMAT
      }

      const quality = targetFormat === 'png' ? 1 : DEFAULT_IMAGE_QUALITY

      let cropRegion: { x: number; y: number; width: number; height: number } | undefined
      if (recipe.cropAspect && recipe.cropAspect !== 'free' && job.originalDimensions) {
        const { width: imgW, height: imgH } = job.originalDimensions
        const [ratioW, ratioH] = recipe.cropAspect.split(':').map(Number) as [number, number]
        const targetRatio = ratioW / ratioH
        const currentRatio = imgW / imgH

        let cropW: number, cropH: number
        if (currentRatio > targetRatio) {
          cropH = imgH
          cropW = Math.round(imgH * targetRatio)
        } else {
          cropW = imgW
          cropH = Math.round(imgW / targetRatio)
        }
        cropRegion = {
          x: Math.round((imgW - cropW) / 2),
          y: Math.round((imgH - cropH) / 2),
          width: cropW,
          height: cropH
        }
      }

      const opts = {
        to: targetFormat,
        quality,
        scale: recipe.resize ? recipe.resize / 100 : undefined,
        rotation: recipe.rotate as 0 | 90 | 180 | 270 | undefined,
        flipH: recipe.flipH || undefined,
        flipV: recipe.flipV || undefined,
        crop: cropRegion,
        adjustments: hasAdjustments.value ? {
          brightness: recipe.brightness,
          contrast: recipe.contrast,
          saturation: recipe.saturation,
          sharpness: recipe.sharpness
        } : undefined,
        filter: recipe.filter ? recipe.filter as FilterPreset : undefined
      }

      if (orig === 'svg') {
        const png = await svgToPng(file)
        file = new File([png], job.file.name.replace(/\.svg$/i, '.png'), { type: 'image/png' })
      }

      const result = await imageWorkerPool.convert(file, opts, (progress) => {
        jobProgress.set(job.id, progress * 100)
        updateTotalProgress()
      })

      if (runId !== shiftRunId) return

      if (!result.blob || result.blob.size === 0) {
        throw new Error('Conversion produced empty result')
      }

      queue.setJobResult(job.id, result.blob)
      queue.updateJob(job.id, {
        outputDimensions: { width: result.width, height: result.height },
        outputFormat: targetFormat as ExtendedImageFormat
      })

      jobProgress.set(job.id, 100)
      updateTotalProgress()

      const currentJob = queue.getJobById(job.id)
      if (currentJob) {
        const thumbBlob = currentJob.thumbnail
          ? await fetch(currentJob.thumbnail).then(response => response.blob()).catch(() => undefined)
          : undefined
        await storeQueueJob({
          id: job.id,
          file: job.file,
          originalDimensions: currentJob.originalDimensions ? toRaw(currentJob.originalDimensions) : undefined,
          thumbnailBlob: thumbBlob,
          resultBlob: result.blob,
          outputDimensions: { width: result.width, height: result.height },
          outputFormat: targetFormat,
          status: 'completed'
        })
      }

    } catch (err) {
      if (runId !== shiftRunId) return
      console.error('[Shift] Error processing', job.file.name, ':', err)
      queue.setJobError(job.id, err instanceof Error ? err.message : 'Failed')
      toast.error('Failed', job.file.name)
    }
  }))

  if (runId !== shiftRunId) return

  phase.value = 'done'
  // Save state immediately (don't wait for debounce) to ensure persistence before potential reload
  storeSessionState({
    phase: 'done',
    recipe: {
      format: recipe.format,
      resize: recipe.resize,
      cropAspect: recipe.cropAspect,
      brightness: recipe.brightness,
      contrast: recipe.contrast,
      saturation: recipe.saturation,
      sharpness: recipe.sharpness,
      filter: recipe.filter,
      rotate: recipe.rotate,
      flipH: recipe.flipH,
      flipV: recipe.flipV
    },
    activeImageIndex: activeImageIndex.value
  })
}

function cancelShift() {
  shiftRunId++

  for (const job of jobs.value) {
    queue.updateJobStatus(job.id, 'idle')
  }

  phase.value = 'ready'
  shiftProgress.value = 0
}

async function tryAgain() {
  recipe.format = null
  recipe.resize = null
  recipe.cropAspect = null
  recipe.brightness = 0
  recipe.contrast = 0
  recipe.saturation = 0
  recipe.sharpness = 0
  recipe.filter = null
  recipe.rotate = null
  recipe.flipH = false
  recipe.flipV = false
  expanded.value = null

  for (const job of jobs.value) {
    queue.updateJobStatus(job.id, 'idle')
    queue.updateJob(job.id, { result: undefined, outputDimensions: undefined, outputFormat: undefined })
  }

  phase.value = 'ready'

  await nextTick()
  const len = jobs.value.length
  if (len > 1) {
    const current = activeImageIndex.value
    activeImageIndex.value = (current + 1) % len
    await nextTick()
    activeImageIndex.value = current
  }
}

async function svgToPng(file: File): Promise<Blob> {
  const text = await file.text()
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const el = doc.documentElement
  const vb = el.getAttribute('viewBox')?.split(' ').map(Number)
  let w = parseFloat(el.getAttribute('width') || '0')
  let h = parseFloat(el.getAttribute('height') || '0')
  if (!w && !h && vb?.length === 4) { w = vb[2]!; h = vb[3]! }
  if (!w || !h) { w = 1000; h = 1000 }
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d')?.drawImage(img, 0, 0, w, h)
      c.toBlob(b => {
        URL.revokeObjectURL(url)
        if (b) res(b)
        else rej(new Error('Failed to render SVG'))
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Failed to load SVG')) }
    img.src = url
  })
}

async function download() {
  const list = completed.value.filter(j => j.result).map(j => ({
    blob: j.result!,
    filename: generateOutputFilename(
      j.file.name,
      (j.outputFormat || recipe.format || DEFAULT_OUTPUT_FORMAT) as ExtendedImageFormat
    )
  }))

  if (!list.length) {
    toast.error('Nothing to download', 'No files were processed successfully')
    return
  }

  if (list.length === 1 && list[0]) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(list[0].blob)
    a.download = list[0].filename
    a.click()
    URL.revokeObjectURL(a.href)
  } else {
    await downloadAsZip(list, `shifteo-${new Date().toISOString().split('T')[0]}.zip`)
  }

  for (const j of completed.value) await removeQueueJob(j.id)
  toast.success('Saved', `${list.length} file${list.length > 1 ? 's' : ''}`)
}

async function downloadCurrent() {
  const job = activeJob.value
  if (!job?.result) {
    toast.error('Nothing to download', 'This file was not processed successfully')
    return
  }

  const blob = job.result

  const filename = generateOutputFilename(
    job.file.name,
    (job.outputFormat || recipe.format || DEFAULT_OUTPUT_FORMAT) as ExtendedImageFormat
  )

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)

  await removeQueueJob(job.id)

  const idx = jobs.value.findIndex(j => j.id === job.id)
  if (idx !== -1) {
    jobs.value.splice(idx, 1)
  }

  if (jobs.value.length === 0) {
    handleReset()
  } else {
    if (activeImageIndex.value >= jobs.value.length) {
      activeImageIndex.value = jobs.value.length - 1
    }
    toast.success('Saved', filename)
  }
}

function saveState() {
  storeSessionState({
    phase: phase.value,
    recipe: {
      format: recipe.format,
      resize: recipe.resize,
      cropAspect: recipe.cropAspect,
      brightness: recipe.brightness,
      contrast: recipe.contrast,
      saturation: recipe.saturation,
      sharpness: recipe.sharpness,
      filter: recipe.filter,
      rotate: recipe.rotate,
      flipH: recipe.flipH,
      flipV: recipe.flipV
    },
    activeImageIndex: activeImageIndex.value
  })
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSaveState() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveState, 300)
}

watch(phase, debouncedSaveState)

watch(phase, (newPhase) => {
  emit('phase-change', newPhase)
}, { immediate: true })
watch(activeImageIndex, debouncedSaveState)
watch(() => [
  recipe.format, recipe.resize, recipe.cropAspect, recipe.brightness, recipe.contrast,
  recipe.saturation, recipe.sharpness, recipe.filter, recipe.rotate, recipe.flipH,
  recipe.flipV
], debouncedSaveState, { deep: true })

watch(() => jobs.value.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    activeImageIndex.value = oldLen
  }
})

onMounted(async () => {
  if (props.initialFiles.length) await addFiles(props.initialFiles)
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
})
</script>

<style scoped>
/* === PROCESSOR === */
.image-processor {
  position: fixed;
  inset: 0;
  background: var(--bg-void);
  overflow: hidden;
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: none;
  max-height: 100vh;
  max-height: 100dvh;
}

.deep {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 130% 100% at 50% 25%,
    rgba(20, 24, 29, 1) 0%,
    var(--bg-void) 65%
  );
}

.glow {
  position: absolute;
  top: 32%;
  left: 50%;
  width: 900px;
  height: 900px;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(var(--immersive-accent-rgb), 0.07) 0%,
    rgba(var(--immersive-accent-rgb), 0.018) 45%,
    transparent 70%
  );
  filter: blur(100px);
  pointer-events: none;
}

.glow--format-hover {
  width: 1000px;
  height: 1000px;
  background: radial-gradient(
    circle,
    rgba(var(--immersive-accent-rgb), 0.13) 0%,
    rgba(var(--immersive-accent-rgb), 0.045) 45%,
    transparent 70%
  );
  transition: all 0.4s ease-out;
}

.glow--shifting {
  width: 1200px;
  height: 1200px;
  background: radial-gradient(
    circle,
    rgba(var(--immersive-accent-rgb), 0.18) 0%,
    rgba(var(--immersive-accent-rgb), 0.065) 45%,
    transparent 70%
  );
  transition: all 0.8s ease-out;
}

.glow--done {
  width: 700px;
  height: 700px;
  background: radial-gradient(
    circle,
    rgba(131, 211, 173, 0.09) 0%,
    rgba(131, 211, 173, 0.025) 45%,
    transparent 65%
  );
  transition: all 1.2s ease;
}

/* === STAGE === */
.stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 70px 24px 0;
  z-index: 10;
  overflow: hidden;
  transition: padding 0.5s var(--ease-immersive);
}


/* === RECIPE === */
.recipe-container {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.recipe {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  position: relative;
}

.pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--immersive-accent-soft);
  border: 1px solid var(--immersive-accent-border);
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--immersive-accent);
  cursor: default;
  transition: all 0.4s var(--ease-immersive);
}

.pill--interactive {
  cursor: pointer;
}

.pill--interactive:hover {
  background: var(--immersive-accent-hover);
  border-color: var(--immersive-accent-border-hover);
}

.pill-x {
  opacity: 0.6;
  font-size: 14px;
  font-weight: 400;
}

/* === IMAGE INFO === */
.image-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 16px;
  flex-shrink: 0;
}

.image-name {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--immersive-text-muted);
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-dims {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--immersive-text);
  display: flex;
  align-items: center;
  gap: 16px;
}

.image-count {
  color: var(--immersive-ember-muted);
  font-weight: 400;
  font-size: 11px;
}

.compare-hint {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--immersive-ember-soft);
}

.image-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 4px;
}

.clear-all,
.cancel-btn {
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--immersive-ember-faint);
  cursor: pointer;
  transition: color 0.3s ease;
  padding: 4px 8px;
}

.clear-all:hover,
.cancel-btn:hover {
  color: var(--immersive-accent);
}

.image-name-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.image-remove {
  background: none;
  border: none;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--immersive-ember-whisper);
  cursor: pointer;
  transition: color 0.3s ease;
  padding: 2px 6px;
}

.image-remove:hover {
  color: var(--immersive-accent);
}

/* === TRANSITIONS === */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s var(--ease-immersive);
}
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Individual pill transitions */
.pill-enter-active {
  transition: all 0.4s var(--ease-immersive);
}
.pill-leave-active {
  transition: all 0.3s var(--ease-immersive);
}
.pill-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}
.pill-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.pill-move {
  transition: transform 0.4s var(--ease-immersive);
}

/* === UTILITIES === */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  border: 0;
}

/* === RESPONSIVE === */
@media (max-width: 640px) {
  .stage {
    padding-top: 60px;
  }

  .recipe-container {
    height: 40px;
  }

}

@media (max-height: 700px) {
  .stage {
    padding-top: 56px;
  }

  .recipe-container {
    height: 40px;
  }

  .image-info {
    margin-top: 8px;
    gap: 2px;
  }

}

/* Very short screens */
@media (max-height: 600px) {
  .stage {
    padding-top: 48px;
  }

}
</style>
