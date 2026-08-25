<template>
  <div
    class="presence"
    :class="{
      'presence--comparing': isComparing,
      'presence--shifting': phase === 'shifting',
      'presence--done': phase === 'done',
      'presence--format-hover': hoveredFormat
    }"
    @wheel.prevent="onWheel"
  >
    <TransitionGroup name="image-enter" :move-class="''">
      <div
        v-for="(job, i) in jobs"
        :key="job.id"
        class="image-layer"
        :class="{
          'image-layer--active': i === activeImageIndex,
          'image-layer--before': i < activeImageIndex,
          'image-layer--after': i > activeImageIndex
        }"
        :style="getLayerStyle(i)"
      >
        <div class="image-wrapper" :style="getWrapperStyle(job, i)">
          <img
            :src="isComparing ? getOriginalUrl(job) : getPreviewUrl(job)"
            :style="getImagePreviewStyle(i)"
            @click.stop="selectImage(i)"
            @pointerdown="i === activeImageIndex && startCompare()"
            @pointerup="endCompare"
            @pointerleave="endCompare"
            @mousemove="i === activeImageIndex && onImageMouseMove($event)"
            @mouseleave="onImageMouseLeave"
          />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { Job } from '@/app/types'

type Phase = 'ready' | 'shifting' | 'done'

interface Recipe {
  cropAspect: string | null
  brightness: number
  contrast: number
  saturation: number
  filter: string | null
  rotate: number | null
  flipH: boolean
  flipV: boolean
}

const { jobs, activeImageIndex, phase, isComparing, hoveredFormat, recipe, formats } = defineProps<{
  jobs: Job[]
  activeImageIndex: number
  phase: Phase
  isComparing: boolean
  hoveredFormat: string | null
  recipe: Recipe
  formats: string[]
}>()

const emit = defineEmits<{
  (e: 'select-image', index: number): void
  (e: 'compare-start'): void
  (e: 'compare-end'): void
  (e: 'wheel', event: WheelEvent): void
}>()

const imageHover = ref({ x: 0, y: 0, active: false })
const originalUrls = new Map<string, string>()

const imagePreviewStyle = computed(() => {
  const transforms: string[] = []
  const filters: string[] = []

  if (recipe.rotate) {
    transforms.push(`rotate(${recipe.rotate}deg)`)
  }

  if (recipe.flipH || recipe.flipV) {
    const scaleX = recipe.flipH ? -1 : 1
    const scaleY = recipe.flipV ? -1 : 1
    transforms.push(`scale(${scaleX}, ${scaleY})`)
  }

  if (recipe.filter) {
    switch (recipe.filter) {
      case 'grayscale': filters.push('grayscale(1)'); break
      case 'sepia': filters.push('sepia(1)'); break
      case 'vintage': filters.push('saturate(0.8) sepia(0.2) contrast(0.85) brightness(1.02)'); break
      case 'warm': filters.push('sepia(0.15) saturate(1.1) brightness(1.02)'); break
      case 'cool': filters.push('hue-rotate(10deg) saturate(0.95) brightness(1.02)'); break
      case 'vivid': filters.push('saturate(1.3) contrast(1.15)'); break
      case 'dramatic': filters.push('grayscale(1) contrast(1.5)'); break
      case 'fade': filters.push('contrast(0.75) brightness(1.1)'); break
    }
  }

  if (recipe.brightness !== 0) {
    filters.push(`brightness(${(100 + recipe.brightness) / 100})`)
  }
  if (recipe.contrast !== 0) {
    filters.push(`contrast(${(100 + recipe.contrast) / 100})`)
  }
  if (recipe.saturation !== 0) {
    filters.push(`saturate(${(100 + recipe.saturation) / 100})`)
  }

  return {
    transform: transforms.length ? transforms.join(' ') : undefined,
    filter: filters.length ? filters.join(' ') : undefined
  }
})

function isImageVisible(index: number): boolean {
  return Math.abs(index - activeImageIndex) <= 2
}

function getCropClipPath(job: Job): string | undefined {
  if (!recipe.cropAspect || !job.originalDimensions) return undefined

  const { width: imageWidth, height: imageHeight } = job.originalDimensions
  const [ratioWidth, ratioHeight] = recipe.cropAspect.split(':').map(Number) as [number, number]
  const targetRatio = ratioWidth / ratioHeight
  const currentRatio = imageWidth / imageHeight

  let insetX = 0
  let insetY = 0

  if (currentRatio > targetRatio) {
    const cropWidth = imageHeight * targetRatio
    insetX = ((imageWidth - cropWidth) / imageWidth / 2) * 100
  } else {
    const cropHeight = imageWidth / targetRatio
    insetY = ((imageHeight - cropHeight) / imageHeight / 2) * 100
  }

  return `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}%)`
}

function getWrapperStyle(job: Job, index: number): Record<string, string | undefined> {
  if (isComparing || !isImageVisible(index)) return {}
  return { clipPath: getCropClipPath(job) }
}

