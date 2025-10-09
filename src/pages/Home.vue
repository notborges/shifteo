<template>
  <div class="page-shell page-shell--constrained">
    <div class="page-grid">
      <UiPanel :inset="true" class="col-span-12">
        <template #header>
          <span>About</span>
          <span class="panel__meta">Zero uploads. Zero tracking.</span>
        </template>
        <div class="gap-6">
          <div>
            <h1 class="display-text">SHIFT:EO</h1>
            <p class="body-text text-text-secondary uppercase tracking-wide">
              Shift images and documents locally in your browser.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <UiButton to="/images" variant="solid" tone="accent">
              Open Images
            </UiButton>
            <UiButton to="/documents" variant="quiet">
              Documents
            </UiButton>
          </div>
        </div>
        <template #footer>
          Ready · All files stay local
        </template>
      </UiPanel>

      <RouterLink to="/images" class="col-span-12 lg:col-span-6 flex">
        <UiPanel :hoverable="true" class="flex-1">
          <template #header>
            <span>Images</span>
            <span class="panel__meta">PNG · JPEG · WEBP · AVIF · TIFF · BMP · ICO</span>
          </template>
          <p class="body-text text-text-secondary">
            Shift image formats, compress, and resize without uploading. Process files in batches with optional metadata removal.
          </p>
          <ul class="body-text text-text-muted uppercase tracking-wide">
            <li>Change format with quality control</li>
            <li>Resize by width, height, or long edge</li>
            <li>Real-time queue status</li>
          </ul>
          <template #footer>
            Get Started &rsaquo;
          </template>
        </UiPanel>
      </RouterLink>

      <RouterLink to="/documents" class="col-span-12 lg:col-span-6 flex">
        <UiPanel :hoverable="true" class="flex-1">
          <template #header>
            <span>Documents</span>
            <span class="panel__meta">PDF</span>
          </template>
          <p class="body-text text-text-secondary">
            Compress, merge, split, and organize PDFs locally in your browser. Tab-based workflows with smart presets and instant results.
          </p>
          <ul class="body-text text-text-muted uppercase tracking-wide">
            <li>Compress with light/balanced/small presets</li>
            <li>Merge multiple PDFs in custom order</li>
            <li>Split & extract specific pages</li>
            <li>Reorder, rotate, and remove pages</li>
          </ul>
          <template #footer>
            Get Started &rsaquo;
          </template>
        </UiPanel>
      </RouterLink>

      <UiPanel class="col-span-12">
        <template #header>
          <span>Why Shifteo</span>
          <span class="panel__meta">All processing is local</span>
        </template>
        <div class="grid md:grid-cols-3 gap-6">
          <div>
            <span class="badge">Local Processing</span>
            <p class="body-text text-text-muted mt-3">
              All processing happens in your browser. Files never leave your device.
            </p>
          </div>
          <div>
            <span class="badge">Batch Support</span>
            <p class="body-text text-text-muted mt-3">
              Process multiple files at once with automatic queue management.
            </p>
          </div>
          <div>
            <span class="badge">Live Status</span>
            <p class="body-text text-text-muted mt-3">
              See processing status in real-time.
            </p>
          </div>
        </div>
      </UiPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiPanel from '@/components/ui/UiPanel.vue'
</script>
