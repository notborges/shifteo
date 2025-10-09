<template>
  <div class="pdf-queue-list">
    <p v-if="hint" class="queue-hint body-text text-text-muted text-sm">{{ hint }}</p>
    <div class="queue-items" role="list">
      <div
        v-for="item in items"
        :key="item.id"
        class="queue-item"
        :class="{
          'queue-item--dragging': draggingId === item.id,
          'queue-item--clickable': clickable,
          'queue-item--active': activeItemId === item.id
        }"
        :draggable="draggable && !locked"
        @click="clickable && !locked ? $emit('click', item) : null"
        @dragstart="handleDragStart($event, item.id)"
        @dragend="handleDragEnd"
      >
        <div class="queue-item__main">
          <div class="queue-item__thumb" aria-hidden="true">
            <img v-if="item.thumbnail" :src="item.thumbnail" alt="" />
            <div v-else class="queue-item__thumb-placeholder">
              <FileText :size="16" />
            </div>
          </div>
          <div class="queue-item__meta">
            <span class="mono truncate">{{ item.file.name }}</span>
            <span class="queue-item__size">{{ formatFileSize(item.file.size) }}</span>
          </div>
          <div v-if="badges && getItemBadges(item.id).length" class="queue-item__badges">
            <UiBadge v-for="tag in getItemBadges(item.id)" :key="tag">{{ tag }}</UiBadge>
          </div>
        </div>
        <div class="queue-item__actions">
          <UiButton
            v-if="showPreview"
            variant="quiet"
            size="sm"
            icon-only
            title="Preview"
            @click="$emit('preview', item)"
          >
            <Eye :size="16" />
          </UiButton>
          <UiButton
            v-if="showDownload"
            variant="quiet"
            size="sm"
            icon-only
            title="Download"
            @click="$emit('download', item)"
          >
            <Download :size="16" />
          </UiButton>
          <UiButton
            variant="destructive"
            size="sm"
            icon-only
            title="Remove from queue"
            :disabled="locked"
            @click="$emit('remove', item.id)"
          >
            <X :size="16" />
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import { FileText, Eye, Download, X } from 'lucide-vue-next'
import { formatFileSize } from '@/utils/format'

interface QueueItem {
  id: string
  file: File
  thumbnail?: string | null
  loading?: boolean
}

interface Props {
  items: QueueItem[]
  locked?: boolean
  draggable?: boolean
  clickable?: boolean
  activeItemId?: string | null
  hint?: string
  badges?: Map<string, string[]>
  showPreview?: boolean
  showDownload?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  locked: false,
  draggable: false,
  clickable: false,
  activeItemId: null,
  hint: '',
  badges: undefined,
  showPreview: true,
  showDownload: true
})

const emit = defineEmits<{
  click: [item: QueueItem]
  preview: [item: QueueItem]
  download: [item: QueueItem]
  remove: [id: string]
  dragStart: [event: DragEvent, id: string]
  dragEnd: []
}>()

const draggingId = ref<string | null>(null)

function handleDragStart(event: DragEvent, id: string) {
  draggingId.value = id
  emit('dragStart', event, id)
}

function handleDragEnd() {
  draggingId.value = null
  emit('dragEnd')
}

function getItemBadges(id: string): string[] {
  return props.badges?.get(id) ?? []
}
</script>

<style scoped>
.pdf-queue-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.queue-hint {
  margin-bottom: var(--space-8);
}

.queue-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-12);
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-line-hair);
  border-radius: var(--radius-panel);
  background: rgba(255, 255, 255, 0.01);
  cursor: grab;
  transition: border-color var(--motion-fast) ease,
              background-color var(--motion-fast) ease,
              transform var(--motion-fast) ease,
              box-shadow var(--motion-fast) ease;
}

.queue-item--clickable {
  cursor: pointer;
}

.queue-item:hover {
  border-color: var(--color-line-key);
  background: rgba(255, 255, 255, 0.02);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.queue-item--clickable:hover {
  border-color: var(--color-acc-error);
  box-shadow: 0 2px 12px rgba(255, 92, 92, 0.2);
}

.queue-item--active {
  border-color: var(--color-acc-error);
  background: rgba(255, 92, 92, 0.05);
  box-shadow: 0 0 0 1px rgba(255, 92, 92, 0.3);
}

.queue-item:active {
  cursor: grabbing;
}

.queue-item--dragging {
  opacity: 0.6;
  border-color: var(--color-acc-error);
}

.queue-item__main {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  flex: 1 1 auto;
  min-width: 0;
}

.queue-item__thumb {
  width: 48px;
  height: 64px;
  border-radius: var(--radius-chip);
  background: var(--color-bg-inset);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--color-line-key);
}

.queue-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.queue-item__thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.queue-item__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  flex: 1 1 auto;
}

.queue-item__meta .mono {
  font-size: var(--type-body-size);
  color: var(--color-text-primary);
}

.queue-item__size {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  color: var(--color-text-muted);
}

.queue-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.queue-item__actions {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity var(--motion-fast) ease;
}

.queue-item:hover .queue-item__actions,
.queue-item:focus-within .queue-item__actions {
  opacity: 1;
}
</style>
