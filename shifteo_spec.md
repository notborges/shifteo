
# Shifteo — Local File Converter (MVP)  
**Tagline:** *Convert, transform, and move files — 100% locally.*  
**Home:** `akius.tools/shifteo` (optionally `shifteo.sh` later)  
**Author:** Akius (aka **akiusdevo**)  
**Spec version:** v0.1 (MVP, AI‑builder friendly)

---

## 0) Purpose & Positioning

Shifteo is a **privacy‑first, offline‑capable converter** for images, documents, and (basic) videos that runs entirely in the **browser** using **WebAssembly + Web Workers**. No uploads, no servers. Targets modern desktop and mobile browsers.

**User promise:** “Drag files in. Pick a format. Get results instantly — without your data leaving your device.”

**Audience:** Developers, designers, students, and everyday users who want quick conversions without cloud uploads.

**Tone:** Calm, modern, trustworthy (siblings with *Crateo*).

---

## 1) Scope (MVP → v0.1)

### 1.1 Image Conversions (MVP ✅)
- **Formats:** PNG, JPEG, WebP, AVIF.
- **Operations:** format convert, resize (by px/%, long-edge), quality/CRF, strip EXIF, color space preserve, batch processing.
- **Tech:** Squoosh codecs (WASM) — `oxipng`, `mozjpeg`, `webp`, `avif` (via libavif).

### 1.2 Document Conversions (MVP ⚠️ pragmatic)
- **DOCX → HTML** (via `mammoth` client-side; faithful text & inline images, no macros).
- **HTML → PDF** (via native print-to-PDF *or* `html2pdf.js` canvas route; fidelity depends on browser).
- **PDF → Image(s)** (per‑page PNG/JPEG using `pdfjs-dist` renderer).
- **PDF merge/split** (basic) using `pdf-lib`.

> NOTE: High‑fidelity Office conversions (e.g., DOCX → PDF with layout parity) **are non-trivial locally**. MVP chooses: **DOCX→HTML** (good), then **HTML→PDF** as best‑effort. Communicate limitations clearly in UI.

### 1.3 Video Conversions (MVP 🚧 limited)
- **Transcode:** MP4 (H.264/AAC) ↔ WebM (VP9/Opus) — **small/medium clips** only.
- **Extract audio:** MP3/OGG.
- **Trim:** start/end timestamps.
- **Tech:** `@ffmpeg/ffmpeg` (ffmpeg.wasm). Warn on > ~200MB due to memory/CPU.

### 1.4 Non‑Goals (defer to v1)
- HEIC/HEIF import (requires HEIF decoder; explore libheif WASM later).
- Complex Office (PPTX/XLSX) fidelity.
- Advanced video filters, HDR, subtitles.
- OCR (possible via Tesseract WASM later).

---

## 2) Tech Stack

- **Frontend:** Vue 3 + Vite + TypeScript.
- **UI:** TailwindCSS + PrimeVue (with **Lucide** icons).  
  (User preference from ecosystem; consistent with Akius projects.)
- **WASM & Workers:** Web Workers + `comlink` for RPC; modular workers per domain (`image`, `doc`, `video`).
- **Storage:** IndexedDB + OPFS (Origin Private File System) for temp blobs; File System Access API for save‑as, where permitted.
- **PWA:** Workbox (offline shell, codec caching with versioning).
- **State mgmt:** Pinia (lightweight), persisted preferences in IndexedDB.
- **i18n:** Vue I18n (en → pt later).
- **Testing:** Vitest + Playwright (E2E), Lighthouse CI (perf & PWA).
- **Telemetry:** None by default (privacy). Optional local-only metrics (session stats only).

---

## 3) Architecture & Modules

