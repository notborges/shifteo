# Shifteo

Shifteo is a browser-based image converter. Files are processed on your device with WebAssembly and Web Workers; the app does not upload them to a server.

## What it does

- Convert and batch-process images.
- Resize, crop, rotate, and flip images.
- Apply filters and adjustments.
- Strip metadata from supported output formats.
- Download individual results or the complete batch.
- Continue a session using browser storage.

Supported input formats are PNG, JPEG, WebP, AVIF, JPEG XL, HEIC/HEIF, SVG, BMP, TIFF, and ICO. The selectable output formats are PNG, JPEG, WebP, AVIF, JPEG XL, TIFF, and ICO. HEIC/HEIF and SVG are input formats only.

## Run locally

Install [Bun](https://bun.sh/), then run:

```sh
bun install
bun run dev
```

The development server prints its local URL. To create and preview a production build:

```sh
bun run build
bun run preview
```

`VITE_SITE_URL` is optional. Set it in `.env` when building for a different domain; it is used for canonical URLs and the sitemap.

## Checks

```sh
bun run test
bun run lint
bun run build
```

The Playwright browser suite is run separately with `bun run e2e`. Install the browsers first if needed:

```sh
bunx playwright install
```

## Project layout

```text
src/
  app/          app shell, routing, stores, and SEO metadata
  components/   the upload, processing, and notification UI
  pages/        route-level screens
  utils/        browser storage and file helpers
  workers/      image processing and format codecs
tests/e2e/      Playwright browser tests
  scripts/        sitemap generation
```

The image conversion pipeline runs in a worker pool. Codec modules are loaded only when processing starts, and the build includes the WebAssembly assets needed by the app.

## Privacy

Shifteo has no account system, analytics, or application server. Image data stays in the browser while it is being processed. The app may use IndexedDB to keep temporary files and restore an interrupted session; use the reset action or clear the site data in your browser to remove them.

The app loads its display and interface fonts from Google Fonts. Image processing itself runs locally and does not use third-party runtime services.

## Licenses

Shifteo is licensed under the MIT License. The Licenses page lists the third-party libraries used by the app and links to their upstream repositories.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request guidelines.
