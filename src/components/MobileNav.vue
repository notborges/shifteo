<template>
  <nav class="mobile-nav">
    <RouterLink to="/" class="mobile-nav__item" active-class="mobile-nav__item--active">
      <Home :size="20" :stroke-width="1.5" />
      <span>Home</span>
    </RouterLink>
    <RouterLink to="/images" class="mobile-nav__item" active-class="mobile-nav__item--active">
      <ImageIcon :size="20" :stroke-width="1.5" />
      <span>Images</span>
    </RouterLink>
    <RouterLink to="/documents" class="mobile-nav__item" active-class="mobile-nav__item--active">
      <FileText :size="20" :stroke-width="1.5" />
      <span>Docs</span>
    </RouterLink>
    <RouterLink to="/settings" class="mobile-nav__item" active-class="mobile-nav__item--active">
      <Settings :size="20" :stroke-width="1.5" />
      <span>Settings</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Home, ImageIcon, FileText, Settings } from 'lucide-vue-next'
</script>
