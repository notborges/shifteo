<template>
  <div class="backdrop-blur-sm bg-graphite-800/50 border border-graphite-700/50 rounded-3xl p-8 space-y-8">
    <h3 class="text-2xl font-semibold text-center">Choose Format</h3>

    <!-- Format Selection - Large Visual Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        v-for="format in formatOptions"
        :key="format.value"
        @click="handleFormatClick(format.value)"
        class="relative p-6 rounded-2xl border-2 transition-all duration-200 group"
        :class="[
          modelFormat === format.value
            ? 'border-accent-500 bg-accent-500/10 shadow-[0_0_30px_rgba(20,184,166,0.3)] scale-105'
            : 'border-graphite-600 hover:border-accent-500/50 bg-graphite-700/30 hover:scale-105 hover:bg-graphite-700/50'
        ]"
      >
        <div class="text-center">
          <div class="text-3xl font-bold mb-2 uppercase" :class="modelFormat === format.value ? 'text-accent-400' : 'text-graphite-300 group-hover:text-accent-500'">
            {{ format.value }}
          </div>
          <p class="text-xs text-graphite-400 leading-tight">
            {{ format.description }}
          </p>
        </div>

        <!-- Selected indicator -->
        <div
          v-if="modelFormat === format.value"
          class="absolute -top-2 -right-2 w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <Check :size="14" class="text-white" />
        </div>
      </button>
    </div>

    <!-- Quality Slider (for lossy formats) -->
    <div v-if="isLossyFormat" class="space-y-3">
      <div class="flex justify-between items-center">
        <label class="text-lg font-medium">Quality</label>
        <span class="text-2xl font-bold text-accent-400">{{ Math.round(modelQuality * 100) }}%</span>
      </div>

      <input
        type="range"
        :value="modelQuality"
        @input="handleQualityChange"
        min="0"
        max="1"
        step="0.01"
        class="w-full h-3 bg-graphite-700 rounded-full appearance-none cursor-pointer
               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500
               [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(20,184,166,0.5)]
               [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform
               [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
               [&::-moz-range-thumb]:bg-accent-500 [&::-moz-range-thumb]:border-0"
      />

      <div class="flex justify-between text-sm text-graphite-400">
        <span>Smaller file</span>
        <span>Better quality</span>
      </div>
    </div>

    <!-- EXIF Stripping - Prominent -->
    <div class="flex items-center justify-between p-4 bg-graphite-700/30 rounded-xl border border-graphite-600/30">
      <div>
        <label class="text-base font-medium flex items-center gap-2">
          <Shield :size="18" class="text-accent-500" />
          Remove Metadata
        </label>
        <p class="text-sm text-graphite-400 mt-1">Strips location and camera data (recommended)</p>
      </div>
      <button
        @click="emit('update:stripExif', !modelStripExif)"
        class="relative inline-flex h-8 w-14 items-center rounded-full transition-all"
        :class="modelStripExif ? 'bg-accent-500 shadow-[0_0_15px_rgba(20,184,166,0.4)]' : 'bg-graphite-600'"
      >
        <span
          class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg"
          :class="modelStripExif ? 'translate-x-7' : 'translate-x-1'"
        />
      </button>
    </div>

    <!-- Advanced Options - Collapsed -->
    <details class="group">
      <summary class="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-graphite-700/30 rounded-xl transition-colors">
        <span class="font-medium text-graphite-300">Advanced Options</span>
        <ChevronDown :size="20" class="text-graphite-400 transition-transform group-open:rotate-180" />
      </summary>

      <div class="mt-4 space-y-4 p-4 border border-graphite-700/50 rounded-xl">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-graphite-400 mb-2">Width (px)</label>
            <input
              type="number"
              :value="modelWidth || ''"
              @input="handleWidthChange"
              placeholder="Auto"
              class="w-full px-3 py-2 bg-graphite-700 border border-graphite-600 rounded-lg text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
            />
          </div>
          <div>
            <label class="block text-xs text-graphite-400 mb-2">Height (px)</label>
            <input
              type="number"
              :value="modelHeight || ''"
              @input="handleHeightChange"
              placeholder="Auto"
              class="w-full px-3 py-2 bg-graphite-700 border border-graphite-600 rounded-lg text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
            />
          </div>
          <div>
            <label class="block text-xs text-graphite-400 mb-2">Long Edge (px)</label>
            <input
              type="number"
              :value="modelLongEdge || ''"
              @input="handleLongEdgeChange"
              placeholder="Original"
              class="w-full px-3 py-2 bg-graphite-700 border border-graphite-600 rounded-lg text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
            />
          </div>
        </div>
        <p class="text-xs text-graphite-400">Aspect ratio is preserved when resizing</p>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check, Shield, ChevronDown } from 'lucide-vue-next'
import type { ImageFormat } from '@/workers/types'

interface Props {
  modelFormat: ImageFormat
  modelQuality: number
  modelWidth?: number
  modelHeight?: number
  modelLongEdge?: number
  modelStripExif: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:format': [format: ImageFormat]
  'update:quality': [quality: number]
  'update:width': [width: number | undefined]
  'update:height': [height: number | undefined]
  'update:longEdge': [longEdge: number | undefined]
  'update:stripExif': [stripExif: boolean]
}>()

const formatOptions = [
  { value: 'png' as ImageFormat, description: 'Lossless, transparency' },
  { value: 'jpeg' as ImageFormat, description: 'Smallest, no alpha' },
  { value: 'webp' as ImageFormat, description: 'Modern, balanced' },
  { value: 'avif' as ImageFormat, description: 'Best compression' }
]

const isLossyFormat = computed(() => {
  return props.modelFormat !== 'png'
})

function handleFormatClick(format: ImageFormat) {
  console.log('[ImageOptions] Format clicked:', format)
  emit('update:format', format)
}

function handleQualityChange(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  emit('update:quality', value)
}

function handleWidthChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:width', value ? parseInt(value) : undefined)
}

function handleHeightChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:height', value ? parseInt(value) : undefined)
}

function handleLongEdgeChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:longEdge', value ? parseInt(value) : undefined)
}
</script>
