<template>
  <div>
    <div class="file-row">
      <div class="file-row__status">
        <span class="status-dot" :style="statusDotStyle" />
      </div>
      <div class="file-row__name mono">
        {{ job.file.name }}
      </div>
      <div class="file-row__meta mono">
        {{ formatFileSize(job.file.size) }}
      </div>
      <div class="text-center text-text-muted">
        <ArrowRight :size="16" v-if="job.result || job.status === 'running'" />
      </div>
      <div class="file-row__meta mono">
        <template v-if="job.status === 'running'">
          Processing
        </template>
        <template v-else-if="job.status === 'completed' && job.result">
          <span :class="sizeChangeClass">
            {{ formatFileSize(Array.isArray(job.result) ? job.result[0]!.size : job.result.size) }}
          </span>
        </template>
        <template v-else-if="job.status === 'error'">
          <span class="text-error">Error</span>
        </template>
        <template v-else>
          Ready
        </template>
      </div>
      <div class="file-row__meta mono" :class="sizeChangeClass">
        <span v-if="job.result">{{ sizeChangePercent }}</span>
      </div>
      <div class="file-row__actions">
        <button
          v-if="job.status === 'completed' && job.result"
          @click="emit('download', job)"
          class="file-row__button"
          type="button"
          title="Download"
        >
          <Download :size="16" />
        </button>
        <button
          v-if="job.status === 'error'"
          @click="emit('retry', job.id)"
          class="file-row__button"
          type="button"
          title="Retry"
        >
          <RotateCw :size="16" />
        </button>
        <button
          @click="emit('remove', job.id)"
          class="file-row__button"
          type="button"
          title="Remove"
        >
          <X :size="16" />
        </button>
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
import { Download, RotateCw, X, ArrowRight } from 'lucide-vue-next'
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

const statusDotStyle = computed(() => {
  switch (props.job.status) {
    case 'running':
      return { background: 'var(--color-acc-error)' }
    case 'completed':
      return { background: 'var(--color-acc-success)' }
    case 'error':
      return { background: 'var(--color-acc-error)' }
    default:
      return { background: 'var(--color-text-muted)' }
  }
})
</script>
