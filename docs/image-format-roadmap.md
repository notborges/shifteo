# Image Format Expansion Roadmap

This document tracks the work required to reach "any common image in → any desired image out" while staying commercial-friendly.

## Phase 0 · Baseline
- [ ] Inventory current codecs (PNG, JPEG, WebP, AVIF, SVG input) and capture license notes.
- [ ] Establish shared encode interface (single entry point for all formats).
- [ ] Extend test fixtures to cover existing formats and metadata cases.

## Phase 1 · Codec Additions
| Format | Tasks | Library Candidate | License | Notes |
| --- | --- | --- | --- | --- |
| HEIC / HEIF | ☐ Decode ☐ Encode ☐ Metadata support ☐ Fixtures/tests | `libheif-wasm`, `heic2any` | BSD / MIT (LGPL for full libheif) | Requires fallback for unsupported browsers. Patent licence needed for HEVC. |
| TIFF | ☑ Decode ☑ Encode ☐ Multi-page handling | `utif` | MIT | Support for 8/16-bit, grayscale, palette. |
| GIF (still) | ☐ Decode frame ☐ Optional encode | `gifuct-js` | MIT | Treat animation as optional stretch goal. |
| JPEG XL | ☐ Decode ☐ Encode | `libjxl` | BSD | Large wasm payload; lazy-load. |
| BMP / ICO | ☑ BMP decode ☑ BMP encode ☑ ICO decode/encode | In-house BMP module / `icojs` | MIT | Multi-size ICO for favicons. |
| License summary | | | | BMP: MIT (in-house) · TIFF: MIT (UTIF) · ICO: MIT (`icojs`) |
| RAW (CR2/NEF/ARW) | ☐ Decode → PNG ☐ Color/profile handling | `libraw-wasm` (LGPL) | LGPL | Evaluate licensing impact; may require dual-licensing. |
| HDR / EXR | ☐ Decode ☐ Tone-map | `tinyexr` | BSD | Convert to SDR PNG/TIFF output. |

## Phase 2 · Output Matrix & UI
- [ ] Dynamic output picker showing only supported targets per input selection.
- [ ] Multi-output selection (e.g., PNG + WebP + AVIF) with per-job tracking.
- [ ] Queue job schema updates for multiple result blobs + metadata.
- [ ] Update previews and summaries to show each exported variant.

## Phase 3 · Metadata & Color Management
- [ ] Global metadata strategy (preserve vs strip, editable fields).
- [ ] Color profile conversion pipeline (sRGB, Display-P3, AdobeRGB) using `color.js` or wasm LUTs.
- [ ] Document privacy implications and defaults.

## Phase 4 · Testing & Compliance
- [ ] Fixture set covering each format (success + failure cases).
- [ ] Vitest coverage for encode/decode matrix.
- [ ] Playwright flows per major format.
- [ ] Update `LICENSES.md` (or equivalent) with new dependencies and attribution.
- [ ] Add deployment checklist entry ensuring license compliance for commercial builds.

## Open Questions
- How to handle large wasm payloads (lazy-load vs worker prefetch).
- Minimum browser support targets once advanced codecs are introduced.
- Strategy for LGPL dependencies (e.g., `libraw`) if commercial distribution is planned.

---
_Last updated: 2025-10-07_
