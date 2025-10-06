<template>
  <section :class="sectionClasses" v-bind="restAttrs">
    <header v-if="$slots.header" :class="['panel__header', headerClass]">
      <slot name="header" />
    </header>
    <div v-if="$slots.default" :class="['panel__body', bodyClass]">
      <slot />
    </div>
    <footer v-if="$slots.footer" :class="['panel__footer', footerClass]">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    inset?: boolean
    alert?: 'success' | 'warning' | 'error' | null
    headerClass?: string | Record<string, boolean> | string[]
    bodyClass?: string | Record<string, boolean> | string[]
    footerClass?: string | Record<string, boolean> | string[]
  }>(),
  {
    inset: false,
    alert: null,
    headerClass: '',
    bodyClass: '',
    footerClass: ''
  }
)

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const sectionClasses = computed(() => {
  const classes: (string | Record<string, boolean>)[] = ['panel']
  if (props.inset) classes.push('panel--inset')
  if (props.alert) classes.push(`panel--alert-${props.alert}`)
  if (attrs.class) classes.push(attrs.class as any)
  return classes
})
</script>

<style scoped>
.panel {
  background: rgba(17, 18, 21, 0.8);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  padding: var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.panel--inset {
  background: var(--color-bg-inset);
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-16);
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-line-hair);
  padding-bottom: var(--space-12);
}

.panel__meta {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  letter-spacing: 0.18em;
  color: var(--color-text-muted);
}

.panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.panel__footer {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  letter-spacing: 0.18em;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-line-hair);
  padding-top: var(--space-12);
}

.panel--alert-success {
  border-left: 3px solid var(--color-acc-success);
}

.panel--alert-warning {
  border-left: 3px solid var(--color-acc-warning);
}

.panel--alert-error {
  border-left: 3px solid var(--color-acc-error);
}
</style>
