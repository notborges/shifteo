<template>
  <div
    class="dropzone"
    :class="{
      'dropzone--receiving': isDragOver,
      'dropzone--accepted': justDropped
    }"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="onDrop"
    @click="openFilePicker"
  >
    <div class="void"></div>

    <div class="warmth"></div>

    <div class="words">
      <span class="word word--yours">Your files.</span>
      <span class="word word--always">Your device.</span>
    </div>

    <p class="promise">Convert. Compress. <span class="promise-accent">Transform.</span></p>

    <div class="hints">
      <span class="hint">Drop anywhere</span>
      <span class="hint-sep">·</span>
      <span class="hint">Click anywhere</span>
      <span class="hint-sep">·</span>
      <span class="hint"><kbd>{{ pasteShortcut }}</kbd> to paste</span>
    </div>

    <div class="gateway">
      <div class="gateway__ring"></div>
    </div>

    <div class="formats">
      <div class="formats__row">
        <span>png</span>
        <span>jpg</span>
        <span>webp</span>
        <span>avif</span>
        <span>heic</span>
        <span>jxl</span>
      </div>
      <div class="formats__row">
        <span>svg</span>
        <span>tiff</span>
        <span>bmp</span>
        <span>ico</span>
      </div>
    </div>

    <SiteNav :muted="isDragOver" />

    <input
      ref="fileInput"
      type="file"
      :accept="acceptString"
      multiple
      class="sr-only"
      @change="onFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SiteNav from '@/components/SiteNav.vue'
import { SUPPORTED_INPUT_ACCEPT } from '@/constants/image'

const isMac = computed(() => navigator.platform.toLowerCase().includes('mac'))
const pasteShortcut = computed(() => isMac.value ? '⌘V' : 'Ctrl+V')

const acceptString = SUPPORTED_INPUT_ACCEPT

const emit = defineEmits<{ (e: 'files', files: File[]): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const justDropped = ref(false)

function openFilePicker() {
  fileInput.value?.click()
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length) {
    triggerAccepted()
    emit('files', files)
  }
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.stopPropagation()
  isDragOver.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length) {
    triggerAccepted()
    emit('files', files)
  }
}

function triggerAccepted() {
  justDropped.value = true
  setTimeout(() => justDropped.value = false, 600)
}
</script>

<style scoped>
.dropzone {
  position: fixed;
  inset: 0;
  cursor: pointer;
  overflow: hidden;
  background: var(--bg-void);
}

.void {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 80% at 50% 50%,
    rgba(31, 36, 43, 0.62) 0%,
    rgba(15, 18, 23, 0.92) 50%,
    var(--bg-void) 70%
  );
}

.warmth {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(var(--immersive-accent-rgb), 0.08) 0%,
    rgba(var(--immersive-accent-rgb), 0.025) 40%,
    transparent 60%
  );
  filter: blur(60px);
  pointer-events: none;
}

.dropzone--receiving .warmth {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.4);
  background: radial-gradient(
    circle,
    rgba(var(--immersive-accent-rgb), 0.22) 0%,
    rgba(var(--immersive-accent-rgb), 0.1) 40%,
    transparent 60%
  );
  transition: all 0.5s var(--ease-immersive);
}

.words {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  pointer-events: none;
  z-index: 10;
}

.word {
  font-family: var(--font-display);
  font-size: clamp(48px, 12vw, 90px);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.9;
  color: var(--ink-primary);
  transition: all 0.6s var(--ease-immersive);
}

.dropzone--receiving .word--yours {
  transform: translateY(-40px) translateX(-30px) rotate(-2deg);
  opacity: 0.7;
}

.dropzone--receiving .word--always {
  transform: translateY(40px) translateX(30px) rotate(2deg);
  opacity: 0.7;
}

.dropzone--accepted .word--yours {
  transform: translateY(-5px);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dropzone--accepted .word--always {
  transform: translateY(5px);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.promise {
  position: absolute;
  top: calc(50% + 100px);
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--immersive-text-dim);
  margin: 0;
  pointer-events: none;
  transition: all 0.5s var(--ease-immersive);
  z-index: 10;
}

.promise-accent {
  color: var(--accent-primary);
}

.dropzone--receiving .promise {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.hints {
  position: absolute;
  top: calc(50% + 140px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: none;
  transition: all 0.5s var(--ease-immersive);
  z-index: 10;
}

.hint {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--immersive-text-dim);
}

.hint kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 6px;
  background: var(--immersive-surface);
  border: 1px solid var(--immersive-border);
  border-radius: 4px;
  color: var(--immersive-text-soft);
}

.hint-sep {
  color: var(--immersive-text-subtle);
}

.dropzone--receiving .hints {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.gateway {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  pointer-events: none;
  opacity: 0;
  transition: all 0.5s var(--ease-immersive);
}

.gateway__ring {
  position: absolute;
  inset: 0;
  border: 2px solid var(--immersive-accent-border);
  border-radius: 50%;
}

.dropzone--receiving .gateway {
  opacity: 1;
  width: 180px;
  height: 180px;
}

.dropzone--receiving .gateway__ring {
  border-color: var(--immersive-accent-border-hover);
}

.dropzone--accepted .gateway {
  opacity: 0;
  width: 300px;
  height: 300px;
  transition: all 0.3s ease-out;
}

.formats {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  opacity: 0.4;
  pointer-events: none;
  transition: all 0.6s var(--ease-immersive);
}

.formats__row {
  display: flex;
  gap: 20px;
}

.formats span {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--immersive-ember);
  transition: all 0.4s ease;
}

.dropzone--receiving .formats {
  transform: translateX(-50%) translateY(-40px);
  opacity: 1;
}

.dropzone--receiving .formats span {
  color: var(--immersive-text-bright);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .word {
    font-size: clamp(36px, 14vw, 60px);
  }

  .dropzone--receiving .word--yours {
    transform: translateY(-30px) translateX(-20px) rotate(-2deg);
  }

  .dropzone--receiving .word--always {
    transform: translateY(30px) translateX(20px) rotate(2deg);
  }

  .promise {
    top: calc(50% + 80px);
    font-size: 14px;
    max-width: 260px;
    text-align: center;
  }

  .hints {
    top: calc(50% + 115px);
    flex-direction: column;
    gap: 8px;
  }

  .hint-sep {
    display: none;
  }

  .formats {
    bottom: 70px;
  }

  .formats__row {
    gap: 14px;
  }

  .formats span {
    font-size: 10px;
  }

}

@media (max-height: 700px) {
  .promise {
    top: calc(50% + 70px);
  }

  .hints {
    top: calc(50% + 105px);
  }

  .formats {
    bottom: 60px;
  }
}
</style>
