import type { ImageFormat } from '@/constants/image'
import type { ImageConvertOpts, ResizeMethod } from '@/workers/types'
import { IMAGE_MIME_TYPES } from '@/constants/image'
import type { WorkerResizeOptions } from '@jsquash/resize/meta'
import type { OptimiseOptions } from '@jsquash/oxipng/meta'
import type { EncodeOptions as JpegEncodeOptions } from '@jsquash/jpeg/meta'
import type { EncodeOptions as WebpEncodeOptions } from '@jsquash/webp/meta'
import type { EncodeOptions as AvifEncodeOptions } from '@jsquash/avif/meta'

// HEIC is detected and decoded, but cannot be encoded.
export type AvailableCodec = ImageFormat | 'heic'

interface CodecModule {
  decode: (buffer: ArrayBuffer, pageIndex?: number) => Promise<JSquashImageData>
  encode: (imageData: JSquashImageData, options?: unknown) => Promise<ArrayBuffer>
}

interface JSquashImageData {
  data: Uint8ClampedArray<ArrayBufferLike>
  width: number
  height: number
}

let pngModule: CodecModule | null = null
let jpegModule: CodecModule | null = null
let webpModule: CodecModule | null = null
let avifModule: CodecModule | null = null
let jxlModule: CodecModule | null = null
let bmpCodec: typeof import('./local-bmp') | null = null
let tiffCodec: typeof import('./local-tiff') | null = null
let icoCodec: typeof import('./local-ico') | null = null
let heicCodec: typeof import('./local-heic') | null = null
let oxipngOptimise: ((buffer: ArrayBuffer, options?: Partial<OptimiseOptions>) => Promise<ArrayBuffer>) | null = null
let resizeImage: ((
  imageData: JSquashImageData,
  options: Partial<WorkerResizeOptions> & { width: number; height: number }
) => Promise<JSquashImageData>) | null = null

let loadingPromise: Promise<void> | null = null
let codecsReady = false

function toClampedArray(data: Uint8Array | Uint8ClampedArray<ArrayBufferLike>): Uint8ClampedArray<ArrayBuffer> {
  if (data instanceof Uint8ClampedArray && data.buffer instanceof ArrayBuffer) {
    return data as Uint8ClampedArray<ArrayBuffer>
  }
  return Uint8ClampedArray.from(data) as Uint8ClampedArray<ArrayBuffer>
}

function normalizeImageData(result: { data: Uint8Array | Uint8ClampedArray<ArrayBufferLike>; width: number; height: number }): JSquashImageData {
  return {
    data: toClampedArray(result.data),
    width: result.width,
    height: result.height
  }
}

function toImageData(image: JSquashImageData): ImageData {
  return new ImageData(toClampedArray(image.data), image.width, image.height)
}

