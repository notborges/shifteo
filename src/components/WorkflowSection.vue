<template>
  <UiPanel class="workflow-section" :class="[`col-span-${colspan}`, { 'workflow-section--dropping': isDropping }]">
    <template #header>
      <div class="flex items-center gap-2">
        <component v-if="icon" :is="icon" :size="16" />
        <span>{{ title }}</span>
      </div>
      <span class="panel__meta">{{ subtitle }}</span>
    </template>

    <div
      class="workflow-content"
      @dragenter="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <slot />
    </div>
  </UiPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'
import UiPanel from '@/components/ui/UiPanel.vue'

interface Props {
  title: string
  subtitle?: string
  icon?: Component
  colspan?: number | string
  supportsDrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  icon: undefined,
  colspan: 12,
  supportsDrop: false
})

const emit = defineEmits<{
  drop: [event: DragEvent]
}>()

const isDropping = ref(false)
const dragCounter = ref(0)

function handleDragEnter(event: DragEvent) {
  if (!props.supportsDrop) return
  event.preventDefault()
  dragCounter.value++
  isDropping.value = true
}

function handleDragOver(event: DragEvent) {
  if (!props.supportsDrop) return
  event.preventDefault()
  isDropping.value = true
}

function handleDragLeave() {
  if (!props.supportsDrop) return
  dragCounter.value--
  if (dragCounter.value <= 0) {
    dragCounter.value = 0
    isDropping.value = false
  }
}

function handleDrop(event: DragEvent) {
  if (!props.supportsDrop) return
  event.preventDefault()
  isDropping.value = false
  dragCounter.value = 0
  emit('drop', event)
}
</script>

<style scoped>
.workflow-section {
  transition: border-color var(--motion-normal) ease,
              background-color var(--motion-normal) ease,
              box-shadow var(--motion-normal) ease;
}

.workflow-section--dropping {
  border-color: rgba(255, 92, 92, 0.6);
  background: rgba(255, 92, 92, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 92, 92, 0.2);
}

.workflow-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

/* Grid column span utilities */
.col-span-12 {
  grid-column: span 12 / span 12;
}

.col-span-6 {
  grid-column: span 6 / span 6;
}

@media (max-width: 1024px) {
  .col-span-6 {
    grid-column: span 12 / span 12;
  }
}
</style>
