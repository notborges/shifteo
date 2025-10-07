<template>
  <div
    :class="[
      variant === 'full' ? 'bracket-frame' : 'bracket-corners',
      { 'is-active': active },
      $attrs.class
    ]"
    v-bind="restAttrs"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    variant?: 'corners' | 'full'
    active?: boolean
  }>(),
  {
    variant: 'corners',
    active: false
  }
)

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
