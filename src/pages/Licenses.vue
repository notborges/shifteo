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
            class="grid items-start gap-6 md:grid-cols-[200px_1fr_140px]"
          >
            <span class="mono text-text-secondary tracking-wide">
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noreferrer noopener"
                class="hover:underline"
              >
                {{ item.name }}
              </a>
              <template v-else>
                {{ item.name }}
              </template>
            </span>
            <span class="text-text-muted">{{ item.description }}</span>
            <span class="text-text-muted text-right">
              {{ item.license }}
            </span>
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
            class="grid items-start gap-6 md:grid-cols-[200px_1fr_140px]"
          >
            <span class="mono text-text-secondary tracking-wide">
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noreferrer noopener"
                class="hover:underline"
              >
                {{ item.name }}
              </a>
              <template v-else>
                {{ item.name }}
              </template>
            </span>
            <span class="text-text-muted">{{ item.description }}</span>
            <span class="text-text-muted text-right">
              {{ item.license }}
            </span>
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
            class="grid items-start gap-6 md:grid-cols-[200px_1fr_140px]"
          >
            <span class="mono text-text-secondary tracking-wide">
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noreferrer noopener"
                class="hover:underline"
              >
                {{ item.name }}
              </a>
              <template v-else>
                {{ item.name }}
              </template>
            </span>
            <span class="text-text-muted">{{ item.description }}</span>
            <span class="text-text-muted text-right">
              {{ item.license }}
            </span>
          </div>
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Runtime Utilities</span>
          <span class="panel__meta">Workers & storage</span>
        </div>
        <div class="panel__body space-y-4 body-text text-text-secondary">
          <div
            v-for="item in utilityLicenses"
            :key="item.name"
            class="grid items-start gap-6 md:grid-cols-[200px_1fr_140px]"
          >
            <span class="mono text-text-secondary tracking-wide">
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noreferrer noopener"
                class="hover:underline"
              >
                {{ item.name }}
              </a>
              <template v-else>
                {{ item.name }}
              </template>
            </span>
            <span class="text-text-muted">{{ item.description }}</span>
            <span class="text-text-muted text-right">
              {{ item.license }}
            </span>
          </div>
        </div>
      </div>

      <div class="panel col-span-12">
        <div class="panel__header">
          <span>Privacy Statement</span>
          <span class="panel__meta">Our commitment</span>
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
          <p>Full license texts ship with this build under <code>/licenses/&lt;package&gt;.txt</code> and are also available from the upstream project repositories.</p>
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
  url?: string
}

const imageLicenses: LicenseItem[] = [
  {
    name: '@jsquash/avif',
    description: 'AVIF encoding/decoding WASM module',
    license: 'Apache-2.0',
    url: 'https://github.com/jamsinclair/jSquash'
  },
  {
    name: '@jsquash/jpeg',
    description: 'MozJPEG-based JPEG encoding module',
    license: 'Apache-2.0',
    url: 'https://github.com/jamsinclair/jSquash'
  },
  {
    name: '@jsquash/png',
    description: 'PNG encoding/decoding WASM module',
    license: 'Apache-2.0',
    url: 'https://github.com/jamsinclair/jSquash'
  },
  {
    name: '@jsquash/webp',
    description: 'WebP encoding/decoding WASM module',
    license: 'Apache-2.0',
    url: 'https://github.com/jamsinclair/jSquash'
  },
  {
    name: '@jsquash/resize',
    description: 'Image resizing WASM toolkit',
    license: 'Apache-2.0',
    url: 'https://github.com/jamsinclair/jSquash'
  },
  {
    name: '@jsquash/oxipng',
    description: 'Lossless PNG optimization wrapper',
    license: 'Apache-2.0',
    url: 'https://github.com/jamsinclair/jSquash'
  },
  {
    name: 'MozJPEG',
    description: 'JPEG encoder by Independent JPEG Group',
    license: 'IJG / BSD',
    url: 'https://github.com/mozilla/mozjpeg'
  },
  {
    name: 'libavif',
    description: 'AVIF encoding/decoding library',
    license: 'BSD-2-Clause',
    url: 'https://github.com/AOMediaCodec/libavif'
  },
  {
    name: 'UTIF.js',
    description: 'TIFF decoder/encoder for browser environments',
    license: 'MIT',
    url: 'https://github.com/photopea/UTIF.js'
  },
  {
    name: 'icojs',
    description: 'ICO parsing utilities used for icon support',
    license: 'MIT',
    url: 'https://github.com/egy186/icojs'
  }
]

const documentLicenses: LicenseItem[] = [
  {
    name: 'mammoth.js',
    description: 'DOCX to HTML converter',
    license: 'BSD-2-Clause',
    url: 'https://github.com/mwilliamson/mammoth.js'
  },
  {
    name: 'pdfjs-dist',
    description: 'Mozilla PDF rendering engine',
    license: 'Apache-2.0',
    url: 'https://github.com/mozilla/pdf.js'
  },
  {
    name: '@pdfme/pdf-lib',
    description: 'PDF generation & manipulation toolkit',
    license: 'MIT',
    url: 'https://github.com/pdfme/pdfme'
  }
]

const frameworkLicenses: LicenseItem[] = [
  {
    name: 'Vue 3',
    description: 'Progressive JavaScript framework',
    license: 'MIT',
    url: 'https://github.com/vuejs/core'
  },
  {
    name: 'Vue Router',
    description: 'Official routing solution for Vue',
    license: 'MIT',
    url: 'https://github.com/vuejs/router'
  },
  {
    name: 'Pinia',
    description: 'State management library for Vue',
    license: 'MIT',
    url: 'https://github.com/vuejs/pinia'
  },
  {
    name: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    license: 'MIT',
    url: 'https://github.com/tailwindlabs/tailwindcss'
  },
  {
    name: 'Vite',
    description: 'Frontend tooling & dev server',
    license: 'MIT',
    url: 'https://github.com/vitejs/vite'
  },
  {
    name: 'lucide-vue-next',
    description: 'Vue bindings for Lucide icon set',
    license: 'ISC',
    url: 'https://github.com/lucide-icons/lucide'
  }
]

const utilityLicenses: LicenseItem[] = [
  {
    name: 'Comlink',
    description: 'Web Worker RPC messaging library',
    license: 'Apache-2.0',
    url: 'https://github.com/GoogleChromeLabs/comlink'
  },
  {
    name: 'idb',
    description: 'Promise-based IndexedDB wrapper',
    license: 'ISC',
    url: 'https://github.com/jakearchibald/idb'
  }
]
</script>
