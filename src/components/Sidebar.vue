<template>
  <aside class="chrome__rail">
    <RouterLink to="/" class="nav-brand" title="Home">
      <span class="nav-brand__mark">S</span>
      <span>SHIFT:EO</span>
    </RouterLink>

    <div class="nav-section">
      <p class="nav-section__label">Workspace</p>
      <nav class="nav-links" aria-label="Workspace navigation">
        <RouterLink to="/images" class="nav-link" active-class="is-active">
          <ImageIcon :size="18" :stroke-width="1.5" />
          <span>Images</span>
        </RouterLink>
        <RouterLink to="/documents" class="nav-link" active-class="is-active">
          <FileText :size="18" :stroke-width="1.5" />
          <span>Documents</span>
        </RouterLink>
      </nav>
    </div>

    <div class="nav-separator"></div>

    <div class="nav-section">
      <p class="nav-section__label">System</p>
      <nav class="nav-links" aria-label="System navigation">
        <RouterLink to="/licenses" class="nav-link" active-class="is-active">
          <Info :size="18" :stroke-width="1.5" />
          <span>Licenses</span>
        </RouterLink>
        <RouterLink to="/settings" class="nav-link" active-class="is-active">
          <Settings :size="18" :stroke-width="1.5" />
          <span>Settings</span>
        </RouterLink>
      </nav>
    </div>

    <div class="nav-footer">
      <div class="nav-footer__status">
        <span class="nav-status-dot status-pulse" />
        LOCAL
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ImageIcon, FileText, Settings, Info } from 'lucide-vue-next'
</script>
