<template>
  <div class="app">
    <RouterView />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import Toast from '@/components/Toast.vue'
import { cleanupOldTempFiles } from '@/utils/idb'

onMounted(async () => {
  await cleanupOldTempFiles()
})
</script>
