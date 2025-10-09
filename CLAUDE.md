# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shifteo** is a privacy-first, offline-capable file converter that runs entirely in the browser using WebAssembly. No uploads, no servers—all file processing happens locally using Web Workers.

**Tech Stack:**
- Vue 3.5 + Vite 7 + TypeScript 5
- TailwindCSS 4
- Pinia (state management)
- Web Workers + Comlink for parallel processing
- IndexedDB + OPFS (Origin Private File System) for storage
- jSquash WASM codecs for image processing
- pdfjs-dist & @pdfme/pdf-lib for PDF operations

## Development Commands

```bash
# Development
npm run dev                    # Start dev server with Vite
npm run preview               # Preview production build locally

# Building
npm run build                 # Type-check + build for production
npm run prebuild              # Copy licenses + generate sitemap (runs automatically before build)

# Testing
npm test                      # Run unit tests (vitest)
npm run test:watch            # Run tests in watch mode
npm run e2e                   # Run Playwright E2E tests

# Type Checking & Linting
npx vue-tsc --noEmit          # Type-check without emitting files
npm run lint                  # Lint with ESLint

# Utilities
npm run licenses              # Copy third-party licenses to public/
npm run sitemap               # Generate sitemap.xml
npm run audit:seo             # Run Lighthouse SEO audit (requires preview server running)
```

## Architecture

### Worker-Based Processing

The app uses a **multi-worker pool architecture** for parallel file processing:

1. **Image Worker Pool** (`src/workers/workerPool.ts`)
   - Manages up to 4 parallel image workers (based on CPU cores)
   - Each worker (`src/workers/image.worker.ts`) runs jSquash WASM codecs
   - Jobs are queued and distributed to available workers
   - Workers communicate via structured messages (no Comlink)

2. **PDF Worker Pool** (`src/workers/pdfWorkerPool.ts`)
   - Single-worker pool for PDF operations
   - Handles compression, merge, split, organize, and rendering
   - Worker: `src/workers/pdf.worker.ts`

**Key Files:**
- `src/workers/types.ts` — All TypeScript interfaces for workers, jobs, tasks
- `src/workers/image.worker.ts` — Image processing (decode → resize → encode)
- `src/workers/pdf.worker.ts` — PDF operations
- `src/workers/metadata.ts` — EXIF/metadata stripping for images
- `src/workers/pdfCompression.ts` — PDF compression logic
- `src/workers/pdfOrganize.ts` — PDF page reordering/rotation

### State Management (Pinia)

**Stores** (`src/app/stores/`):
- `queue.ts` — Central job queue (tracks all conversion jobs)
  - Jobs have states: `idle`, `running`, `completed`, `error`
  - Jobs are persisted to IndexedDB for recovery
  - Each job has: `id`, `file`, `kind` (image/document), `status`, `progress`, `result`
- `settings.ts` — User preferences (default format, quality, dark mode, etc.)
- `toast.ts` — Toast notification system

### Format Detection & Capabilities

**File:** `src/utils/format.ts`

- `detectJobKind(file)` — Returns `'image'` or `'document'` based on MIME/extension
- `isFormatSupported(file)` — Check if file can be processed
- `getSuggestedOutputFormats(file)` — Get valid output formats for input
- `inferProcessingFormat(file)` — Infer default processing format (SVG → PNG fallback)
- `generateOutputFilename(...)` — Template-based filename generation

**Capabilities:**
- Images: PNG, JPEG, WebP, AVIF, SVG, BMP, TIFF, ICO (max 100MB)
- Documents: PDF, DOCX, HTML (max 50MB)

### Storage

- **IndexedDB** (`src/utils/idb.ts`) — Stores job metadata and temporary files
- **OPFS** (`src/utils/opfs.ts`) — Browser's Origin Private File System for large file storage

### Routing & SEO

- Router: `src/app/router.ts`
- SEO metadata: `src/app/seo.ts` (dynamically updated per route)
- Routes: `/` (Home), `/images`, `/documents`, `/settings`, `/licenses`

## Image Processing Pipeline

**Format Support:**
- **Input:** PNG, JPEG, WebP, AVIF, SVG, BMP, TIFF, ICO
- **Output:** PNG, JPEG, WebP, AVIF, BMP, TIFF, ICO (no SVG output)

