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
          <button class="topbar__button" type="button" aria-label="Open help">
            <HelpCircle :size="16" />
          </button>
          <button class="topbar__button" type="button" aria-label="Toggle theme">
            <MoonStar :size="16" />
          </button>
          <button class="topbar__button" type="button" aria-label="User menu">
            <UserRound :size="16" />
          </button>
        </div>
      </header>

      <div class="chrome__scroll">
        <div class="chrome__content">
          <RouterView />
          <BottomBar />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import BottomBar from '@/components/BottomBar.vue'
import { useSettingsStore } from '@/app/stores/settings'
import { HelpCircle, MoonStar, UserRound } from 'lucide-vue-next'

const settingsStore = useSettingsStore()
const route = useRoute()

const topTitle = computed(() => (route.meta.title as string) ?? 'Shifteo')
const topSubtitle = computed(() => (route.meta.subtitle as string) ?? '')
const lastUpdated = ref(formatTimestamp(new Date()))

onMounted(async () => {
  await settingsStore.loadSettings()
  settingsStore.applyDarkMode()
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
