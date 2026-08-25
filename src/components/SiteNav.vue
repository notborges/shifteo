<template>
  <header class="site-nav" :class="{ 'site-nav--muted': muted }" @click.stop>
    <div class="brand">
      <RouterLink to="/" class="logo" @click="emit('home')">shift<span class="logo-accent">eo</span></RouterLink>
      <a class="by-line" href="https://pborges.dev" target="_blank" rel="noreferrer noopener">
        <img class="by-line-avatar" src="/pborges-avatar.jpg" alt="" />
        <span>by pborges</span>
      </a>
    </div>

    <nav class="page-links" aria-label="Page links">
      <RouterLink to="/privacy">Privacy</RouterLink>
      <RouterLink to="/licenses">Licenses</RouterLink>
      <a :href="sourceRepositoryUrl" target="_blank" rel="noreferrer noopener">Source</a>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { SOURCE_REPOSITORY_URL } from '@/constants/site'

defineProps<{ muted?: boolean }>()
const emit = defineEmits<{ (event: 'home'): void }>()

const sourceRepositoryUrl = SOURCE_REPOSITORY_URL
</script>

<style scoped>
.site-nav {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

.site-nav--muted {
  opacity: 0.3;
}

.brand,
.page-links {
  pointer-events: auto;
}

.brand {
  position: absolute;
  top: 28px;
  left: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.by-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--immersive-text-secondary);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-decoration: none;
  transition: color var(--duration-normal) ease;
}

.by-line-avatar {
  width: 17px;
  height: 17px;
  border: 1px solid var(--immersive-border-hover);
  border-radius: 50%;
  object-fit: cover;
  opacity: 0.9;
}

.brand:hover .by-line {
  color: var(--immersive-text-bright);
}

.page-links {
  position: absolute;
  top: 28px;
  right: 32px;
  display: flex;
  gap: 20px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-links a {
  color: var(--immersive-text);
  text-decoration: none;
  transition: color var(--duration-normal) ease;
}

.page-links a:hover,
.page-links .router-link-active {
  color: var(--accent-primary);
}

@media (max-width: 640px) {
  .brand {
    top: 20px;
    left: 20px;
  }

  .page-links {
    top: 20px;
    right: 20px;
    gap: 12px;
  }

  .by-line span { display: none; }
}
</style>