function getImagePreviewStyle(index: number): Record<string, string | undefined> {
  if (isComparing || !isImageVisible(index)) return {}

  const base = imagePreviewStyle.value
  if (index !== activeImageIndex) return base

  let rotateX = 0
  let rotateY = 0

  if (imageHover.value.active) {
    const maxRotation = 8
    rotateY = (imageHover.value.x - 0.5) * maxRotation * 2
    rotateX = (0.5 - imageHover.value.y) * maxRotation * 2
  } else if (hoveredFormat && phase === 'ready') {
    const formatIndex = formats.indexOf(hoveredFormat.toLowerCase())
    if (formatIndex !== -1) {
      rotateY = ((formatIndex / (formats.length - 1)) - 0.5) * -12
      rotateX = -3
    }
  }

  if (rotateX === 0 && rotateY === 0) return base

  const hoverTransform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  return {
    ...base,
    transform: base.transform ? `${base.transform} ${hoverTransform}` : hoverTransform
  }
}

function getLayerStyle(index: number) {
  const total = jobs.length
  const diff = index - activeImageIndex
  const compact = phase === 'shifting' || phase === 'done'

  if (total === 1 || diff === 0) {
    return {
      zIndex: total === 1 ? 10 : 50,
      transform: 'translateX(0) translateY(0) scale(1) rotate(0deg)',
      opacity: 1,
      filter: 'blur(0)'
    }
  }

  const depth = Math.abs(diff)
  if (depth > 2 || (compact && depth > 1)) {
    const direction = diff < 0 ? -1 : 1
    const xShift = 3 * (compact ? 15 : 35)
    return {
      zIndex: 0,
      transform: `translateX(${direction * xShift}vw) translateY(36px) scale(0.55) rotate(${direction * 15}deg)`,
      opacity: 0,
      visibility: 'hidden' as const
    }
  }

  const baseShift = compact ? 15 : 35
  const baseRotation = compact ? 3 : 5
  const xShift = depth * baseShift
  const yShift = depth * 12
  const scale = 1 - depth * 0.15
  const rotation = depth * baseRotation * (diff < 0 ? -1 : 1)

  return {
    zIndex: 40 - depth,
    transform: `translateX(${diff < 0 ? '-' : ''}${xShift}vw) translateY(${yShift}px) scale(${scale}) rotate(${rotation}deg)`,
    opacity: compact ? 0.3 : 0.45 - depth * 0.12,
    filter: `blur(${depth * 4}px)`
  }
}

function getOriginalUrl(job: Job): string {
  if (!originalUrls.has(job.id)) {
    originalUrls.set(job.id, URL.createObjectURL(job.file))
  }
  return originalUrls.get(job.id)!
}

function getPreviewUrl(job: Job): string {
  return getOriginalUrl(job)
}

function selectImage(index: number) {
  if (index !== activeImageIndex) emit('select-image', index)
}

function startCompare() {
  emit('compare-start')
}

function endCompare() {
  emit('compare-end')
}

function onWheel(event: WheelEvent) {
  emit('wheel', event)
}

function onImageMouseMove(event: MouseEvent) {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  imageHover.value = {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
    active: true
  }
}

function onImageMouseLeave() {
  imageHover.value = { x: 0.5, y: 0.5, active: false }
}

function revokeUrls(ids?: Set<string>) {
  for (const [id, url] of originalUrls) {
    if (!ids || !ids.has(id)) {
      URL.revokeObjectURL(url)
      originalUrls.delete(id)
    }
  }
}

watch(() => new Set(jobs.map(job => job.id)), ids => revokeUrls(ids))

onUnmounted(() => revokeUrls())
</script>

<style scoped>
.presence {
  position: relative;
  flex: 1;
  min-height: 120px;
  width: 100%;
  max-width: 90vw;
  margin: 12px auto;
  transition: margin 0.3s var(--ease-immersive);
}

.presence--comparing .image-layer--active { opacity: 0.85; }
.presence--shifting { margin-bottom: 140px; }
.presence--done { margin-bottom: 280px; }

.image-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.5s var(--ease-immersive),
    opacity 0.5s var(--ease-immersive),
    filter 0.5s var(--ease-immersive);
  pointer-events: none;
}

.image-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.image-wrapper img {
  max-width: 90%;
  max-height: 100%;
  width: auto;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.4s ease, filter 0.3s ease, transform 0.4s var(--ease-immersive);
  cursor: pointer;
  pointer-events: auto;
  animation: image-appear 0.6s var(--ease-immersive) backwards;
}

.image-layer--active img {
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

@keyframes image-appear {
  from { opacity: 0; transform: scale(0.85) translateY(20px); }
  to { opacity: 1; }
}

.image-enter-leave-active img {
  animation: image-disappear 0.4s var(--ease-immersive);
}

.image-enter-move { transition: none !important; }

@keyframes image-disappear {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.85) translateY(-20px); }
}

.presence--format-hover .image-layer--active img {
  box-shadow: 0 35px 100px rgba(var(--immersive-accent-rgb), 0.16), 0 30px 80px rgba(0, 0, 0, 0.5);
}
</style>