**Conversion Flow:**
1. File uploaded → added to queue store as a `Job`
2. Worker pool picks up job → sends to available worker
3. Worker decodes image (jSquash WASM)
4. Worker resizes if needed (using @jsquash/resize)
5. Worker encodes to target format with quality settings
6. Worker strips EXIF metadata if requested
7. Result (Blob) stored in job → user can download

**SVG Handling:**
- SVGs are decoded to raster format first (PNG by default)
- Use `inferProcessingFormat()` to handle SVG → PNG fallback

## PDF Processing Pipeline

**Operations:**
- `pdf_compress` — Compress with presets (light/balanced/small)
- `pdf_organize` — Reorder/rotate pages
- `pdf_merge` — Combine multiple PDFs
- `pdf_split` — Extract pages
- `pdf_to_images` — Render pages as PNG/JPEG

**Compression:**
- Downscales images in PDF (`maxImageDimension`, `imageQuality`)
- Recompresses content streams
- Prunes unused fonts
- Removes metadata

**Key Files:**
- `src/workers/pdfCompression.ts` — Core compression logic
- `src/workers/pdfOrganize.ts` — Page manipulation

## Configuration Files

### Vite (`vite.config.ts`)
- **Plugins:** WASM, top-level await, Vue, TailwindCSS, PWA
- **Path alias:** `@/` → `src/`
- **Workers:** ES modules with WASM support
- **Code splitting:** `pdf`, `image`, `vendor` chunks
- **WASM caching:** ServiceWorker caches WASM files for 30 days

### TypeScript (`tsconfig.json`)
- Target: ES2022
- Strict mode enabled (including `noUncheckedIndexedAccess`)
- Path mapping: `@/*` → `./src/*`

### Vitest (`vitest.config.ts`)
- Unit tests colocated with source (`.spec.ts` files)
- Excludes: `tests/**` (reserved for E2E), `node_modules`

## Key Patterns

### Adding a New Image Format

1. Check if jSquash supports it (add dependency if needed)
2. Update `CAPABILITIES.image.input` or `output` in `src/utils/format.ts`
3. Update `ImageFormat` type in `src/workers/types.ts`
4. Add MIME mapping in `format.ts` (`MIME_TO_EXT`, `EXT_TO_MIME`)
5. If decode/encode needed, update `src/workers/codecs.ts` (not in this snapshot)

### Adding a New PDF Operation

1. Define task type in `DocTask` union (`src/workers/types.ts`)
2. Implement logic in `src/workers/pdf.worker.ts`
3. Add UI controls in `src/pages/Documents.vue`
4. Update queue store if new result type needed

### Worker Communication Pattern

All workers use **structured messaging** (not Comlink):

```typescript
// Main thread → Worker
worker.postMessage({ id, type: 'convert', data: { buffer, opts } }, [buffer])

// Worker → Main thread
self.postMessage({ id, type: 'progress', progress: 0.5 })  // Progress update
self.postMessage({ id, result: { blob, width, height } })  // Final result
self.postMessage({ id, error: 'Error message' })           // Error
```

**Progress Reporting:**
- Workers report progress (0-1) and stage messages
- Queue store tracks `job.progress` and `job.stage`

## Testing

- **Unit tests:** Colocated `.spec.ts` files (e.g., `metadata.spec.ts`, `format.spec.ts`)
- **E2E tests:** Playwright configuration in `playwright.config.ts`
- Run single test file: `npm test -- src/workers/metadata.spec.ts`
- Run tests in UI mode: `npm run test:watch`

## PWA & Offline Support

- Service Worker managed by Workbox (`vite-plugin-pwa`)
- WASM files cached with `CacheFirst` strategy
- Max cached file size: 5MB (for large WASM bundles)
- Manifest: `vite.config.ts` → `VitePWA.manifest`

## Important Notes

- **No network requests:** All processing happens client-side
- **WASM loading:** Codecs load on-demand (not at boot)
- **Memory management:** Workers release ImageData after encoding
- **File size limits:** Images 100MB, Documents 50MB (see `CAPABILITIES` in `format.ts`)
- **Browser compatibility:** Requires SharedArrayBuffer (modern browsers only)
- **Build output:** WASM files go to `dist/assets/` with hashed names
