<template>
  <div class="page-shell">
    <div class="page-grid">
      <div class="panel panel--inset col-span-12">
        <div class="panel__header">
          <span>Mission Brief</span>
          <span class="panel__meta">Zero uploads. Zero tracking.</span>
        </div>
        <div class="panel__body gap-6">
          <div>
            <h1 class="display-text">SHIFT:EO</h1>
            <p class="body-text text-text-secondary" style="letter-spacing: 0.18em; text-transform: uppercase;">
              Shift images and documents locally using secure wasm pipelines.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <UiButton to="/images" variant="primary">
              Launch Image Shift
            </UiButton>
            <UiButton to="/documents" variant="ghost">
              Document Ops
            </UiButton>
          </div>
        </div>
        <div class="panel__footer">
          Console ready · assets stay on device
        </div>
      </div>

      <RouterLink to="/images" class="panel col-span-12 lg:col-span-6">
        <div class="panel__header">
          <span>Image Ops</span>
          <span class="panel__meta">PNG · JPEG · WEBP · AVIF</span>
        </div>
        <div class="panel__body">
          <p class="body-text text-text-secondary">
            Convert, compress, and resize without leaving the browser. Batch queues keep throughput high while metadata stripping stays optional.
          </p>
          <ul class="body-text text-text-muted" style="letter-spacing: 0.14em; text-transform: uppercase;">
            <li>Format shifts with quality control</li>
            <li>Resize by width, height, or long edge</li>
            <li>Queue monitoring with mono telemetry</li>
          </ul>
        </div>
        <div class="panel__footer">
          Engage Shift &rsaquo;
        </div>
      </RouterLink>

      <div class="panel col-span-12 lg:col-span-6">
        <div class="panel__header">
          <span>Document Ops</span>
          <span class="panel__meta">Coming online</span>
        </div>
        <div class="panel__body">
          <p class="body-text text-text-secondary">
            DOCX to HTML, PDF welding, and extraction engines are staged. Watch this channel for deployment updates.
          </p>
          <div class="badge badge--live">Secure Channel</div>
        </div>
        <div class="panel__footer">
          Status: Calibration in progress
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Operational Integrity</span>
          <span class="panel__meta">All processes run client-side</span>
        </div>
        <div class="panel__body grid md:grid-cols-3 gap-6">
          <div>
            <span class="badge">Local Compute</span>
            <p class="body-text text-text-muted mt-3">
              Workers run entirely in your browser. No payloads transmitted.
            </p>
          </div>
          <div>
            <span class="badge">Batch Ready</span>
            <p class="body-text text-text-muted mt-3">
              Queue orchestration keeps multi-file shifts organized and recoverable.
            </p>
          </div>
          <div>
            <span class="badge">Telemetry Lite</span>
            <p class="body-text text-text-muted mt-3">
              Mono readouts surface status changes instantly—no dashboards required.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
</script>
