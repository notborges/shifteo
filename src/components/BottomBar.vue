<template>
  <footer class="footer-bar">
    <div>
      Shifteo by
      <a href="https://akius.tools" target="_blank" rel="noopener noreferrer">Akius</a>
      ·
      <RouterLink to="/licenses">Licenses</RouterLink>
      ·
      <a href="https://github.com/akiusdevo" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
    <div class="flex items-center gap-2">
      <span class="nav-status-dot status-pulse" />
      100% Local Processing
    </div>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
