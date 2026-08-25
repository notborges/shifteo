import type { JSquashImageData } from './index'

type IcoModule = {
  decodeIco: (buffer: ArrayBuffer, mime?: string) => Promise<Array<ParsedImage>>
}

type PngModule = typeof import('@jsquash/png')
type ResizeModule = typeof import('@jsquash/resize')

let icoModulePromise: Promise<IcoModule> | null = null
let pngModulePromise: Promise<PngModule> | null = null
let resizeModulePromise: Promise<ResizeModule> | null = null
let decodeICO: ((buffer: ArrayBuffer, mime?: string) => Promise<Array<ParsedImage>>) | null = null
let pngDecode: ((buffer: ArrayBuffer) => Promise<JSquashImageData>) | null = null
let pngEncode: ((imageData: ImageData, options?: unknown) => Promise<ArrayBuffer>) | null = null
let resizeImage: ((imageData: ImageData, options: { width: number; height: number }) => Promise<ImageData>) | null = null

interface ParsedImage {
  width: number
  height: number
  bpp: number
  buffer: ArrayBuffer
}

const ICO_SIZES = [16, 32, 48, 256] as const

async function ensureICO() {
  if (!icoModulePromise) {
    icoModulePromise = import('icojs/browser').then(mod => ({ decodeIco: mod.decodeIco }))
  }
  if (!decodeICO) {
    const mod = await icoModulePromise
    decodeICO = mod.decodeIco
  }
}

async function ensurePNG() {
  if (!pngModulePromise) {
    pngModulePromise = import('@jsquash/png')
  }
  const mod = await pngModulePromise
  if (!pngDecode) pngDecode = mod.decode
  if (!pngEncode) {
    pngEncode = (imageData, options) => mod.encode(imageData, options as Parameters<typeof mod.encode>[1])
  }
}

async function ensureResize() {
  if (!resizeModulePromise) {
    resizeModulePromise = import('@jsquash/resize')
  }
  if (!resizeImage) {
    const mod = await resizeModulePromise
    resizeImage = mod.default
  }
}

function toImageData(data: JSquashImageData): ImageData {
  const clamped = data.data instanceof Uint8ClampedArray
    ? Uint8ClampedArray.from(data.data) as Uint8ClampedArray<ArrayBuffer>
    : new Uint8ClampedArray(data.data) as Uint8ClampedArray<ArrayBuffer>
  return new ImageData(clamped, data.width, data.height)
}

export async function decode(buffer: ArrayBuffer): Promise<JSquashImageData> {
  await Promise.all([ensureICO(), ensurePNG()])

  if (!decodeICO || !pngDecode) {
    throw new Error('ICO codec not available')
  }

  const images = await decodeICO(buffer, 'image/png')
  if (!images || images.length === 0) {
    throw new Error('ICO file contains no image data')
  }

  const best = images.reduce((prev, current) => {
    const prevScore = (prev.width || 0) * (prev.height || 0)
    const currentScore = (current.width || 0) * (current.height || 0)
    return currentScore > prevScore ? current : prev
  })

  return pngDecode(best.buffer)
}

export async function encode(imageData: JSquashImageData): Promise<ArrayBuffer> {
  await Promise.all([ensurePNG(), ensureResize()])
  if (!pngEncode || !resizeImage) {
    throw new Error('ICO encoder requires PNG and resize codecs')
  }

  const sourceSize = Math.min(imageData.width, imageData.height)
  const sourceImageData = toImageData(imageData)

  const targetSizes = ICO_SIZES.filter(size => size <= sourceSize)

  // Small source images still need the standard favicon entries.
  if (targetSizes.length === 0) {
    targetSizes.push(16)
  }
  if (!targetSizes.includes(32) && sourceSize >= 16) {
    targetSizes.push(32)
  }
  targetSizes.sort((a, b) => a - b)

  const entries: Array<{ size: number; pngData: ArrayBuffer }> = []

  for (const size of targetSizes) {
    let resizedData: ImageData

    if (size === imageData.width && size === imageData.height) {
      resizedData = sourceImageData
    } else {
      resizedData = await resizeImage(sourceImageData, {
        width: size,
        height: size
      })
    }

    const pngData = await pngEncode(resizedData)
    entries.push({ size, pngData })
  }

  return wrapAsMultiResolutionIco(entries)
}

function wrapAsMultiResolutionIco(
  entries: Array<{ size: number; pngData: ArrayBuffer }>
): ArrayBuffer {
  const entryCount = entries.length
  const headerSize = 6
  const directoryEntrySize = 16
  const directorySize = directoryEntrySize * entryCount

  let currentOffset = headerSize + directorySize
  const entryOffsets: number[] = []

  for (const entry of entries) {
    entryOffsets.push(currentOffset)
    currentOffset += entry.pngData.byteLength
  }

  const totalSize = currentOffset
  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint16(0, 0, true)           // Reserved (must be 0)
  view.setUint16(2, 1, true)           // Type: 1 = ICO
  view.setUint16(4, entryCount, true)  // Number of images

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    const offset = entryOffsets[i]!
    const entryStart = headerSize + (i * directoryEntrySize)

    bytes[entryStart + 0] = entry.size >= 256 ? 0 : entry.size
    bytes[entryStart + 1] = entry.size >= 256 ? 0 : entry.size
    bytes[entryStart + 2] = 0          // Color palette count (0 for PNG)
    bytes[entryStart + 3] = 0          // Reserved
    view.setUint16(entryStart + 4, 1, true)  // Color planes
    view.setUint16(entryStart + 6, 32, true) // Bits per pixel
    view.setUint32(entryStart + 8, entry.pngData.byteLength, true)  // Image size
    view.setUint32(entryStart + 12, offset, true)  // Offset to image data
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    const offset = entryOffsets[i]!
    bytes.set(new Uint8Array(entry.pngData), offset)
  }

  return buffer
}