```
/shifteo
  ├─ src/
  │  ├─ app/
  │  │  ├─ App.vue
  │  │  ├─ router.ts
  │  │  ├─ main.ts
  │  │  └─ stores/ (Pinia)
  │  ├─ components/
  │  │  ├─ DropZone.vue
  │  │  ├─ FileList.vue
  │  │  ├─ ConvertPanel.vue
  │  │  ├─ ImageOptions.vue
  │  │  ├─ DocOptions.vue
  │  │  ├─ VideoOptions.vue
  │  │  ├─ TaskQueue.vue
  │  │  └─ SaveDialog.vue
  │  ├─ workers/
  │  │  ├─ image.worker.ts
  │  │  ├─ doc.worker.ts
  │  │  ├─ video.worker.ts
  │  │  └─ types.ts
  │  ├─ wasm/ (lazy-loaded bundles, codecs)
  │  ├─ utils/
  │  │  ├─ file.ts (mime detect, ext)
  │  │  ├─ idb.ts (IndexedDB helpers)
  │  │  ├─ opfs.ts (Origin Private FS ops)
  │  │  ├─ blob.ts (stream ↔ blob)
  │  │  └─ format.ts (caps table, limits)
  │  ├─ styles/
  │  └─ pages/
  │     ├─ Home.vue
  │     ├─ Images.vue
  │     ├─ Documents.vue
  │     └─ Videos.vue
  ├─ public/
  │  └─ icons, manifest, sw.js
  ├─ package.json
  ├─ vite.config.ts
  ├─ workbox.config.cjs
  └─ README.md
```

### 3.1 Worker RPC Interface (TypeScript)

```ts
// src/workers/types.ts
export type ImageConvertOpts = {
  to: 'png'|'jpeg'|'webp'|'avif';
  quality?: number;   // 0..1
  width?: number;     // px
  height?: number;    // px
  longEdge?: number;  // px
  keepExif?: boolean; // default false
  colorSpace?: 'srgb'|'display-p3';
};

export type DocTask =
 | { kind:'docx_to_html' }
 | { kind:'html_to_pdf', options?: { margin?: number; page?: 'A4'|'Letter'; } }
 | { kind:'pdf_to_images', dpi?: number }
 | { kind:'pdf_merge' }
 | { kind:'pdf_split', pages: number[] };

export type VideoTask = {
  to: 'mp4'|'webm'|'mp3'|'ogg';
  start?: number;  // seconds
  end?: number;    // seconds
  crf?: number;    // quality target
};

export interface ShifteoWorker {
  ping(): Promise<'pong'>;
}

export interface ImageWorker extends ShifteoWorker {
  convert(file: File, opts: ImageConvertOpts): Promise<Blob>;
  batch(files: File[], opts: ImageConvertOpts): Promise<Blob[]>;
}

export interface DocWorker extends ShifteoWorker {
  run(input: File[]|File, task: DocTask): Promise<Blob|Blob[]>;
}

export interface VideoWorker extends ShifteoWorker {
  transcode(file: File, task: VideoTask): Promise<Blob>;
}
```

### 3.2 Capability Table

```ts
// src/utils/format.ts
export const CAPABILITIES = {
  image: {
    input: ['png','jpg','jpeg','webp','avif'],
    output: ['png','jpeg','webp','avif'],
    maxMb: 100,
  },
  document: {
    input: ['pdf','docx','html'],
    output: ['pdf','html','png','jpeg'],
    notes: 'DOCX→HTML best; HTML→PDF fidelity varies; PDF→Images via canvas render.'
  },
  video: {
    input: ['mp4','webm'],
    output: ['mp4','webm','mp3','ogg'],
    maxMb: 200,
  }
} as const;
```

### 3.3 Web Worker Setup (Comlink)

