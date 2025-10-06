# Shifteo — Local File Converter

**Tagline:** *Convert, transform, and move files — 100% locally.*

A privacy-first, offline-capable file converter that runs entirely in your browser using WebAssembly. No uploads, no servers.

## 🎯 Features

### ✅ Image Conversion (Implemented)
- **Formats:** PNG ↔ JPEG ↔ WebP ↔ AVIF
- **Operations:**
  - Format conversion with quality control
  - Resize by width, height, or long edge (preserves aspect ratio)
  - EXIF metadata stripping (default on)
  - Batch processing
- **Tech:** jSquash WASM codecs (MozJPEG, OxiPNG, libwebp, libavif)

### 🚧 Document Conversion (Coming Soon)
- DOCX → HTML conversion
- HTML → PDF generation
- PDF → Images rendering
- PDF merge/split operations

## 🛠️ Tech Stack

- **Framework:** Vue 3.5 + Vite 7 + TypeScript 5
- **UI:** TailwindCSS 4 + PrimeVue 4 + Lucide Icons
- **State:** Pinia 3
- **Workers:** Web Workers + Comlink (RPC)
- **Storage:** IndexedDB + OPFS (Origin Private File System)
- **PWA:** Service Workers with Workbox
- **Image Processing:** @jsquash/* (PNG, JPEG, WebP, AVIF, OxiPNG, Resize)
- **Document Processing:** mammoth, pdfjs-dist, @pdfme/pdf-lib (planned)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
/shifteo
├─ src/
│  ├─ app/
│  │  ├─ App.vue
│  │  ├─ router.ts
│  │  └─ stores/ (Pinia - queue, settings)
│  ├─ components/
│  │  ├─ Header.vue, Footer.vue
│  │  ├─ DropZone.vue
│  │  ├─ ImageOptions.vue
│  │  └─ FileListItem.vue
│  ├─ workers/
│  │  ├─ types.ts (TypeScript interfaces)
│  │  ├─ image.worker.ts (jSquash WASM)
│  │  └─ imageWorkerManager.ts (Comlink wrapper)
│  ├─ utils/
│  │  ├─ format.ts (file type detection, capabilities)
│  │  ├─ idb.ts (IndexedDB helpers)
│  │  ├─ opfs.ts (Origin Private File System)
│  │  └─ file.ts (download, validation)
│  ├─ pages/
│  │  ├─ Home.vue
│  │  ├─ Images.vue ✅
│  │  ├─ Documents.vue (placeholder)
│  │  ├─ Settings.vue (placeholder)
│  │  └─ Licenses.vue
│  └─ styles/
│     └─ main.css (TailwindCSS 4)
├─ package.json
├─ vite.config.ts
└─ tsconfig.json
```

## 🔒 Privacy & Security

- **100% Local Processing:** Files never leave your device
- **No Network Requests:** All conversion happens in-browser
- **OPFS Storage:** Temporary files stored in browser's private file system
- **No Telemetry:** Zero data collection or analytics
- **CSP Headers:** Content Security Policy for additional protection

## 📜 Open Source Licenses

This project uses the following open-source libraries:

**Image Processing:**
- jSquash (Apache 2.0) - WASM image codecs
- MozJPEG (IJG/BSD) - JPEG encoding
- libavif (BSD) - AVIF encoding/decoding

**Framework & UI:**
- Vue 3 (MIT)
- PrimeVue (MIT)
- TailwindCSS (MIT)
- Lucide Icons (ISC)

**Utilities:**
- Comlink (Apache 2.0)
- idb (ISC)
- Pinia (MIT)

See `/licenses` page in the app for full attribution.

## 🎨 Current Status

**Phase 1: Image Conversion** ✅ Complete
- [x] Project scaffold with Vite 7 + Vue 3 + TypeScript
- [x] TailwindCSS 4 setup (CSS-based config)
- [x] Image worker with jSquash WASM
- [x] Drag & drop file upload
- [x] Format conversion (PNG/JPEG/WebP/AVIF)
- [x] Quality & resize controls
- [x] Batch processing
- [x] Download individual or all files
- [x] Progress tracking & error handling

**Phase 2: Documents** 🚧 Next
- [ ] Document worker (DOCX, PDF operations)
- [ ] Document conversion UI
- [ ] PDF tools page

**Phase 3: PWA & Polish** 📋 Planned
- [ ] Offline functionality
- [ ] Settings page (dark mode toggle, defaults)
- [ ] Improved styling
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Testing (unit + E2E)

## 🧪 Development

```bash
# Run tests
npm test

# Run E2E tests
npm run e2e

# Type check
npx vue-tsc --noEmit

# Lint
npm run lint
```

## 📝 License

MIT License - See LICENSE file for details

---

**Author:** Akius (akiusdevo)
**Version:** 0.1.0 (MVP)
**Website:** akius.tools/shifteo
