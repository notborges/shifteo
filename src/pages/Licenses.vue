<template>
  <div class="page-shell">
    <div class="page-grid">
      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Image Processing</span>
          <span class="panel__meta">Codecs</span>
        </div>
        <div class="panel__body space-y-4 body-text text-text-secondary">
          <div
            v-for="item in imageLicenses"
            :key="item.name"
            class="grid items-start gap-6 md:grid-cols-[200px_1fr_120px]"
          >
            <span class="mono" style="color: var(--color-text-secondary); letter-spacing: 0.18em;">{{ item.name }}</span>
            <span style="color: var(--color-text-muted);">{{ item.description }}</span>
            <span style="color: var(--color-text-muted); text-align: right;">{{ item.license }}</span>
          </div>
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Document Processing</span>
          <span class="panel__meta">Engines</span>
        </div>
        <div class="panel__body space-y-4 body-text text-text-secondary">
          <div
            v-for="item in documentLicenses"
            :key="item.name"
            class="grid items-start gap-6 md:grid-cols-[200px_1fr_120px]"
          >
            <span class="mono" style="color: var(--color-text-secondary); letter-spacing: 0.18em;">{{ item.name }}</span>
            <span style="color: var(--color-text-muted);">{{ item.description }}</span>
            <span style="color: var(--color-text-muted); text-align: right;">{{ item.license }}</span>
          </div>
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Framework & UI</span>
          <span class="panel__meta">Stack</span>
        </div>
        <div class="panel__body space-y-4 body-text text-text-secondary">
          <div
            v-for="item in frameworkLicenses"
            :key="item.name"
            class="grid items-start gap-6 md:grid-cols-[200px_1fr_120px]"
          >
            <span class="mono" style="color: var(--color-text-secondary); letter-spacing: 0.18em;">{{ item.name }}</span>
            <span style="color: var(--color-text-muted);">{{ item.description }}</span>
            <span style="color: var(--color-text-muted); text-align: right;">{{ item.license }}</span>
          </div>
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Privacy Statement</span>
          <span class="panel__meta">Operational pledge</span>
        </div>
        <div class="panel__body body-text text-text-secondary">
          All file processing happens 100% locally in your browser. Your files never leave your device. We do not collect, store, or transmit any data. Zero analytics. Zero tracking. Zero servers.
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Required Attributions</span>
          <span class="panel__meta">Legal</span>
        </div>
        <div class="panel__body body-text text-text-secondary space-y-3">
          <p>"This software is based in part on the work of the Independent JPEG Group"</p>
          <p>Full license texts available at respective project repositories.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LicenseItem {
  name: string
  description: string
  license: string
}

const imageLicenses: LicenseItem[] = [
  { name: 'jSquash', description: 'Browser & Web Worker WASM image codecs', license: 'Apache 2.0' },
  { name: 'MozJPEG', description: 'JPEG encoder by Independent JPEG Group', license: 'IJG / BSD' },
  { name: 'libavif', description: 'AVIF encoding/decoding library', license: 'BSD' }
]

const documentLicenses: LicenseItem[] = [
  { name: 'mammoth.js', description: 'DOCX to HTML converter', license: 'BSD-2-Clause' },
  { name: 'PDF.js', description: 'Mozilla PDF rendering engine', license: 'Apache 2.0' },
  { name: 'pdf-lib', description: 'PDF manipulation library', license: 'MIT' }
]

const frameworkLicenses: LicenseItem[] = [
  { name: 'Vue 3', description: 'Progressive JavaScript framework', license: 'MIT' },
  { name: 'Vite', description: 'Next generation frontend tooling', license: 'MIT' },
  { name: 'TailwindCSS', description: 'Utility-first CSS framework', license: 'MIT' },
  { name: 'Lucide Icons', description: 'Open-source icon set', license: 'ISC' }
]
</script>