```ts
// src/workers/image.worker.ts
import * as Comlink from 'comlink';
import { decodeImage, encodeImage } from './wasm/image-codecs'; // wrap Squoosh
import type { ImageWorker, ImageConvertOpts } from './types';

const api: ImageWorker = {
  async ping() { return 'pong'; },
  async convert(file, opts) {
    const src = new Uint8Array(await file.arrayBuffer());
    const img = await decodeImage(src);           // to RGBA buffer
    const out = await encodeImage(img, opts);     // to target format
    return new Blob([out.data], { type: out.mime });
  },
  async batch(files, opts) {
    const results: Blob[] = [];
    for (const f of files) results.push(await this.convert(f, opts));
    return results;
  }
};
Comlink.expose(api);
```

> Each worker bundles only its needed WASM. Use **code-splitting** and **dynamic import** to keep main bundle tiny.

---

## 4) UI/UX — Flows & Components

### 4.1 Home (All-in-One)
- **Dropzone** (drag & drop / click to pick).
- Detect type(s) → route to **Images / Documents / Videos** tab automatically.
- Show selected files in **TaskList** with per‑file options preview.
- Big **“Convert”** button with selected target format.
- **Queue runner** with progress, ETA, cancel, retry.

### 4.2 Images Tab
- Format selector (PNG/JPEG/WebP/AVIF).
- Quality slider; Resize controls (keep aspect, long edge).
- Toggle: **Strip metadata** (default on).
- Batch select output folder (File System Access API if available).
- **Preview panel** (before/after size estimate).

### 4.3 Documents Tab
- **DOCX → HTML** (primary action).
- **HTML → PDF** (with paper size/margins).
- **PDF → Images** (DPI, range selector).
- **Merge / Split** tool (simple UI).
- Accessibility warning/info for fidelity.

### 4.4 Videos Tab (experimental banner)
- Input format display.
- Target format (MP4/WebM/Audio MP3/OGG).
- Trim controls (start/end); CRF/bitrate simplified.
- Clearly show **limitations** (file size, CPU, battery).

### 4.5 Global
- Header: Shifteo logo, Tabs (Images/Documents/Videos), Settings (gear), “About privacy” link.
- Footer: “**Runs 100% locally**” badge; links to Akius.
- **Dark mode** by default (toggle).
- **Keyboard**: Space to start/pause queue; Delete to remove item; Enter to convert.

### 4.6 Settings
- Default output format per type.
- Default image quality.
- Default PDF paper/margins.
- Output naming pattern: `${name}.${ext}` or `${name}-${w}x${h}.${ext}`.
- Storage cleanup: purge temp OPFS/IDB.

---

## 5) Performance & Privacy

- Heavy work in **Web Workers**; main thread stays responsive.
- WASM / codecs are **lazy-loaded** per need.
- **Streaming** where possible (FFmpeg.wasm supports FS abstraction — prefer chunked ops; but note memory constraints).
- No external network calls; all processing local.
- PWA: offline shell + cached WASM (versioned). Show “Updated codecs available” toast on new SW.
- Respect **battery saver**: warn if large video job on mobile.

---

## 6) Error Handling & Limits

- On unsupported formats: gray‑out target or show “decode not supported locally yet.”
- File too large: show recommended alternative (e.g., “try desktop browser”).
- Video errors: show friendly fallback and docs link.
- Always keep original file safe; never overwrite by default.
- Collect non‑identifying error stats **locally** only (for UI hints).

---

## 7) Accessibility & Internationalization

- Semantic Vue components; proper labels, roles, focus traps (modals).
- Progress bars with `aria-live` updates.
- Color contrast AA minimum.
- i18n scaffold with `en` strings; `pt` as second locale later.

---

## 8) Security

- Use **OPFS** for temp storage to avoid accidental leakage.
- Disallow script execution from user HTML (sanitized preview only).
- CSP: `default-src 'self'; connect-src 'self'; img-src 'self' blob:; media-src 'self' blob:; worker-src 'self' blob:;` etc.
- No analytics by default. If ever added, must be **opt‑in** and local-first.

---

## 9) Build & Tooling

### 9.1 package.json (excerpt)

