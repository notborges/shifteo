<template>
  <div class="file-item">
    <!-- Desktop layout -->
    <div class="file-item__desktop">
      <div
        class="file-row"
        :class="{ 'cursor-pointer': job.status === 'completed' && job.result }"
        @click="job.status === 'completed' && job.result && emit('preview', job)"
      >
        <div class="file-row__status">
          <span class="status-dot" :style="statusDotStyle" />
        </div>
        <div class="file-row__thumbnail">
          <img
            v-if="job.thumbnail"
            :src="job.thumbnail"
            :alt="job.file.name"
            class="file-thumbnail"
          />
          <div v-else class="file-thumbnail file-thumbnail--placeholder">
            <ImageIcon :size="20" />
          </div>
        </div>
        <div class="file-row__name">
          <div class="mono truncate">{{ job.file.name }}</div>
          <div v-if="formatChanged" class="file-row__format-badge">
            {{ originalFormat?.toUpperCase() }}
            <ArrowRight :size="10" class="inline mx-0.5" />
            {{ targetFormat?.toUpperCase() }}
          </div>
        </div>

        <div class="file-row__meta mono">
          <template v-if="job.status === 'running'">
            {{ job.stage || 'Processing' }}
          </template>
          <template v-else-if="job.status === 'completed' && job.result">
            <span class="text-text-muted">{{ formatFileSize(job.file.size) }}</span>
            <ArrowRight :size="14" class="inline mx-1 text-text-muted" />
            <span :class="sizeChangeClass">{{ formatFileSize(resultSize) }}</span>
            <span :class="sizeChangeClass" class="ml-1">({{ sizeChangePercent }})</span>
          </template>
          <template v-else-if="job.status === 'error'">
            <span class="text-error">Error</span>
          </template>
          <template v-else>
            {{ formatFileSize(job.file.size) }}
          </template>
        </div>
        <div class="file-row__meta file-row__dimensions mono text-text-muted">
          <template v-if="dimensionsChanged">
            <span class="text-text-muted">{{ job.originalDimensions!.width }}×{{ job.originalDimensions!.height }}</span>
            <ArrowRight :size="12" class="inline mx-1 text-text-muted" />
            <span class="text-text-secondary">{{ job.outputDimensions!.width }}×{{ job.outputDimensions!.height }}</span>
          </template>
          <template v-else-if="job.originalDimensions || job.outputDimensions">
            {{ (job.outputDimensions || job.originalDimensions)!.width }}×{{ (job.outputDimensions || job.originalDimensions)!.height }}
          </template>
        </div>
        <div class="file-row__actions">
          <UiButton
            v-if="job.status === 'completed' && job.result"
            @click.stop="emit('download', job)"
            variant="quiet"
            size="sm"
            icon-only
            type="button"
            title="Download"
          >
            <Download :size="16" />
          </UiButton>
          <UiButton
            v-if="job.status === 'error'"
            @click.stop="emit('retry', job.id)"
            variant="quiet"
            tone="warning"
            size="sm"
            icon-only
            type="button"
            title="Retry"
          >
            <RotateCw :size="16" />
          </UiButton>
          <UiButton
            @click.stop="emit('remove', job.id)"
            variant="destructive"
            size="sm"
            icon-only
            type="button"
            title="Remove"
          >
            <X :size="16" />
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Mobile layout -->
    <div class="file-item__mobile">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="status-dot flex-shrink-0" :style="statusDotStyle" />
          <img
            v-if="job.thumbnail"
            :src="job.thumbnail"
            :alt="job.file.name"
            class="file-thumbnail-mobile"
          />
          <div class="min-w-0 flex-1">
            <div class="mono text-sm truncate">{{ job.file.name }}</div>
            <div v-if="formatChanged" class="file-row__format-badge">
              {{ originalFormat?.toUpperCase() }}
              <ArrowRight :size="10" class="inline mx-0.5" />
              {{ targetFormat?.toUpperCase() }}
            </div>
          </div>
        </div>
        <div class="file-row__actions flex-shrink-0">
          <UiButton
            v-if="job.status === 'completed' && job.result"
            @click.stop="emit('download', job)"
            variant="quiet"
            size="sm"
            icon-only
            type="button"
            title="Download"
          >
            <Download :size="16" />
          </UiButton>
          <UiButton
            v-if="job.status === 'error'"
            @click.stop="emit('retry', job.id)"
            variant="quiet"
            tone="warning"
            size="sm"
            icon-only
            type="button"
            title="Retry"
          >
            <RotateCw :size="16" />
          </UiButton>
          <UiButton
            @click.stop="emit('remove', job.id)"
            variant="destructive"
            size="sm"
            icon-only
            type="button"
            title="Remove"
          >
            <X :size="16" />
          </UiButton>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs mono text-text-muted gap-2">
        <div>
          <span v-if="job.status === 'running'">{{ job.stage || 'Processing' }}</span>
          <span v-else-if="job.status === 'completed' && job.result">
            {{ formatFileSize(job.file.size) }}
            <ArrowRight :size="12" class="inline mx-1" />
            {{ formatFileSize(resultSize) }}
            <span :class="sizeChangeClass">({{ sizeChangePercent }})</span>
          </span>
          <span v-else-if="job.status === 'error'" class="text-error">{{ job.error || 'Error' }}</span>
          <span v-else>{{ formatFileSize(job.file.size) }}</span>
        </div>

        <div v-if="dimensionsChanged || job.originalDimensions || job.outputDimensions" class="text-text-secondary">
          <template v-if="dimensionsChanged">
            {{ job.originalDimensions!.width }}×{{ job.originalDimensions!.height }}
            <ArrowRight :size="10" class="inline mx-1" />
            {{ job.outputDimensions!.width }}×{{ job.outputDimensions!.height }}
          </template>
          <template v-else>
            {{ (job.outputDimensions || job.originalDimensions)!.width }}×{{ (job.outputDimensions || job.originalDimensions)!.height }}
          </template>
        </div>
      </div>
    </div>

    <div v-if="job.status === 'running'" class="file-row__progress">
      <div class="file-row__progress-bar" :style="{ width: `${Math.round(job.progress * 100)}%` }" />
    </div>

    <div v-if="job.status === 'error' && job.error" class="file-row__error">
      {{ job.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Download, RotateCw, X, ArrowRight, ImageIcon } from 'lucide-vue-next'
import UiButton from '@/components/ui/UiButton.vue'
import type { Job } from '@/workers/types'
import { formatFileSize } from '@/utils/format'

interface Props {
  job: Job
}

const props = defineProps<Props>()

const emit = defineEmits<{
  download: [job: Job]
  retry: [id: string]
  remove: [id: string]
  preview: [job: Job]
}>()

const sizeChangePercent = computed(() => {
  if (!props.job.result) return ''

  const originalSize = props.job.file.size
  const newSize = Array.isArray(props.job.result) ? props.job.result[0]!.size : props.job.result.size
  const change = ((newSize - originalSize) / originalSize) * 100

  return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
})

const sizeChangeClass = computed(() => {
  if (!props.job.result) return ''

  const originalSize = props.job.file.size
  const newSize = Array.isArray(props.job.result) ? props.job.result[0]!.size : props.job.result.size

  return newSize < originalSize ? 'text-success' : 'text-warning'
})

const originalFormat = computed(() => {
  const ext = props.job.file.name.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'  // Normalize to 'jpeg'
  if (ext === 'png') return 'png'
  if (ext === 'webp') return 'webp'
  if (ext === 'avif') return 'avif'
  return null
})

const targetFormat = computed(() => {
  const opts = props.job.options as any
  if (!opts?.to) return null
  if (opts.to === 'original') return originalFormat.value
  return opts.to
})

const formatChanged = computed(() => {
  if (!originalFormat.value || !targetFormat.value) return false
  if (targetFormat.value === 'original') return false
  return originalFormat.value !== targetFormat.value
})

const resultSize = computed(() => {
  if (!props.job.result) return 0
  return Array.isArray(props.job.result) ? props.job.result[0]!.size : props.job.result.size
})

const dimensionsChanged = computed(() => {
  if (!props.job.originalDimensions || !props.job.outputDimensions) return false
  return props.job.originalDimensions.width !== props.job.outputDimensions.width ||
         props.job.originalDimensions.height !== props.job.outputDimensions.height
})

const statusDotStyle = computed(() => {
  switch (props.job.status) {
    case 'running':
      return {
        background: 'var(--color-acc-error)',
        boxShadow: 'var(--shadow-glow-error-sm)'
      }
    case 'completed':
      return {
        background: 'var(--color-acc-success)',
        boxShadow: 'var(--shadow-glow-success-sm)'
      }
    case 'error':
      return {
        background: 'var(--color-acc-error)',
        boxShadow: 'var(--shadow-glow-error-sm)'
      }
    default:
      return { background: 'var(--color-text-muted)' }
  }
})
</script>
