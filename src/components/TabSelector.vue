<template>
  <div class="tab-selector">
    <div class="tab-list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="tab-item"
        :class="{ 'tab-item--active': modelValue === tab.id }"
        :aria-selected="modelValue === tab.id"
        @click="$emit('update:modelValue', tab.id)"
      >
        <component v-if="tab.icon" :is="tab.icon" :size="18" />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

interface Tab {
  id: string
  label: string
  icon?: Component
}

interface Props {
  tabs: readonly Tab[] | Tab[]
  modelValue: string
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.tab-selector {
  width: 100%;
}

.tab-list {
  display: flex;
  gap: var(--space-8);
  border-bottom: 1px solid var(--color-line-key);
  padding-bottom: var(--space-4);
  overflow-x: auto;
  scrollbar-width: none;
}

.tab-list::-webkit-scrollbar {
  display: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-12) var(--space-16);
  border: 1px solid transparent;
  border-radius: var(--radius-chip);
  background: transparent;
  font-family: var(--font-ui-mono);
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--motion-fast) ease;
  white-space: nowrap;
  position: relative;
}

.tab-item:hover:not(.tab-item--active) {
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.02);
  border-color: var(--color-line-hair);
}

.tab-item--active {
  color: var(--color-text-primary);
  background: var(--gradient-active);
  border-color: var(--color-acc-error);
  box-shadow: var(--shadow-glow-error-sm);
}

.tab-item--active::after {
  content: '';
  position: absolute;
  bottom: calc(var(--space-4) * -1 - 1px);
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-acc-error);
  box-shadow: 0 0 8px var(--color-acc-error);
}

.tab-label {
  font-weight: 500;
}

@media (max-width: 640px) {
  .tab-item {
    padding: var(--space-8) var(--space-12);
    font-size: 11px;
  }

  .tab-item svg {
    width: 14px;
    height: 14px;
  }
}
</style>
