<template>
  <div v-if="pages.length > 0" class="organize-grid">
    <article
      v-for="(page, index) in pages"
      :key="page.id"
      class="organize-card"
      :class="{
        'organize-card--removed': page.removed,
        'organize-card--dragging': dragSourceId === page.id,
        'organize-card--over': dragOverId === page.id
      }"
      :draggable="!page.loading && !disabled"
      @dragstart="handleDragStart($event, page.id)"
      @dragover="handleDragOver($event, page.id)"
      @dragenter="handleDragEnter($event, page.id)"
      @dragleave="handleDragLeave($event, page.id)"
      @drop="handleDrop($event, page.id)"
      @dragend="handleDragEnd"
      :aria-label="`Page ${index + 1}`"
    >
      <header class="organize-card__header">
        <span class="organize-card__index">{{ index + 1 }}</span>
        <span class="organize-card__meta">Page {{ page.originalIndex }}</span>
      </header>
      <div class="organize-card__thumb" aria-hidden="true">
        <div v-if="page.loading" class="organize-card__thumb-placeholder">Loading…</div>
        <div v-else-if="page.thumbnail" class="organize-card__thumb-inner" :style="getRotationStyle(page.rotation)">
          <img :src="page.thumbnail" alt="" />
        </div>
        <div v-else class="organize-card__thumb-placeholder">No preview</div>
        <div v-if="page.removed" class="organize-card__removed-banner">Removed</div>
      </div>
      <footer class="organize-card__actions">
        <UiButton
          type="button"
          size="sm"
          variant="quiet"
          icon-only
          :disabled="page.loading || disabled"
          @click="$emit('rotate', page.id, 'left')"
          title="Rotate counter-clockwise"
        >
          <RotateCcw :size="16" />
        </UiButton>
        <UiButton
          type="button"
          size="sm"
          variant="quiet"
          icon-only
          :disabled="page.loading || disabled"
          @click="$emit('rotate', page.id, 'right')"
          title="Rotate clockwise"
        >
          <RotateCw :size="16" />
        </UiButton>
        <UiButton
          type="button"
          size="sm"
          variant="quiet"
          icon-only
          :tone="page.removed ? 'success' : 'warning'"
          :disabled="disabled"
          @click="$emit('toggleRemove', page.id)"
          :title="page.removed ? 'Restore page' : 'Remove page'"
        >
          <Undo2 v-if="page.removed" :size="16" />
          <Trash2 v-else :size="16" />
        </UiButton>
      </footer>
      <div class="organize-card__rotation" v-if="page.rotation !== 0">
        Rotated {{ page.rotation }}°
      </div>
    </article>
  </div>
  <div v-else class="organize-empty">
    <p class="body-text text-text-muted">Choose a PDF to start organising its pages.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { RotateCcw, RotateCw, Undo2, Trash2 } from 'lucide-vue-next'

interface OrganizePage {
  id: number
  originalIndex: number
  rotation: number
  removed: boolean
  thumbnail: string | null
  loading: boolean
}

interface Props {
  pages: OrganizePage[]
  disabled?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  rotate: [id: number, direction: 'left' | 'right']
  toggleRemove: [id: number]
  reorder: [sourceId: number, targetId: number]
}>()

const dragSourceId = ref<number | null>(null)
const dragOverId = ref<number | null>(null)

function handleDragStart(event: DragEvent, id: number) {
  dragSourceId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
  }
}

function handleDragOver(event: DragEvent, _id: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragEnter(event: DragEvent, id: number) {
  event.preventDefault()
  if (dragSourceId.value !== null && dragSourceId.value !== id) {
    dragOverId.value = id
  }
}

function handleDragLeave(event: DragEvent, id: number) {
  const target = event.currentTarget as HTMLElement
  const related = event.relatedTarget as HTMLElement
  if (!target.contains(related)) {
    if (dragOverId.value === id) {
      dragOverId.value = null
    }
  }
}

function handleDrop(event: DragEvent, targetId: number) {
  event.preventDefault()
  if (dragSourceId.value !== null && dragSourceId.value !== targetId) {
    emit('reorder', dragSourceId.value, targetId)
  }
  dragOverId.value = null
}

function handleDragEnd() {
  dragSourceId.value = null
  dragOverId.value = null
}

function getRotationStyle(rotation: number) {
  return {
    transform: `rotate(${rotation}deg)`,
    transition: 'transform 160ms ease'
  }
}
</script>

<style scoped>
.organize-grid {
  display: grid;
  gap: var(--space-12);
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

@media (min-width: 1280px) {
  .organize-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.organize-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-12);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  background: var(--color-bg-panel);
  cursor: grab;
  transition: border-color var(--motion-fast) ease,
              box-shadow var(--motion-fast) ease,
              opacity var(--motion-fast) ease,
              transform var(--motion-fast) ease;
}

.organize-card:hover:not(.organize-card--removed) {
  border-color: var(--color-text-muted);
  transform: translateY(-1px);
}

.organize-card:active {
  cursor: grabbing;
}

.organize-card--dragging {
  opacity: 0.6;
  border-color: var(--color-line-key);
}

.organize-card--over {
  border-color: var(--color-acc-error);
  box-shadow: 0 0 0 1px rgba(255, 92, 92, 0.2);
}

.organize-card--removed {
  opacity: 0.55;
}

.organize-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-text-secondary);
}

.organize-card__index {
  font-weight: 600;
  color: var(--color-text-primary);
}

.organize-card__thumb {
  position: relative;
  border-radius: var(--radius-chip);
  overflow: hidden;
  background: var(--color-bg-inset);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  border: 1px solid var(--color-line-key);
}

.organize-card__thumb img {
  max-width: 100%;
  height: auto;
  display: block;
}

.organize-card__thumb-inner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.organize-card__thumb-placeholder {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: var(--space-8);
  text-align: center;
}

.organize-card__removed-banner {
  position: absolute;
  inset: auto 0 0 0;
  padding: 0.35rem;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  font-family: var(--font-ui-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  text-align: center;
}

.organize-card__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0.4;
  transition: opacity var(--motion-fast) ease;
}

.organize-card:hover .organize-card__actions,
.organize-card:focus-within .organize-card__actions {
  opacity: 1;
}

.organize-card__rotation {
  font-family: var(--font-ui-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
  text-align: center;
}

.organize-empty {
  padding: var(--space-16);
  border: 1px dashed var(--color-line-key);
  border-radius: var(--radius-panel);
  text-align: center;
}
</style>
