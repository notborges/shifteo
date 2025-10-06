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
            <div class="empty-state__title">Channel warming</div>
            <div class="empty-state__meta">
              Document conversions deploy next. Merge, split, and render stacks will appear in this panel.
            </div>
          </div>
        </div>
        <div class="panel__footer">
          Status: Modules staging · ETA to follow
        </div>
      </div>

      <div class="panel col-span-12 lg:col-span-4">
        <div class="panel__header">
          <span>Planned Operations</span>
          <span class="panel__meta">Spec preview</span>
        </div>
        <div class="panel__body body-text text-text-secondary" style="letter-spacing: 0.16em; text-transform: uppercase;">
          <ul class="space-y-3">
            <li>DOCX → HTML fidelity pipeline</li>
            <li>PDF merge & split with mono logs</li>
            <li>Per-page PDF to image exports</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
</script>
