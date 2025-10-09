<template>
  <div class="preset-selector">
    <div class="preset-grid">
      <UiButton
        v-for="preset in presets"
        :key="preset.key"
        type="button"
        @click="$emit('update:modelValue', preset.key)"
        variant="solid"
        :tone="modelValue === preset.key ? 'accent' : 'default'"
        :disabled="disabled"
      >
        <span class="mono tracking-wider">{{ preset.label }}</span>
        <span
          :class="['block text-[11px] tracking-wide', modelValue === preset.key ? 'text-[#070909]' : 'text-text-muted']"
        >{{ preset.desc }}</span>
      </UiButton>
    </div>
    <p v-if="hint" class="body-text text-text-muted text-xs mt-4 px-1">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'

interface Preset {
  key: string
  label: string
  desc: string
}

interface Props {
  modelValue: string
  presets: Preset[]
  disabled?: boolean
  hint?: string
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.preset-selector {
  display: flex;
  flex-direction: column;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-16);
}

@media (max-width: 640px) {
  .preset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
