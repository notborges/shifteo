<template>
  <div id="app" class="chrome grid-bg text-text-primary">
    <Sidebar />
    <div class="chrome__main">
      <header class="topbar">
        <div class="topbar__title">
          <span>{{ topTitle }}</span>
          <span v-if="topSubtitle">/</span>
          <span v-if="topSubtitle">{{ topSubtitle }}</span>
        </div>
        <div class="topbar__meta">
          Last Update {{ lastUpdated }}
        </div>
        <div class="topbar__actions">
          <UiButton variant="solid" size="md" icon-only type="button" aria-label="Open help">
            <HelpCircle :size="20" />
          </UiButton>
          <UiButton variant="solid" size="md" icon-only type="button" aria-label="Toggle theme">
            <MoonStar :size="20" />
          </UiButton>
          <UiButton variant="solid" size="md" icon-only type="button" aria-label="User menu">
            <UserRound :size="20" />
          </UiButton>
        </div>
      </header>

      <div class="chrome__scroll">
        <div class="chrome__content">
          <RouterView />
        </div>
      </div>
      <BottomBar />
    </div>
    <MobileNav />
    <UiToast />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import BottomBar from '@/components/BottomBar.vue'
import MobileNav from '@/components/MobileNav.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiToast from '@/components/ui/UiToast.vue'
import { useSettingsStore } from '@/app/stores/settings'
import { useQueueStore } from '@/app/stores/queue'
import { useToastStore } from '@/app/stores/toast'
import { cleanupOldTempFiles, restoreQueueJobs } from '@/utils/idb'
import { HelpCircle, MoonStar, UserRound } from 'lucide-vue-next'

const settingsStore = useSettingsStore()
const queueStore = useQueueStore()
const toastStore = useToastStore()
const route = useRoute()

const topTitle = computed(() => (route.meta.title as string) ?? 'Shifteo')
const topSubtitle = computed(() => (route.meta.subtitle as string) ?? '')
const lastUpdated = ref(formatTimestamp(new Date()))

onMounted(async () => {
  await settingsStore.loadSettings()
  settingsStore.applyDarkMode()

  // Clean up files older than 24 hours
  const cleaned = await cleanupOldTempFiles(24 * 60 * 60 * 1000)
  if (cleaned > 0) {
    console.log(`[App] Cleaned ${cleaned} old files from storage`)
  }

  // Restore queue once at app level
  const restored = await restoreQueueJobs()
  if (restored.length > 0) {
    for (const item of restored) {
      queueStore.addJob({
        file: item.file,
        kind: 'image',
        status: 'idle',
        originalDimensions: item.originalDimensions,
        thumbnail: item.thumbnailUrl,
        options: item.options
      })
    }

    console.log(`[App] Restored ${restored.length} files from previous session`)

    // Show toast only if on images page
    if (route.path === '/images') {
      toastStore.info(
        'Queue Restored',
        `${restored.length} file${restored.length > 1 ? 's' : ''} from previous session`
      )
    }
  }
})

watch(
  () => route.fullPath,
  () => {
    lastUpdated.value = formatTimestamp(new Date())
  }
)

function formatTimestamp(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes} UTC`
}
</script>
