<template>
  <div class="page-shell">
    <div class="page-grid">
      <div class="panel col-span-12 lg:col-span-8">
        <div class="panel__header">
          <span>Document Processing</span>
          <span class="panel__meta">DOCX · PDF · HTML</span>
        </div>
        <div class="panel__body">
          <div class="empty-state">
            <FileText :size="56" class="mx-auto text-text-muted" :stroke-width="1" />
            <div class="empty-state__title">Coming Soon</div>
            <div class="empty-state__meta">
              Document processing features are in development.
            </div>
          </div>
        </div>
        <div class="panel__footer">
          In development
        </div>
      </div>

      <div class="panel col-span-12 lg:col-span-4">
        <div class="panel__header">
          <span>Planned Features</span>
          <span class="panel__meta">Roadmap</span>
        </div>
        <div class="panel__body body-text text-text-secondary uppercase tracking-wide">
          <ul class="space-y-3">
            <li>DOCX to HTML conversion</li>
            <li>PDF merge & split</li>
            <li>PDF to images (per page)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
</script>
