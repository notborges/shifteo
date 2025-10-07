<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="modal-container bracket-corners"
          ref="modalContainer"
          @click.stop
          role="dialog"
          aria-modal="true"
          tabindex="-1"
        >
          <div class="modal-header">
            <div class="modal-title mono">{{ job?.file.name }}</div>
            <button @click="closeModal" class="modal-close" aria-label="Close">
              <X :size="20" />
            </button>
          </div>

          <div class="modal-body">
            <div class="modal-comparison modal-comparison--desktop">
              <div class="comparison-slider" ref="sliderContainer">
                <div class="comparison-layer">
                  <img
                    v-if="processedImageUrl"
                    :src="processedImageUrl"
                    class="comparison-image"
                    alt="After"
                  />
                </div>

                <div
                  class="comparison-layer comparison-layer--overlay"
                  :style="{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }"
                >
                  <img
                    v-if="originalImageUrl"
                    :src="originalImageUrl"
                    class="comparison-image"
                    alt="Before"
                  />
                </div>

                <div class="comparison-label comparison-label--overlay comparison-label--left">
                  BEFORE
                </div>
                <div class="comparison-label comparison-label--overlay comparison-label--right">
                  AFTER
                </div>

                <div
                  class="comparison-divider-slider"
                  :style="{ left: `${sliderPosition}%` }"
                  @mousedown="startDrag"
                  @touchstart="startDrag"
                >
                  <div class="comparison-handle">
                    <ChevronLeft :size="16" />
                    <ChevronRight :size="16" />
                  </div>
                </div>
              </div>

              <div class="comparison-stats">
                <div class="stat-item">
                  <span class="stat-label">Original</span>
                  <span class="stat-value mono">
                    <template v-if="job?.originalDimensions">
                      {{ job.originalDimensions.width }}×{{ job.originalDimensions.height }} •
                    </template>
                    {{ formatFileSize(job?.file.size || 0) }}
                  </span>
                </div>
                <div class="stat-divider">→</div>
                <div class="stat-item">
                  <span class="stat-label">Processed</span>
                  <span class="stat-value mono" :class="sizeChangeClass">
                    <template v-if="job?.outputDimensions">
                      {{ job.outputDimensions.width }}×{{ job.outputDimensions.height }} •
                    </template>
                    {{ formatFileSize(resultSize) }} ({{ sizeChangePercent }})
                  </span>
                </div>
              </div>
            </div>

            <div class="modal-comparison modal-comparison--mobile">
              <div class="comparison-panel-mobile">
                <div class="comparison-label">BEFORE</div>
                <div class="comparison-image-container-mobile">
                  <img
                    v-if="originalImageUrl"
                    :src="originalImageUrl"
                    :alt="`${job?.file.name} - original`"
                    class="comparison-image-mobile"
                  />
                </div>
                <div class="comparison-meta-mobile">
                  <span v-if="job?.originalDimensions">{{ job.originalDimensions.width }}×{{ job.originalDimensions.height }}</span>
                  <span>{{ formatFileSize(job?.file.size || 0) }}</span>
                </div>
              </div>

              <div class="comparison-panel-mobile">
                <div class="comparison-label">AFTER</div>
                <div class="comparison-image-container-mobile">
                  <img
                    v-if="processedImageUrl"
                    :src="processedImageUrl"
                    :alt="`${job?.file.name} - processed`"
                    class="comparison-image-mobile"
                  />
                </div>
                <div class="comparison-meta-mobile">
                  <span v-if="job?.outputDimensions">{{ job.outputDimensions.width }}×{{ job.outputDimensions.height }}</span>
                  <span :class="sizeChangeClass">{{ formatFileSize(resultSize) }} ({{ sizeChangePercent }})</span>
                  <span v-if="formatChanged" class="text-acc-info">{{ originalFormat?.toUpperCase() }} → {{ targetFormat?.toUpperCase() }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <UiButton
              @click="handleDownload"
              variant="solid"
              tone="accent"
              size="lg"
            >
              Download
            </UiButton>
            <UiButton
              @click="closeModal"
              variant="quiet"
            >
              Close
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import UiButton from './ui/UiButton.vue'
import { formatFileSize, inferOriginalImageFormat } from '@/utils/format'
import type { Job } from '@/workers/types'

interface Props {
  job: Job | null
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  download: [job: Job]
}>()

const originalImageUrl = ref<string | null>(null)
const processedImageUrl = ref<string | null>(null)
const sliderPosition = ref(50)
const isDragging = ref(false)
const sliderContainer = ref<HTMLElement | null>(null)
const modalContainer = ref<HTMLElement | null>(null)

watch(() => props.job, (job) => {
  if (originalImageUrl.value) {
    URL.revokeObjectURL(originalImageUrl.value)
    originalImageUrl.value = null
  }
  if (processedImageUrl.value) {
    URL.revokeObjectURL(processedImageUrl.value)
    processedImageUrl.value = null
  }

  if (!job) return

  originalImageUrl.value = URL.createObjectURL(job.file)

  if (job.result) {
    const blob = Array.isArray(job.result) ? job.result[0] : job.result
    if (blob) {
      processedImageUrl.value = URL.createObjectURL(blob)
    }
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (originalImageUrl.value) URL.revokeObjectURL(originalImageUrl.value)
  if (processedImageUrl.value) URL.revokeObjectURL(processedImageUrl.value)
})

const resultSize = computed(() => {
  if (!props.job?.result) return 0
  return Array.isArray(props.job.result) ? props.job.result[0]!.size : props.job.result.size
})

const sizeChangePercent = computed(() => {
  if (!props.job?.result || !props.job.file.size) return ''
  const change = ((resultSize.value - props.job.file.size) / props.job.file.size) * 100
  return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
})

const sizeChangeClass = computed(() => {
  if (!props.job?.result) return ''
  return resultSize.value < props.job.file.size ? 'text-success' : 'text-warning'
})

const originalFormat = computed(() => (props.job ? inferOriginalImageFormat(props.job.file) : null))

const targetFormat = computed(() => props.job?.outputFormat ?? null)

const formatChanged = computed(() => {
  if (!originalFormat.value || !targetFormat.value) return false
  return originalFormat.value !== targetFormat.value
})

onMounted(() => {
  if (props.isOpen) {
    modalContainer.value?.focus()
  }
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    sliderPosition.value = 50
    setTimeout(() => modalContainer.value?.focus(), 100)
  }
})

function startDrag(event: MouseEvent | TouchEvent) {
  isDragging.value = true
  event.preventDefault()

  const moveHandler = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value || !sliderContainer.value) return

    const rect = sliderContainer.value.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    if (clientX === undefined) return

    const x = clientX - rect.left
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))

    sliderPosition.value = percent
  }

  const endHandler = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', moveHandler)
    document.removeEventListener('mouseup', endHandler)
    document.removeEventListener('touchmove', moveHandler)
    document.removeEventListener('touchend', endHandler)
  }

  document.addEventListener('mousemove', moveHandler)
  document.addEventListener('mouseup', endHandler)
  document.addEventListener('touchmove', moveHandler)
  document.addEventListener('touchend', endHandler)
}

function closeModal() {
  emit('close')
}

function handleDownload() {
  if (props.job) {
    emit('download', props.job)
  }
}
</script>
