<template>
  <footer class="bg-graphite-800 border-t border-graphite-700 mt-auto">
    <div class="container mx-auto px-4 py-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Privacy badge -->
        <div class="flex items-center gap-2 text-sm">
          <Shield :size="16" class="text-accent-500" />
          <span class="font-medium">Runs 100% on your device</span>
        </div>

        <!-- Links -->
        <div class="flex items-center gap-6 text-sm text-graphite-400">
          <RouterLink to="/licenses" class="hover:text-graphite-200 transition-colors">
            Open Source Licenses
          </RouterLink>
          <a
            href="https://akius.tools"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-graphite-200 transition-colors flex items-center gap-1"
          >
            Akius
            <ExternalLink :size="14" />
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Shield, ExternalLink } from 'lucide-vue-next'
</script>