```json
{
  "name": "shifteo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "e2e": "playwright test",
    "lint": "eslint ."
  },
  "dependencies": {
    "vue": "^3.5.0",
    "pinia": "^2.1.7",
    "vue-router": "^4.3.0",
    "primevue": "^3.53.0",
    "lucide-vue-next": "^0.372.0",
    "idb": "^8.0.0",
    "comlink": "^4.4.1",
    "pdfjs-dist": "^4.4.168",
    "pdf-lib": "^1.17.1",
    "mammoth": "^1.7.2",
    "@ffmpeg/ffmpeg": "^0.12.10"
  },
  "devDependencies": {
    "typescript": "^5.5.2",
    "vite": "^5.4.0",
    "vitest": "^2.0.5",
    "@vitest/ui": "^2.0.5",
    "@playwright/test": "^1.46.0",
    "tailwindcss": "^3.4.10",
    "workbox-build": "^7.1.1",
    "eslint": "^9.9.0"
  }
}
```

### 9.2 Vite (workers & WASM)

```ts
// vite.config.ts (key bits)
export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      output: { manualChunks: { 'pdf': ['pdfjs-dist'], 'ffmpeg': ['@ffmpeg/ffmpeg'] } }
    }
  },
  worker: { format: 'es' }
});
```

### 9.3 Tailwind (minimal)
- Base + utilities only; keep custom CSS tiny.
- PrimeVue theme: use minimal overrides, Lucide for icons.

---

## 10) Implementation Notes (per domain)

### 10.1 Images (Squoosh‑style pipeline)
- Decode → RGBA → transform (resize) → encode.
- Prefer **wasm‑avif**, **mozjpeg**, **webp** encoders.
- Progressive JPEG option (toggle).
- Strip EXIF by default; allow keep toggle.
- Preview with `<canvas>` + size estimation (encoded in worker for accuracy).

### 10.2 Documents
- **DOCX→HTML:** `mammoth` is robust for text, headings, lists, images; warn about complex layouts.
- **HTML→PDF:** use `html2canvas` + `jsPDF` OR native print dialog route with a styled print CSS; offer both.
- **PDF→Images:** `pdfjs-dist` render per page to canvas → export PNG/JPEG; allow range & DPI.
- **Merge/Split:** `pdf-lib` compose pages; maintain metadata where possible.

### 10.3 Videos (ffmpeg.wasm)
- Ship with a **small preset**:  
  - MP4: `-c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k`  
  - WebM: `-c:v libvpx-vp9 -b:v 0 -crf 32 -c:a libopus -b:a 96k`
- Trim via `-ss`/`-to` (input‑side when possible).
- Show CPU/battery guidance; keep UX honest about time.

---

## 11) File I/O & Persistence

- **Input:** `<input type="file" webkitdirectory multiple>` + drag/drop.
- **Temp:** OPFS for intermediate results; auto clean after session or on demand.
- **Output:** `showSaveFilePicker` or multi‑save with `zip` (if batch); name templates.
- **Large files:** stream to OPFS, process in chunks where codec supports.

---

## 12) PWA & Offline

- App shell cached; “codex” cache (WASM blobs) versioned with `rev` query.
- When SW updates, prompt: “New codecs available. Reload?”
- Installable on desktop; retains settings offline.

---

## 13) QA & Benchmarks

- Test with sample sets:
  - Images: 50x mixed 4–20MB PNG/JPEG → WebP/AVIF.
  - Docs: 10x DOCX with headings, tables, images → HTML; 5x HTML → PDF.
  - PDFs: 200 pages split/merge; 50 pages → images at 150 DPI.
  - Videos: 2–3 minute clips 720p/1080p MP4↔WebM; audio extract.
- Measure:
  - Time to interactive, first conversion latency.
  - Worker memory footprint (heap/max for ffmpeg.wasm).
  - Result fidelity vs size.

---

## 14) Roadmap (post-MVP)

