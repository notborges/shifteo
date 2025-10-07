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
    brackets?: boolean
    hoverable?: boolean
    headerClass?: string | Record<string, boolean> | string[]
    bodyClass?: string | Record<string, boolean> | string[]
    footerClass?: string | Record<string, boolean> | string[]
  }>(),
  {
    inset: false,
    alert: null,
    brackets: false,
    hoverable: false,
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
  if (props.brackets) classes.push('bracket-corners-content')
  if (props.hoverable) classes.push('panel--hoverable')
  if (attrs.class) classes.push(attrs.class as any)
  return classes
})
</script>
