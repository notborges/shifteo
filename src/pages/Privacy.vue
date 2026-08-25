<template>
  <div class="privacy-page">
    <div class="ambient">
      <div class="ambient-orb ambient-orb--1"></div>
      <div class="ambient-orb ambient-orb--2"></div>
    </div>

    <SiteNav />

    <div class="scroll-container">
      <article class="content">
        <header class="hero">
          <h1 class="hero-title">Privacy</h1>
          <p class="hero-subtitle">Shifteo is designed to keep your files on your device.</p>
        </header>

        <div class="info-sections">
          <section class="info-section">
            <h2>Files stay in your browser</h2>
            <p>Shifteo uses Web Workers and WebAssembly to process images locally. The app does not need an account or an application server to convert your files.</p>
          </section>

          <section class="info-section">
            <h2>Temporary browser storage</h2>
            <p>Shifteo can use IndexedDB to keep queued files, results, thumbnails, and session state so an interrupted session can be restored. Temporary files are cleaned up after 24 hours. You can also remove them with the reset action or by clearing this site’s browser data.</p>
          </section>

          <section class="info-section">
            <h2>No tracking</h2>
            <p>The app does not include analytics, advertising, or user tracking. It does not collect names, email addresses, or image contents.</p>
          </section>

        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import SiteNav from '@/components/SiteNav.vue'
</script>

<style scoped>
.privacy-page {
  position: fixed;
  inset: 0;
  background: var(--bg-void);
  overflow: hidden;
}

.ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
}

.ambient-orb--1 {
  top: -20%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--immersive-accent-rgb), 0.09) 0%, rgba(var(--immersive-accent-rgb), 0.035) 50%, transparent 70%);
}

.ambient-orb--2 {
  bottom: -30%;
  left: -15%;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(var(--immersive-accent-rgb), 0.06) 0%, rgba(var(--immersive-accent-rgb), 0.025) 50%, transparent 70%);
}

.scroll-container {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 100px 32px 80px;
}

.content {
  max-width: 760px;
  margin: 0 auto;
}

.hero {
  margin-bottom: 48px;
  text-align: center;
}

.hero-title {
  margin-bottom: 12px;
  color: var(--immersive-text-bright);
  font-family: var(--font-display);
  font-size: clamp(32px, 8vw, 48px);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  color: var(--immersive-text-dim);
  font-size: 15px;
}

.info-sections {
  display: grid;
  gap: 12px;
}

.info-section {
  padding: 24px 28px;
  border: 1px solid var(--immersive-border);
  border-radius: 12px;
  background: var(--immersive-surface);
}

.info-section h2 {
  margin-bottom: 10px;
  color: var(--immersive-text-bright);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
}

.info-section p {
  color: var(--immersive-text-dim);
  font-size: 13px;
  line-height: 1.65;
}

@media (max-width: 640px) {
  .scroll-container {
    padding: 90px 20px 60px;
  }

  .hero-title {
    font-size: 32px;
  }

  .info-section {
    padding: 20px;
  }
}
</style>