- HEIC/HEIF → JPEG/PNG (libheif WASM).
- OCR: Tesseract WASM (PDF/Image → searchable PDF).
- Batch HTML→PDF pagination improvements.
- True DOCX→PDF pipeline (WASM LibreOffice experiments; to study).
- Metadata editor (EXIF/XMP) UI.
- Auto “best size/quality” advisor (on‑device heuristic).

---

## 15) Legal & Licenses

- Ensure codec licenses compatible with client distribution:
  - mozjpeg/libjpeg‑turbo, libwebp, libavif, ffmpeg (LGPL builds).
- Third‑party notices page in app (“About → Licenses”).
- No tracking; state privacy policy clearly (“All processing is local”).

---

## 16) Deliverables for MVP

1. **Repo** with Vue3 + Vite + TS, Tailwind, PrimeVue scaffold.
2. **Workers**: image/doc/video with Comlink RPC & tests.
3. **Pages**: Home + Images + Documents + Videos.
4. **PWA**: manifest + Workbox SW.
5. **QA scripts** for batch tests (Playwright).
6. **Brand assets**: minimal wordmark “Shifteo”, dark/light icon.
7. **Docs**: README with capabilities/limits & troubleshooting.

---

## 17) Microcopy (ready-to-use)

- **Dropzone:** “Drop files here or click to pick.”  
- **Privacy badge:** “Runs 100% on your device.”  
- **Size warning:** “This clip is large. Processing may be slow in-browser.”  
- **Limit note (DOCX):** “Complex layouts may differ. Best for text-first documents.”  
- **EXIF toggle:** “Remove metadata (recommended).”  
- **Success toast:** “Converted {N} file(s). Saved to your Downloads.”

---

## 18) Visual Identity (quick brief)

- Wordmark: **Shifteo** (Inter / Satoshi / SF-like, medium weight).  
- Icon: two overlapping “file corners” subtly sliding → **shift** motif.  
- Colors: base graphite (#0f1115), accent cyan/teal for actions; high-contrast text.  
- Motion: 120–160ms ease transitions; no heavy animations during conversion.

---

## 19) Acceptance Criteria (MVP)

- ✅ Convert 20 mixed PNG/JPEG to WebP/AVIF under 60s on M1 Air.  
- ✅ DOCX→HTML stays faithful for headings/lists/images.  
- ✅ PDF→PNG for page ranges with DPI control.  
- ✅ MP4→WebM for a 90s 720p clip completes without crash.  
- ✅ No network requests after first load (verified via devtools).  
- ✅ Lighthouse PWA score ≥ 90.

---

### Appendix A — Example Vue Components (stubs)

```vue
<!-- src/components/DropZone.vue -->
<template>
  <div @drop.prevent="onDrop" @dragover.prevent class="border-dashed rounded-2xl p-10 text-center">
    <p class="text-lg">Drop files here or click to pick</p>
    <input ref="picker" type="file" multiple class="hidden" @change="onPick" />
    <Button class="mt-4" @click="$refs.picker.click()">Choose files</Button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const picker = ref<HTMLInputElement|null>(null);
function onPick(e: Event) { /* emit files */ }
function onDrop(e: DragEvent) { /* emit files */ }
</script>
```

```ts
// src/app/stores/queue.ts (Pinia)
import { defineStore } from 'pinia';
export const useQueue = defineStore('queue', {
  state: () => ({ jobs: [] as { id:string; file:File; kind:'image'|'doc'|'video'; status:'idle'|'running'|'done'|'error'; }[] }),
  actions: {
    enqueue(job) { this.jobs.push(job); },
    update(id, patch) { Object.assign(this.jobs.find(j=>j.id===id)!, patch); }
  }
});
```

---

**Shifteo (MVP) is now clearly specified for AI agents.**  
Focus on **images first**, ship in days; add documents/videos iteratively with honest UI about limits.
