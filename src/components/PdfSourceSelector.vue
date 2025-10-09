<template>
  <div class="pdf-source-selector">
    <label class="body-text text-text-secondary uppercase tracking-wider text-xs">{{ label }}</label>
    <div class="selector-controls">
      <UiButton
        type="button"
        size="sm"
        variant="solid"
        :tone="isOpen ? 'accent' : 'default'"
        :disabled="disabled || !queueItems.length"
        @click="togglePicker"
      >
        {{ selectedId ? changeText : chooseText }}
      </UiButton>
      <UiButton
        type="button"
        size="sm"
        variant="quiet"
        tone="warning"
        :disabled="!selectedId || disabled"
        @click="handleClear"
      >
        {{ clearText }}
      </UiButton>
    </div>
    <div v-if="isOpen" class="selector-panel">
      <button
        v-for="item in queueItems"
        :key="`selector-${item.id}`"
        type="button"
        class="selector-item"
        :class="{ 'selector-item--active': selectedId === item.id }"
        :disabled="disabled"
        @click="handleSelect(item.id)"
      >
        <span class="selector-item__name mono truncate">{{ item.file.name }}</span>
        <span class="selector-item__meta">{{ formatFileSize(item.file.size) }}</span>
      </button>
      <p v-if="!queueItems.length" class="selector-empty">Queue is empty</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { formatFileSize } from '@/utils/format'

interface QueueItem {
  id: string
  file: File
  thumbnail?: string | null
  loading?: boolean
}

interface Props {
  queueItems: QueueItem[]
  selectedId?: string | null
  disabled?: boolean
  label?: string
  chooseText?: string
  changeText?: string
  clearText?: string
}

withDefaults(defineProps<Props>(), {
  selectedId: null,
  disabled: false,
  label: 'Queue PDF',
  chooseText: 'Choose from queue',
  changeText: 'Change PDF',
  clearText: 'Clear PDF'
})

const emit = defineEmits<{
  select: [id: string]
  clear: []
}>()

const isOpen = ref(false)

function togglePicker() {
  isOpen.value = !isOpen.value
}

function handleSelect(id: string) {
  emit('select', id)
  isOpen.value = false
}

function handleClear() {
  emit('clear')
  isOpen.value = false
}
</script>

<style scoped>
.pdf-source-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  min-width: 220px;
}

.selector-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  align-items: center;
}

.selector-panel {
  margin-top: var(--space-8);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  background: var(--color-bg-inset);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  max-height: 220px;
  overflow-y: auto;
}

.selector-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-12);
  padding: var(--space-8) var(--space-12);
  border: 1px solid transparent;
  border-radius: var(--radius-panel);
  background: transparent;
  cursor: pointer;
  transition: border-color var(--motion-fast) ease, background-color var(--motion-fast) ease;
}

.selector-item:hover:not(:disabled) {
  border-color: var(--color-line-key);
  background: var(--color-bg-panel);
}

.selector-item--active {
  border-color: var(--color-acc-error);
  background: rgba(255, 92, 92, 0.08);
}

.selector-item__name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--type-body-size);
  color: var(--color-text-primary);
  text-align: left;
}

.selector-item__meta {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.selector-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selector-empty {
  font-size: var(--type-body-size);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-8);
}
</style>
