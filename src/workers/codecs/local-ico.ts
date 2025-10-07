import type { JSquashImageData } from './index'

let icoModulePromise: Promise<any> | null = null
let pngModulePromise: Promise<any> | null = null
let parseICO: ((buffer: ArrayBuffer, mime?: string) => Promise<Array<ParsedImage>>) | null = null
let pngDecode: ((buffer: ArrayBuffer) => Promise<JSquashImageData>) | null = null
let pngEncode: ((imageData: JSquashImageData, options?: unknown) => Promise<ArrayBuffer>) | null = null

interface ParsedImage {
  width: number
  height: number
  bpp: number
  buffer: ArrayBuffer
}

async function ensureICO() {
  if (!icoModulePromise) {
    icoModulePromise = import('icojs/browser').then(mod => mod.default ?? mod)
  }
  if (!parseICO) {
    const mod = await icoModulePromise
    parseICO = mod.parseICO
  }
}

async function ensurePNG() {
  if (!pngModulePromise) {
    pngModulePromise = import('@jsquash/png')
  }
  if (!pngDecode || !pngEncode) {
    const mod = await pngModulePromise
    pngDecode = mod.decode
    pngEncode = mod.encode
  }
}

export async function decode(buffer: ArrayBuffer): Promise<JSquashImageData> {
  await Promise.all([ensureICO(), ensurePNG()])

  if (!parseICO || !pngDecode) {
    throw new Error('ICO codec not available')
  }

  const images = await parseICO(buffer, 'image/png')
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
  await ensurePNG()
  if (!pngEncode) {
    throw new Error('ICO encoder requires PNG codec')
  }

  const pngBuffer = await pngEncode(imageData)
  return wrapAsIco(pngBuffer, imageData.width, imageData.height)
}

function wrapAsIco(pngBuffer: ArrayBuffer, width: number, height: number): ArrayBuffer {
  const pngBytes = new Uint8Array(pngBuffer)
  const directoryCount = 1
  const headerSize = 6
  const entrySize = 16
  const imageOffset = headerSize + entrySize * directoryCount
  const totalSize = imageOffset + pngBytes.length

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, directoryCount, true)

  bytes[6] = width >= 256 ? 0 : width
  bytes[7] = height >= 256 ? 0 : height
  bytes[8] = 0
  bytes[9] = 0
  view.setUint16(10, 1, true)
  view.setUint16(12, 32, true)
  view.setUint32(14, pngBytes.length, true)
  view.setUint32(18, imageOffset, true)

  bytes.set(pngBytes, imageOffset)

  return buffer
}
