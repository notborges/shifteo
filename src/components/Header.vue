<template>
  <header class="bg-graphite-800 border-b border-graphite-700">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo and Title -->
        <RouterLink to="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div class="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
            <span class="text-graphite-900 font-bold text-xl">S</span>
          </div>
          <h1 class="text-xl font-semibold">Shifteo</h1>
        </RouterLink>

        <!-- Navigation -->
        <nav class="flex items-center gap-6">
          <RouterLink
            to="/images"
            class="text-graphite-300 hover:text-graphite-50 transition-colors"
            active-class="text-accent-500"
          >
            Images
          </RouterLink>
          <RouterLink
            to="/documents"
            class="text-graphite-300 hover:text-graphite-50 transition-colors"
            active-class="text-accent-500"
          >
            Documents
          </RouterLink>
          <RouterLink
            to="/settings"
            class="text-graphite-300 hover:text-graphite-50 transition-colors"
            active-class="text-accent-500"
            aria-label="Settings"
          >
            <Settings :size="20" />
          </RouterLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Settings } from 'lucide-vue-next'
</script>
