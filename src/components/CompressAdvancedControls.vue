<template>
  <div v-if="isOpen" class="compress-advanced">
    <!-- Image Quality Slider -->
    <div class="compress-advanced__row">
      <div class="flex items-center justify-between">
        <span class="body-text text-text-secondary uppercase tracking-wider text-xs">Image Quality</span>
        <span class="mono text-sm">{{ Math.round(modelValue.imageQuality * 100) }}%</span>
      </div>
      <input
        type="range"
        min="0.5"
        max="1"
        step="0.01"
        :value="modelValue.imageQuality"
        @input="updateOption('imageQuality', parseFloat(($event.target as HTMLInputElement).value))"
        class="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line-hair)]
               [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-bg-canvas)]
               [&::-webkit-slider-thumb]:bg-[var(--color-acc-error)] [&::-webkit-slider-thumb]:transition-shadow
               [&::-webkit-slider-thumb]:hover:shadow-glow
               [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-acc-error)]"
        title="Adjust JPEG recompression quality"
      />
    </div>

    <!-- Max Image Dimension Slider -->
    <div class="compress-advanced__row">
      <div class="flex items-center justify-between">
        <span class="body-text text-text-secondary uppercase tracking-wider text-xs">Max Image Dimension</span>
        <span class="mono text-sm">{{ Math.round(modelValue.maxImageDimension) }} px</span>
      </div>
      <input
        type="range"
        min="800"
        max="3200"
        step="10"
        :value="modelValue.maxImageDimension"
        @input="updateOption('maxImageDimension', parseFloat(($event.target as HTMLInputElement).value))"
        class="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line-hair)]
               [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-bg-canvas)]
               [&::-webkit-slider-thumb]:bg-[var(--color-acc-error)] [&::-webkit-slider-thumb]:transition-shadow
               [&::-webkit-slider-thumb]:hover:shadow-glow
               [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-acc-error)]"
        title="Clamp embedded image dimensions to control resolution"
      />
    </div>

    <!-- Coordinate Precision Slider -->
    <div class="compress-advanced__row">
      <div class="flex items-center justify-between">
        <span class="body-text text-text-secondary uppercase tracking-wider text-xs">Coordinate Precision</span>
        <span class="mono text-sm">{{ modelValue.coordinatePrecision }} decimals</span>
      </div>
      <input
        type="range"
        min="0"
        max="3"
        step="1"
        :value="modelValue.coordinatePrecision"
        @input="updateOption('coordinatePrecision', parseInt(($event.target as HTMLInputElement).value))"
        class="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line-hair)]
               [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-bg-canvas)]
               [&::-webkit-slider-thumb]:bg-[var(--color-acc-error)] [&::-webkit-slider-thumb]:transition-shadow
               [&::-webkit-slider-thumb]:hover:shadow-glow
               [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-acc-error)]"
        title="Trim vector coordinate decimals to shrink streams"
      />
    </div>

    <!-- Checkboxes -->
    <div class="compress-advanced__toggles">
      <label class="flex items-center gap-3 body-text text-text-secondary uppercase tracking-wider">
        <span class="checkbox">
          <input
            type="checkbox"
            :checked="modelValue.pruneFonts"
            @change="updateOption('pruneFonts', ($event.target as HTMLInputElement).checked)"
            title="Remove unused font definitions to trim file size"
          />
          <span class="checkbox__mark" />
        </span>
        Prune unused fonts
      </label>
      <label class="flex items-center gap-3 body-text text-text-secondary uppercase tracking-wider">
        <span class="checkbox">
          <input
            type="checkbox"
            :checked="modelValue.recompressStreams"
            @change="updateOption('recompressStreams', ($event.target as HTMLInputElement).checked)"
            title="Recompress text drawing commands for leaner streams"
          />
          <span class="checkbox__mark" />
        </span>
        Recompress text streams
      </label>
    </div>

    <!-- Footer -->
    <div class="compress-advanced__footer">
      <span class="text-xs text-text-muted">Tweaks apply on top of the selected preset.</span>
      <UiButton
        type="button"
        size="sm"
        variant="quiet"
        :disabled="!isDirty"
        @click="$emit('reset')"
      >
        Reset to preset defaults
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'

interface CompressOptions {
  imageQuality: number
  maxImageDimension: number
  coordinatePrecision: number
  pruneFonts: boolean
  recompressStreams: boolean
}

interface Props {
  modelValue: CompressOptions
  isOpen: boolean
  isDirty: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: CompressOptions]
  reset: []
}>()

function updateOption<K extends keyof CompressOptions>(key: K, value: CompressOptions[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.compress-advanced {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-16);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  background: var(--color-bg-inset);
}

.compress-advanced__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.compress-advanced__toggles {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding-top: var(--space-8);
}

.compress-advanced__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-12);
  padding-top: var(--space-12);
  border-top: 1px solid var(--color-line-hair);
}
</style>
