<template>
  <div v-if="stats" class="compress-report">
    <!-- Summary Stats -->
    <div class="compress-report__header">
      <div>
        <span class="compress-report__label">Original</span>
        <span class="compress-report__value">{{ formatFileSize(stats.originalBytes) }}</span>
      </div>
      <div>
        <span class="compress-report__label">Output</span>
        <span class="compress-report__value">{{ formatFileSize(stats.compressedBytes) }}</span>
      </div>
      <div>
        <span class="compress-report__label">Saved</span>
        <span class="compress-report__value">
          {{ formatFileSize(savedBytes) }}
          <span v-if="savedBytes > 0" class="text-text-secondary">({{ savedPercent }})</span>
        </span>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="compress-report__grid">
      <span><strong>{{ stats.fontsRemoved }}</strong> fonts removed</span>
      <span><strong>{{ stats.imagesDownscaled }}</strong> images downscaled</span>
      <span
        class="compress-report__badge"
        :class="{ 'compress-report__badge--warning': stats.rasterFallbackUsed }"
      >
        {{ stats.rasterFallbackUsed ? 'Raster fallback used' : 'Vectors preserved' }}
      </span>
    </div>

    <!-- Options Used -->
    <div class="compress-report__options">
      <span class="compress-report__option">Quality {{ Math.round(stats.options.imageQuality * 100) }}%</span>
      <span class="compress-report__option">Max image {{ stats.options.maxImageDimension }}px</span>
      <span class="compress-report__option">Precision {{ stats.options.coordinatePrecision }} dec.</span>
      <span class="compress-report__option">{{ stats.options.pruneFonts ? 'Fonts pruned' : 'Fonts preserved' }}</span>
    </div>

    <!-- Detailed Breakdown (Optional) -->
    <div v-if="showDetails && hasDetails" class="compress-report__details">
      <section v-if="metadataRemoved.length" class="compress-report__group">
        <h4 class="compress-report__group-title">Metadata removed</h4>
        <ul>
          <li v-for="(item, index) in metadataRemoved" :key="`meta-${index}`">{{ item }}</li>
        </ul>
      </section>

      <section v-if="fontsRemovedList.length" class="compress-report__group">
        <h4 class="compress-report__group-title">Fonts removed</h4>
        <ul>
          <li v-for="(item, index) in fontsRemovedList" :key="`font-${index}`">{{ item }}</li>
        </ul>
      </section>

      <section v-if="imageHighlights.length" class="compress-report__group">
        <header class="compress-report__group-meta">
          <h4 class="compress-report__group-title">Images optimised</h4>
          <span class="compress-report__group-saved">Saved {{ formatFileSize(imageBytesSaved) }}</span>
        </header>
        <ul>
          <li v-for="(change, index) in imageHighlights" :key="`img-${index}`">
            <span class="compress-report__detail-name">{{ change.name ?? `Image ${index + 1}` }}</span>
            <span class="compress-report__detail-meta">
              {{ change.before.width }}×{{ change.before.height }} → {{ change.after.width }}×{{ change.after.height }}
            </span>
            <span class="compress-report__detail-saved">Saved {{ formatFileSize(change.savedBytes) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatFileSize } from '@/utils/format'
import type { PdfCompressionStats } from '@/workers/types'

interface Props {
  stats: PdfCompressionStats | null
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true
})

const savedBytes = computed(() => {
  if (!props.stats) return 0
  return props.stats.originalBytes - props.stats.compressedBytes
})

const savedPercent = computed(() => {
  if (!props.stats || props.stats.originalBytes === 0) return '0%'
  const percent = Math.round((savedBytes.value / props.stats.originalBytes) * 100)
  return `${percent}%`
})

const hasDetails = computed(() => {
  return props.stats?.details && (
    metadataRemoved.value.length > 0 ||
    fontsRemovedList.value.length > 0 ||
    imageHighlights.value.length > 0
  )
})

const metadataRemoved = computed(() => {
  return props.stats?.details?.metadataKeysRemoved ?? []
})

const fontsRemovedList = computed(() => {
  return props.stats?.details?.fontsRemoved ?? []
})

const imageHighlights = computed(() => {
  const changes = props.stats?.details?.imageChanges ?? []
  return changes.slice(0, 10) // Show top 10
})

const imageBytesSaved = computed(() => {
  return props.stats?.details?.imageBytesSaved ?? 0
})
</script>

<style scoped>
.compress-report {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-16);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  background: var(--color-bg-panel);
}

.compress-report__header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-12);
}

.compress-report__label {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: var(--type-meta-size);
  color: var(--color-text-secondary);
}

.compress-report__value {
  font-family: var(--font-ui-mono);
  font-size: var(--type-body-size);
  color: var(--color-text-primary);
}

.compress-report__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-8);
  font-size: var(--type-body-size);
  color: var(--color-text-secondary);
}

.compress-report__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-acc-success);
  font-size: var(--type-meta-size);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.compress-report__badge--warning {
  background: rgba(255, 92, 92, 0.15);
  color: var(--color-acc-error);
}

.compress-report__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  font-size: var(--type-meta-size);
  color: var(--color-text-muted);
}

.compress-report__option {
  font-family: var(--font-ui-mono);
  background: var(--color-bg-inset);
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
}

.compress-report__details {
  display: grid;
  gap: var(--space-16);
  padding-top: var(--space-16);
  border-top: 1px solid var(--color-line-hair);
}

.compress-report__group {
  display: grid;
  gap: var(--space-8);
}

.compress-report__group-title {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: var(--type-meta-size);
  color: var(--color-text-secondary);
}

.compress-report__group-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-12);
}

.compress-report__group-saved {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  color: var(--color-text-muted);
}

.compress-report__group ul {
  display: grid;
  gap: var(--space-8);
  font-size: var(--type-body-size);
  color: var(--color-text-secondary);
  list-style: none;
  padding: 0;
  margin: 0;
}

.compress-report__detail-name {
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
}

.compress-report__detail-meta {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  color: var(--color-text-muted);
}

.compress-report__detail-saved {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  color: var(--color-acc-success);
}
</style>
