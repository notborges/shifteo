<template>
  <div class="action-wrapper">
    <Transition name="action-content" mode="out-in">
      <button v-if="phase === 'ready' && hasRecipe" key="shift" class="action" @click="shift">
        shift
      </button>

      <div v-else-if="phase === 'shifting'" key="shifting" class="shifting">
        <span class="shifting-word">{{ format || 'shifting' }}</span>
        <div class="shifting-progress">
          <div class="shifting-bar" :style="{ width: `${shiftProgress}%` }"></div>
        </div>
        <button class="shifting-cancel" @click="cancelShift">cancel</button>
      </div>

      <div v-else-if="phase === 'done'" key="done" class="done">
        <p class="done-filename">{{ activeJob?.file.name }}</p>
        <p class="done-stats">
          {{ formatSize(activeInputSize) }} → {{ formatSize(activeOutputSize) }}
          <span v-if="savedPercent > 0" class="done-saved">−{{ savedPercent }}%</span>
          <span v-else-if="savedPercent < 0" class="done-grew">+{{ Math.abs(savedPercent) }}%</span>
        </p>
        <span v-if="jobCount > 1" class="done-count">{{ activeImageIndex + 1 }} of {{ jobCount }}</span>
        <button class="done-action" @click="downloadCurrent">take</button>
        <div class="done-options">
          <button v-if="jobCount > 1" class="done-option" @click="downloadAll">take all</button>
          <button class="done-option" @click="tryAgain">try again</button>
          <button class="done-option" @click="reset">reset</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Job } from '@/app/types'

type Phase = 'ready' | 'shifting' | 'done'

const { phase, hasRecipe, format, shiftProgress, activeJob, activeImageIndex, jobCount } = defineProps<{
  phase: Phase
  hasRecipe: boolean
  format: string | null
  shiftProgress: number
  activeJob?: Job
  activeImageIndex: number
  jobCount: number
}>()

const emit = defineEmits<{
  (e: 'shift'): void
  (e: 'cancel-shift'): void
  (e: 'download-current'): void
  (e: 'download-all'): void
  (e: 'try-again'): void
  (e: 'reset'): void
}>()

const activeInputSize = computed(() => activeJob?.file.size ?? 0)
const activeOutputSize = computed(() => activeJob?.result?.size ?? 0)
const savedPercent = computed(() => {
  if (activeInputSize.value === 0) return 0
  return Math.round(((activeInputSize.value - activeOutputSize.value) / activeInputSize.value) * 100)
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function shift() { emit('shift') }
function cancelShift() { emit('cancel-shift') }
function downloadCurrent() { emit('download-current') }
function downloadAll() { emit('download-all') }
function tryAgain() { emit('try-again') }
function reset() { emit('reset') }
</script>

<style scoped>
.action-wrapper {
  position: fixed;
  right: 0;
  bottom: 40px;
  left: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.action-wrapper > * { pointer-events: auto; }

.action {
  position: relative;
  padding: 16px 48px;
  border: 0;
  background: none;
  color: var(--immersive-accent);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.4s var(--ease-immersive);
}

.action::after,
.done-action::after {
  position: absolute;
  bottom: 8px;
  left: 50%;
  width: 0;
  height: 1px;
  background: currentColor;
  content: '';
  transform: translateX(-50%);
  transition: width 0.4s var(--ease-immersive);
}

.action:hover {
  color: var(--ink-primary);
  text-shadow: 0 0 40px var(--immersive-accent-border-hover), 0 0 80px var(--immersive-accent-soft);
  transform: translateY(-4px);
}

.action:hover::after,
.done-action:hover::after { width: 60%; }
.action:active { transform: translateY(-2px); }

.shifting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.shifting-word {
  color: var(--immersive-accent);
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.shifting-progress {
  width: 220px;
  height: 3px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--immersive-ember-whisper);
}

.shifting-bar {
  height: 100%;
  background: var(--immersive-accent);
  transition: width 0.3s ease-out;
}

.shifting-cancel {
  margin-top: 8px;
  padding: 6px 16px;
  border: 0;
  background: none;
  color: var(--immersive-ember-bright);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  cursor: pointer;
  transition: color 0.2s ease;
}

.shifting-cancel:hover { color: var(--immersive-ember-hover); }

.done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.done-filename {
  max-width: 300px;
  margin: 0 0 4px;
  overflow: hidden;
  color: var(--immersive-text-dim);
  font-family: var(--font-mono);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.done-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  color: var(--immersive-text);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
}

.done-saved { color: var(--immersive-success); font-weight: 600; }
.done-grew { color: var(--immersive-accent); font-weight: 600; }

.done-count {
  margin-top: 4px;
  color: var(--immersive-text-subtle);
  font-family: var(--font-mono);
  font-size: 10px;
}

.done-action {
  position: relative;
  padding: 16px 48px;
  border: 0;
  background: none;
  color: var(--immersive-success);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.4s var(--ease-immersive);
}

.done-action:hover {
  color: var(--ink-primary);
  text-shadow: 0 0 40px rgba(131, 211, 173, 0.6), 0 0 80px rgba(131, 211, 173, 0.3);
  transform: translateY(-4px);
}

.done-options { display: flex; gap: 24px; }

.done-option {
  padding: 8px 16px;
  border: 0;
  background: none;
  color: var(--immersive-text-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.done-option:hover { color: var(--immersive-text); }

.action-content-enter-active { transition: all 0.4s var(--ease-immersive); }
.action-content-leave-active { transition: all 0.25s var(--ease-immersive); }
.action-content-enter-from { opacity: 0; transform: translateY(12px); }
.action-content-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 640px) {
  .action-wrapper { bottom: 20px; }
}
</style>
