# PDF Operations Roadmap

This checklist captures the PDF tooling status so we can expand Shifteo into an "anything with PDF" hub. Update this file whenever a capability ships or a new task is identified.

## Core Workflows

| Capability              | Status   | Notes / Follow-up |
|------------------------|----------|--------------------|
| Merge PDFs              | In progress | Queue thumbnails + drag ordering polish shipping. |
| Split / Extract pages   | In progress | Interactive grid with lazy thumbnails + drag select + ZIP quick export. |
| Organize pages (reorder, rotate, delete, duplicate) | Not started | Grid UI with drag-drop and quick actions. |
| Compress / Optimise     | In progress | Presets downsample images and keep vector text where possible. |
| PDF → Images export     | Not started | Export to PNG/JPEG/WebP, packaged as ZIP when needed. |
| Images → PDF            | Not started | Batch import, control page size/margins. |

## Advanced Enhancements (future)

- Page insertion/replacement across documents.
- Annotation and redaction tools.
- Form filling/creation + flattening.
- e-Signature workflows.
- OCR ingestion for scanned PDFs.
- Security: password add/remove, permissions, watermarking.
- Batch presets / automation flows.

### Next Up

- Add keyboard + range shortcuts to split selection.
- Tune compression presets with richer optimisation (image downscaling, previews).
- Persist PDF thumbnail cache with quota-aware eviction.
