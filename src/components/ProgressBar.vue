<template>
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${Math.round(progress * 100)}%` }" />
    </div>
    <div class="progress-label">
      {{ label || 'Processing...' }}
      <span v-if="progress > 0"> · {{ Math.round(progress * 100) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  progress: number
  label?: string
}

defineProps<Props>()
</script>

<style scoped>
.progress-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.progress-bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--color-line-hair);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg,
    var(--color-acc-error) 0%,
    rgba(255, 92, 92, 0.8) 50%,
    var(--color-acc-error) 100%
  );
  background-size: 200% 100%;
  animation: progress-shimmer 1.5s ease-in-out infinite;
  transition: width var(--motion-normal) ease;
  box-shadow: 0 0 8px rgba(255, 92, 92, 0.4);
}

@keyframes progress-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.progress-label {
  font-family: var(--font-ui-mono);
  font-size: var(--type-meta-size);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-text-secondary);
}
</style>
