# Image formats

The current image support is defined in `src/constants/image.ts` and `src/utils/format.ts`, and implemented by the codecs under `src/workers/codecs`.

| Format | Input | Output |
| --- | --- | --- |
| PNG | Yes | Yes |
| JPEG | Yes | Yes |
| WebP | Yes | Yes |
| AVIF | Yes | Yes |
| JPEG XL | Yes | Yes |
| HEIC/HEIF | Yes | No |
| SVG | Yes | No |
| BMP | Yes | Yes |
| TIFF | Yes | Yes |
| ICO | Yes | Yes |

When adding a format, update the format constants, MIME mappings, worker codec, UI format options, and tests together.
