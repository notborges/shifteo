<template>
  <div v-if="pages.length" class="split-page-grid">
    <button
      v-for="page in pages"
      :key="page.index"
      type="button"
      class="split-page-card"
      :class="{
        'split-page-card--selected': page.selected,
        'split-page-card--loading': page.loading,
        'split-page-card--disabled': disabled
      }"
      @pointerdown="handlePointerDown($event, page.index)"
      @pointerenter="handlePointerEnter(page.index)"
      @pointerup="handlePointerUp"
      :disabled="disabled"
    >
      <div class="split-page-card__thumb">
        <img v-if="page.thumbnail" :src="page.thumbnail" alt="" />
        <div v-else class="split-page-card__thumb-placeholder">
          {{ page.loading ? '…' : page.index }}
        </div>
      </div>
      <div class="split-page-card__label">Page {{ page.index }}</div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface SplitPage {
  index: number
  selected: boolean
  thumbnail: string | null
  loading: boolean
}

interface Props {
  pages: SplitPage[]
  disabled?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  togglePage: [index: number]
  selectRange: [start: number, end: number]
}>()

const isSelecting = ref(false)
const selectionStart = ref<number | null>(null)
const lastEntered = ref<number | null>(null)

function handlePointerDown(event: PointerEvent, index: number) {
  if (event.shiftKey && selectionStart.value !== null) {
    // Shift+click for range selection
    const start = Math.min(selectionStart.value, index)
    const end = Math.max(selectionStart.value, index)
    emit('selectRange', start, end)
    return
  }

  isSelecting.value = true
  selectionStart.value = index
  lastEntered.value = index
  emit('togglePage', index)
}

function handlePointerEnter(index: number) {
  if (!isSelecting.value || selectionStart.value === null) return

  if (lastEntered.value !== index) {
    lastEntered.value = index
    emit('togglePage', index)
  }
}

function handlePointerUp() {
  isSelecting.value = false
  // Keep selectionStart for shift-click range selection
}
</script>

<style scoped>
.split-page-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: var(--space-12);
  max-height: 320px;
  overflow-y: auto;
  padding: var(--space-12);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  background: var(--color-bg-inset);
}

.split-page-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8);
  border-radius: var(--radius-chip);
  border: 1px solid transparent;
  background: var(--color-bg-panel);
  cursor: pointer;
  transition: border-color var(--motion-fast) ease,
              transform var(--motion-fast) ease,
              box-shadow var(--motion-fast) ease;
}

.split-page-card:hover:not(.split-page-card--disabled) {
  border-color: var(--color-line-key);
  transform: translateY(-1px);
}

.split-page-card--selected {
  border-color: var(--color-acc-error);
  box-shadow: 0 0 0 1px rgba(255, 92, 92, 0.3);
}

.split-page-card--loading .split-page-card__thumb {
  opacity: 0.6;
}

.split-page-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.split-page-card__thumb {
  width: 70px;
  height: 96px;
  border-radius: var(--radius-chip);
  overflow: hidden;
  background: var(--color-bg-inset);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line-key);
}

.split-page-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.split-page-card__thumb-placeholder {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.split-page-card__label {
  font-family: var(--font-ui-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-secondary);
}
</style>
