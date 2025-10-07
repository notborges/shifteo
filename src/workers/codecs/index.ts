import type { ImageConvertOpts } from '@/workers/types'

export type AvailableCodec = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'tiff' | 'ico'

interface CodecModule {
  decode: (buffer: ArrayBuffer, pageIndex?: number) => Promise<JSquashImageData>
  encode: (imageData: JSquashImageData, options?: unknown) => Promise<ArrayBuffer>
}

interface JSquashImageData {
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
}

let pngModule: CodecModule | null = null
let jpegModule: CodecModule | null = null
let webpModule: CodecModule | null = null
let avifModule: CodecModule | null = null
let bmpCodec: typeof import('./local-bmp') | null = null
let tiffCodec: typeof import('./local-tiff') | null = null
let icoCodec: typeof import('./local-ico') | null = null
let oxipngOptimise: ((buffer: ArrayBuffer, options?: unknown) => Promise<ArrayBuffer>) | null = null
let resizeImage: ((imageData: JSquashImageData, options: { width: number; height: number; method?: string }) => Promise<JSquashImageData>) | null = null

let loadingPromise: Promise<void> | null = null
let codecsReady = false

async function loadCodecModules() {
  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    const [png, jpeg, webp, avif, oxipng, resize, bmp, tiff, ico] = await Promise.all([
      import('@jsquash/png'),
      import('@jsquash/jpeg'),
      import('@jsquash/webp'),
      import('@jsquash/avif'),
      import('@jsquash/oxipng'),
      import('@jsquash/resize'),
      import('./local-bmp'),
      import('./local-tiff'),
      import('./local-ico')
    ])

    pngModule = { decode: png.decode, encode: png.encode }
    jpegModule = { decode: jpeg.decode, encode: jpeg.encode }
    webpModule = { decode: webp.decode, encode: webp.encode }
    avifModule = { decode: avif.decode, encode: avif.encode }
    oxipngOptimise = oxipng.optimise
    resizeImage = resize.default
    bmpCodec = bmp
    tiffCodec = tiff
    icoCodec = ico
    codecsReady = true
  })()

  return loadingPromise
}

export async function ensureCodecsLoaded(): Promise<void> {
  await loadCodecModules()
}

export function areCodecsLoaded(): boolean {
  return codecsReady
}

export function getMimeType(format: AvailableCodec): string {
  const mimeTypes: Record<AvailableCodec, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    ico: 'image/vnd.microsoft.icon'
  }
  return mimeTypes[format]
}

export function detectFormat(bytes: Uint8Array): AvailableCodec | null {
  if (bytes.length >= 12) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'png'
    }
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'jpeg'
    }
    if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'webp'
    }
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
      return 'bmp'
    }
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) ||
      (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A)
    ) {
      return 'tiff'
    }
    if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
      return 'ico'
    }
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
      if (brand === 'avif' || brand === 'avis' || brand === 'av01') {
        return 'avif'
      }
    }
  }

  return null
}

export async function decodeImage(buffer: ArrayBuffer, opts: { pageIndex?: number } = {}): Promise<JSquashImageData> {
  await ensureCodecsLoaded()

  const bytes = new Uint8Array(buffer)
  const format = detectFormat(bytes)

  switch (format) {
    case 'png':
      return pngModule!.decode(buffer)
    case 'jpeg':
      return jpegModule!.decode(buffer)
    case 'webp':
      return webpModule!.decode(buffer)
    case 'avif':
      return avifModule!.decode(buffer)
    case 'bmp':
      return bmpCodec!.decode(buffer)
    case 'tiff':
      return tiffCodec!.decode(buffer, opts.pageIndex ?? 0)
    case 'ico':
      return icoCodec!.decode(buffer)
    default:
      // Try all decoders if detection failed
      return fallbackDecode(buffer, opts)
  }
}

async function fallbackDecode(buffer: ArrayBuffer, opts: { pageIndex?: number }): Promise<JSquashImageData> {
  const decoders: Array<CodecModule | { decode: (buffer: ArrayBuffer, pageIndex?: number) => Promise<JSquashImageData> } | null> = [
    pngModule,
    jpegModule,
    webpModule,
    avifModule,
    bmpCodec,
    tiffCodec,
    icoCodec
  ]

  for (const decoder of decoders) {
    if (!decoder) continue
    try {
      return await decoder.decode(buffer, opts.pageIndex)
    } catch {
      continue
    }
  }

  throw new Error('Unsupported image format')
}

export async function resizeImageData(
  imageData: JSquashImageData,
  targetWidth: number,
  targetHeight: number
): Promise<JSquashImageData> {
  await ensureCodecsLoaded()
  return resizeImage!(imageData, {
    width: targetWidth,
    height: targetHeight,
    method: 'mitchell'
  })
}

export async function encodeImage(
  imageData: JSquashImageData,
  format: AvailableCodec,
  opts: Pick<ImageConvertOpts, 'quality'> & { pngOptimizeLevel?: number }
): Promise<ArrayBuffer> {
  await ensureCodecsLoaded()

  switch (format) {
    case 'png': {
      const encoded = await pngModule!.encode(imageData)
      const level = opts.pngOptimizeLevel ?? (imageData.width * imageData.height > 4_000_000 ? 1 : 2)
      return oxipngOptimise!(encoded, { level })
    }
    case 'jpeg':
      return jpegModule!.encode(imageData, { quality: Math.round((opts.quality ?? 0.85) * 100) })
    case 'webp':
      return webpModule!.encode(imageData, { quality: Math.round((opts.quality ?? 0.85) * 100) })
    case 'avif':
      return avifModule!.encode(imageData, { quality: Math.round((opts.quality ?? 0.85) * 100) })
    case 'bmp':
      return bmpCodec!.encode(imageData)
    case 'tiff':
      return tiffCodec!.encode(imageData)
    case 'ico': {
      // ICO expects square entries; resize to nearest power sequence if needed handled upstream
      return icoCodec!.encode(imageData)
    }
    default:
      throw new Error(`Unsupported encode format: ${format}`)
  }
}

export type { JSquashImageData }