async function loadCodecModules() {
  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    const [png, jpeg, webp, avif, jxl, oxipng, resize, bmp, tiff, ico, heic] = await Promise.all([
      import('@jsquash/png'),
      import('@jsquash/jpeg'),
      import('@jsquash/webp'),
      import('@jsquash/avif'),
      import('@jsquash/jxl'),
      import('@jsquash/oxipng'),
      import('@jsquash/resize'),
      import('./local-bmp'),
      import('./local-tiff'),
      import('./local-ico'),
      import('./local-heic')
    ])

    pngModule = {
      decode: async (buffer: ArrayBuffer) => normalizeImageData(await png.decode(buffer)),
      encode: async (imageData, options) =>
        png.encode(toImageData(imageData), options as Parameters<typeof png.encode>[1])
    }
    jpegModule = {
      decode: async (buffer: ArrayBuffer) => normalizeImageData(await jpeg.decode(buffer)),
      encode: async (imageData, options) =>
        jpeg.encode(toImageData(imageData), options as Partial<JpegEncodeOptions>)
    }
    webpModule = {
      decode: async (buffer: ArrayBuffer) => normalizeImageData(await webp.decode(buffer)),
      encode: async (imageData, options) =>
        webp.encode(toImageData(imageData), options as Partial<WebpEncodeOptions>)
    }
    avifModule = {
      decode: async (buffer: ArrayBuffer) => {
        const result = await avif.decode(buffer)
        if (!result) {
          throw new Error('AVIF decode failed')
        }
        return normalizeImageData(result)
      },
      encode: async (imageData, options) =>
        avif.encode(toImageData(imageData), options as (Partial<AvifEncodeOptions> & { bitDepth?: 8 }))
    }
    jxlModule = {
      decode: async (buffer: ArrayBuffer) => {
        const result = await jxl.decode(buffer)
        if (!result) {
          throw new Error('JXL decode failed')
        }
        return normalizeImageData(result)
      },
      encode: async (imageData, options) =>
        jxl.encode(toImageData(imageData), options as Parameters<typeof jxl.encode>[1])
    }
    oxipngOptimise = (buffer: ArrayBuffer, options?: Partial<OptimiseOptions>) =>
      oxipng.optimise(buffer, options as Parameters<typeof oxipng.optimise>[1])
    resizeImage = async (imageData, options) => {
      const result = await resize.default(toImageData(imageData), options)
      if (!result) {
        throw new Error('Resize failed')
      }
      return normalizeImageData(result as ImageData)
    }
    bmpCodec = bmp
    tiffCodec = tiff
    icoCodec = ico
    heicCodec = heic
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
  return IMAGE_MIME_TYPES[format]
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
      const brand = String.fromCharCode(
        bytes[8]!,
        bytes[9]!,
        bytes[10]!,
        bytes[11]!
      )
      if (brand === 'avif' || brand === 'avis' || brand === 'av01') {
        return 'avif'
      }
      const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']
      if (heicBrands.includes(brand)) {
        return 'heic'
      }
    }
    if (bytes[0] === 0xFF && bytes[1] === 0x0A) {
      return 'jxl'
    }
    if (
      bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x0C &&
      bytes[4] === 0x4A && bytes[5] === 0x58 && bytes[6] === 0x4C && bytes[7] === 0x20 &&
      bytes[8] === 0x0D && bytes[9] === 0x0A && bytes[10] === 0x87 && bytes[11] === 0x0A
    ) {
      return 'jxl'
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
    case 'jxl':
      return jxlModule!.decode(buffer)
    case 'heic': {
      const result = await heicCodec!.decode(buffer)
      return normalizeImageData(result)
    }
    case 'bmp':
      return bmpCodec!.decode(buffer)
    case 'tiff':
      return tiffCodec!.decode(buffer, opts.pageIndex ?? 0)
    case 'ico':
      return icoCodec!.decode(buffer)
    default:
      return fallbackDecode(buffer, opts)
  }
}

async function fallbackDecode(buffer: ArrayBuffer, opts: { pageIndex?: number }): Promise<JSquashImageData> {
  const attempts: Array<() => Promise<JSquashImageData>> = []

  if (pngModule) attempts.push(() => pngModule!.decode(buffer))
  if (jpegModule) attempts.push(() => jpegModule!.decode(buffer))
  if (webpModule) attempts.push(() => webpModule!.decode(buffer))
  if (avifModule) attempts.push(() => avifModule!.decode(buffer))
  if (jxlModule) attempts.push(() => jxlModule!.decode(buffer))
  if (heicCodec) attempts.push(async () => normalizeImageData(await heicCodec!.decode(buffer)))
  if (bmpCodec) attempts.push(() => bmpCodec!.decode(buffer))
  if (tiffCodec) attempts.push(() => tiffCodec!.decode(buffer, opts.pageIndex ?? 0))
  if (icoCodec) attempts.push(() => icoCodec!.decode(buffer))

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch {
      continue
    }
  }

  throw new Error('Unsupported image format')
}

export async function resizeImageData(
  imageData: JSquashImageData,
  targetWidth: number,
  targetHeight: number,
  method: ResizeMethod = 'lanczos3'
): Promise<JSquashImageData> {
  await ensureCodecsLoaded()
  return resizeImage!(imageData, {
    width: targetWidth,
    height: targetHeight,
    method
  })
}

export async function encodeImage(
  imageData: JSquashImageData,
  format: ImageFormat,
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
    case 'jxl':
      return jxlModule!.encode(imageData, { quality: Math.round((opts.quality ?? 0.85) * 100) })
    case 'bmp':
      return bmpCodec!.encode(imageData)
    case 'tiff':
      return tiffCodec!.encode(imageData)
    case 'ico': {
      return icoCodec!.encode(imageData)
    }
    default:
      throw new Error(`Unsupported encode format: ${format}`)
  }
}

export type { JSquashImageData }
