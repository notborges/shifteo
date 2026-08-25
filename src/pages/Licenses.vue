<template>
  <div class="licenses-page">
    <div class="ambient">
      <div class="ambient-orb ambient-orb--1"></div>
      <div class="ambient-orb ambient-orb--2"></div>
    </div>

    <SiteNav />

    <div class="scroll-container">
      <div class="content">
        <header class="hero">
          <h1 class="hero-title">Licenses</h1>
          <p class="hero-subtitle">Third-party software used by Shifteo</p>
        </header>

        <div class="categories">
          <section class="category">
            <div class="category-header">
              <h2 class="category-title">Image Codecs</h2>
              <span class="category-count">{{ imageCodecs.length }}</span>
            </div>
            <div class="card-grid">
              <a v-for="item in imageCodecs" :key="item.name" :href="item.url" target="_blank" rel="noreferrer noopener" class="card">
                <span class="card-name">{{ item.name }}</span>
                <span class="card-desc">{{ item.description }}</span>
                <span class="card-license">{{ item.license }}</span>
              </a>
            </div>
          </section>

          <section class="category">
            <div class="category-header">
              <h2 class="category-title">Image Processing</h2>
              <span class="category-count">{{ imageProcessing.length }}</span>
            </div>
            <div class="card-grid">
              <a v-for="item in imageProcessing" :key="item.name" :href="item.url" target="_blank" rel="noreferrer noopener" class="card">
                <span class="card-name">{{ item.name }}</span>
                <span class="card-desc">{{ item.description }}</span>
                <span class="card-license">{{ item.license }}</span>
              </a>
            </div>
          </section>

          <section class="category">
            <div class="category-header">
              <h2 class="category-title">Application</h2>
              <span class="category-count">{{ application.length }}</span>
            </div>
            <div class="card-grid">
              <a v-for="item in application" :key="item.name" :href="item.url" target="_blank" rel="noreferrer noopener" class="card">
                <span class="card-name">{{ item.name }}</span>
                <span class="card-desc">{{ item.description }}</span>
                <span class="card-license">{{ item.license }}</span>
              </a>
            </div>
          </section>

          <section class="category">
            <div class="category-header">
              <h2 class="category-title">Utilities</h2>
              <span class="category-count">{{ utilities.length }}</span>
            </div>
            <div class="card-grid">
              <a v-for="item in utilities" :key="item.name" :href="item.url" target="_blank" rel="noreferrer noopener" class="card">
                <span class="card-name">{{ item.name }}</span>
                <span class="card-desc">{{ item.description }}</span>
                <span class="card-license">{{ item.license }}</span>
              </a>
            </div>
          </section>
        </div>

        <footer class="attribution">
          <p>"This software is based in part on the work of the Independent JPEG Group"</p>
          <p class="attribution-note">Full license texts are available from the upstream repositories.</p>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SiteNav from '@/components/SiteNav.vue'

interface License {
  name: string
  description: string
  license: string
  url: string
}

const imageCodecs: License[] = [
  { name: '@jsquash/png', description: 'PNG encoding and decoding', license: 'Apache-2.0', url: 'https://github.com/jamsinclair/jSquash' },
  { name: '@jsquash/jpeg', description: 'JPEG encoding and decoding', license: 'Apache-2.0', url: 'https://github.com/jamsinclair/jSquash' },
  { name: '@jsquash/webp', description: 'WebP encoding and decoding', license: 'Apache-2.0', url: 'https://github.com/jamsinclair/jSquash' },
  { name: '@jsquash/avif', description: 'AVIF encoding and decoding', license: 'Apache-2.0', url: 'https://github.com/jamsinclair/jSquash' },
  { name: '@jsquash/jxl', description: 'JPEG XL encoding and decoding', license: 'Apache-2.0', url: 'https://github.com/jamsinclair/jSquash' },
  { name: 'libheif-js', description: 'HEIC and HEIF decoding', license: 'LGPL-3.0', url: 'https://github.com/catdad-experiments/libheif-js' },
  { name: 'UTIF.js', description: 'TIFF encoding and decoding', license: 'MIT', url: 'https://github.com/photopea/UTIF.js' },
  { name: 'icojs', description: 'ICO file parsing', license: 'MIT', url: 'https://github.com/egy186/icojs' }
]

const imageProcessing: License[] = [
  { name: 'Photon', description: 'Image filters and adjustments', license: 'Apache-2.0', url: 'https://github.com/silvia-odwyer/photon' },
  { name: '@jsquash/resize', description: 'Image resizing', license: 'Apache-2.0', url: 'https://github.com/jamsinclair/jSquash' },
  { name: '@jsquash/oxipng', description: 'Lossless PNG optimization', license: 'Apache-2.0', url: 'https://github.com/jamsinclair/jSquash' }
]

const application: License[] = [
  { name: 'Vue', description: 'User interface framework', license: 'MIT', url: 'https://github.com/vuejs/core' },
  { name: 'Vue Router', description: 'Client-side routing', license: 'MIT', url: 'https://github.com/vuejs/router' },
  { name: 'Pinia', description: 'State management', license: 'MIT', url: 'https://github.com/vuejs/pinia' },
  { name: 'Vite', description: 'Build tooling', license: 'MIT', url: 'https://github.com/vitejs/vite' }
]

const utilities: License[] = [
  { name: 'idb', description: 'IndexedDB wrapper', license: 'ISC', url: 'https://github.com/jakearchibald/idb' },
  { name: 'JSZip', description: 'ZIP file creation', license: 'MIT', url: 'https://github.com/Stuk/jszip' },
  { name: '@lucide/vue', description: 'Interface icons', license: 'ISC', url: 'https://github.com/lucide-icons/lucide' }
]
</script>

<style scoped>
.licenses-page {
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
  max-width: 900px;
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

.categories {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.category-title {
  color: var(--accent-primary);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.category-count {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--immersive-surface);
  color: var(--immersive-text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  border: 1px solid var(--immersive-border);
  border-radius: 12px;
  background: var(--immersive-surface);
  text-decoration: none;
  transition: all var(--duration-normal) ease;
}

.card:hover {
  border-color: var(--immersive-border-hover);
  background: rgba(255, 255, 255, 0.065);
  transform: translateY(-2px);
}

.card-name {
  color: var(--immersive-text-bright);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
}

.card:hover .card-name {
  color: var(--accent-primary);
}

.card-desc {
  color: var(--immersive-text-dim);
  font-size: 12px;
  line-height: 1.4;
}

.card-license {
  margin-top: auto;
  color: var(--immersive-success);
  font-family: var(--font-mono);
  font-size: 10px;
}

.attribution {
  margin-top: 64px;
  padding-top: 32px;
  border-top: 1px solid var(--immersive-border);
  text-align: center;
}

.attribution p {
  margin: 0;
  color: var(--immersive-text-muted);
  font-size: 12px;
  font-style: italic;
}

.attribution-note {
  margin-top: 8px !important;
  font-size: 11px !important;
  font-style: normal !important;
}

@media (max-width: 640px) {
  .scroll-container {
    padding: 90px 20px 60px;
  }

  .hero-title {
    font-size: 32px;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .categories {
    gap: 40px;
  }
}
</style>
