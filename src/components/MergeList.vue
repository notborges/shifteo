<template>
  <div v-if="items.length > 0" class="merge-list">
    <p class="body-text text-text-muted text-xs uppercase tracking-wider px-1">
      Drag to reorder. Items merge from top to bottom.
    </p>
    <div class="merge-items">
      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="merge-item"
        :class="{
          'merge-item--over': dragOverId === item.id,
          'merge-item--dragging': dragSourceId === item.id
        }"
        :draggable="!disabled"
        @dragstart="handleDragStart($event, item.id)"
        @dragover="handleDragOver($event, item.id)"
        @dragenter="handleDragEnter($event, item.id)"
        @dragleave="handleDragLeave($event, item.id)"
        @drop="handleDrop($event, item.id)"
        @dragend="handleDragEnd"
      >
        <span class="merge-item__order mono" aria-hidden="true">{{ index + 1 }}</span>
        <div class="merge-item__thumb" aria-hidden="true">
          <img v-if="item.thumbnail" :src="item.thumbnail" alt="" />
          <div v-else class="merge-item__thumb-placeholder">
            {{ item.loading ? 'Rendering…' : 'No preview' }}
          </div>
        </div>
        <div class="merge-item__meta">
          <div class="mono truncate">{{ item.file.name }}</div>
          <div class="text-xs text-text-muted">{{ formatFileSize(item.file.size) }}</div>
        </div>
        <div class="merge-item__actions">
          <UiButton
            type="button"
            variant="quiet"
            size="sm"
            icon-only
            :disabled="index === 0 || disabled"
            @click="$emit('move', item.id, 'up')"
            title="Move up"
          >
            <ArrowUp :size="16" />
          </UiButton>
          <UiButton
            type="button"
            variant="quiet"
            size="sm"
            icon-only
            :disabled="index === items.length - 1 || disabled"
            @click="$emit('move', item.id, 'down')"
            title="Move down"
          >
            <ArrowDown :size="16" />
          </UiButton>
          <UiButton
            type="button"
            variant="quiet"
            tone="warning"
            size="sm"
            icon-only
            :disabled="disabled"
            @click="$emit('remove', item.id)"
            title="Remove"
          >
            <Trash2 :size="16" />
          </UiButton>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="merge-empty">
    <p class="body-text text-text-muted">Add two or more PDFs to get started.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-vue-next'
import { formatFileSize } from '@/utils/format'

interface MergeItem {
  id: string
  file: File
  thumbnail: string | null
  loading: boolean
}

interface Props {
  items: MergeItem[]
  disabled?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  move: [id: string, direction: 'up' | 'down']
  remove: [id: string]
  reorder: [sourceId: string, targetId: string]
}>()

const dragSourceId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function handleDragStart(event: DragEvent, id: string) {
  dragSourceId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

function handleDragOver(event: DragEvent, _id: string) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragEnter(event: DragEvent, id: string) {
  event.preventDefault()
  if (dragSourceId.value && dragSourceId.value !== id) {
    dragOverId.value = id
  }
}

function handleDragLeave(event: DragEvent, id: string) {
  const target = event.currentTarget as HTMLElement
  const related = event.relatedTarget as HTMLElement
  if (!target.contains(related)) {
    if (dragOverId.value === id) {
      dragOverId.value = null
    }
  }
}

function handleDrop(event: DragEvent, targetId: string) {
  event.preventDefault()
  if (dragSourceId.value && dragSourceId.value !== targetId) {
    emit('reorder', dragSourceId.value, targetId)
  }
  dragOverId.value = null
}

function handleDragEnd() {
  dragSourceId.value = null
  dragOverId.value = null
}
</script>

<style scoped>
.merge-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.merge-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  padding: var(--space-12);
  background: var(--color-bg-inset);
  max-height: 280px;
  overflow-y: auto;
}

.merge-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-12);
  padding: var(--space-8) var(--space-8);
  border: 1px solid transparent;
  border-radius: var(--radius-panel);
  background: var(--color-bg-panel);
  cursor: grab;
  transition: border-color var(--motion-fast) ease,
              background-color var(--motion-fast) ease,
              box-shadow var(--motion-fast) ease,
              opacity var(--motion-fast) ease,
              transform var(--motion-fast) ease;
}

.merge-item:hover {
  border-color: var(--color-line-key);
  background: rgba(255, 255, 255, 0.02);
  transform: translateY(-1px);
}

.merge-item:active {
  cursor: grabbing;
}

.merge-item--dragging {
  opacity: 0.6;
  border-color: var(--color-line-key);
}

.merge-item--over {
  border-color: var(--color-acc-error);
  background: rgba(255, 92, 92, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 92, 92, 0.16);
}

.merge-item__order {
  width: 28px;
  flex: 0 0 auto;
  text-align: center;
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  color: var(--color-text-muted);
}

.merge-item--dragging .merge-item__order,
.merge-item--over .merge-item__order {
  color: var(--color-acc-error);
}

.merge-item__meta {
  min-width: 0;
  flex: 1 1 auto;
}

.merge-item__thumb {
  width: 60px;
  height: 80px;
  border-radius: var(--radius-chip);
  overflow: hidden;
  background: var(--color-bg-inset);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--color-line-key);
}

.merge-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.merge-item__thumb-placeholder {
  width: 100%;
  height: 100%;
  font-size: var(--type-meta-size);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8);
}

.merge-item__actions {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  opacity: 0.4;
  transition: opacity var(--motion-fast) ease;
}

.merge-item:hover .merge-item__actions,
.merge-item:focus-within .merge-item__actions {
  opacity: 1;
}

.merge-empty {
  padding: var(--space-16);
  border: 1px dashed var(--color-line-key);
  border-radius: var(--radius-panel);
  text-align: center;
}
</style>
