<template>
  <div
    class="drop-zone"
    :class="[
      isDragging ? 'drop-zone--active' : '',
      disabled ? 'drop-zone--disabled' : 'cursor-pointer'
    ]"
    @click="handleClick"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Content -->
    <Upload :size="48" class="drop-zone__icon" :stroke-width="1.5" />

    <div class="drop-zone__title">
      Drop Files Here
    </div>
    <div class="drop-zone__subtitle">
      or click to browse
    </div>

    <div class="drop-zone__formats">
      <span class="drop-zone__chip">PNG</span>
      <span class="drop-zone__chip">JPEG</span>
      <span class="drop-zone__chip">WEBP</span>
      <span class="drop-zone__chip">AVIF</span>
    </div>

    <input
      ref="fileInput"
      type="file"
      :multiple="multiple"
      :accept="accept"
      class="hidden"
      @change="handleFileSelect"
      :disabled="disabled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Upload } from 'lucide-vue-next'

interface Props {
  multiple?: boolean
  accept?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true,
  accept: '',
  disabled: false
})

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function handleClick() {
  if (props.disabled) return
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
  }
  if (target) target.value = ''
}

function handleDragOver(event: DragEvent) {
  if (props.disabled) return
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event: DragEvent) {
  if (props.disabled) return
  event.preventDefault()
  isDragging.value = false

  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
  }
}
</script>
