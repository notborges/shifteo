<template>
  <span :class="['badge', variantClass, $attrs.class]" v-bind="restAttrs">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  variant?: 'default' | 'live' | 'error'
}>()

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const variantClass = computed(() => {
  if (props.variant === 'live') return 'badge--live'
  if (props.variant === 'error') return 'badge--error'
  return ''
})
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-chip);
  font-family: var(--font-ui-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  border: 1px solid var(--color-line-key);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-secondary);
}

.badge--live {
  border-color: var(--color-acc-info);
  color: var(--color-acc-info);
}

.badge--error {
  border-color: var(--color-acc-error);
  color: var(--color-acc-error);
}
</style>
