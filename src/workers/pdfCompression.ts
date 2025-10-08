import { PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFDocument, PDFArray, PDFStream, PDFPage } from '@pdfme/pdf-lib'
import { deflate, inflate } from 'pako'

export type VectorPreset = 'light' | 'balanced' | 'small'

interface ImageCompressionConfig {
  maxDimension: number
  quality: number
}

const VECTOR_COMPRESSION_CONFIG: Record<VectorPreset, ImageCompressionConfig> = {
  light: {
    maxDimension: 2600,
    quality: 0.94
  },
  balanced: {
    maxDimension: 2100,
    quality: 0.9
  },
  small: {
    maxDimension: 1400,
    quality: 0.75
  }
}

const fontRegex = /\/([A-Za-z0-9_.+\-]+)\s+Tf/g
const floatRegex = /(-?\d*\.\d{3,})/g
const textDecoder = new TextDecoder('latin1')
const textEncoder = new TextEncoder()

function cloneDict(dict: PDFDict): PDFDict {
  const newDict = PDFDict.withContext(dict.context)
  for (const [key, value] of dict.entries()) {
    newDict.set(key, value)
  }
  return newDict
}

function getFilterNames(dict: PDFDict): string[] {
  const filterEntry = dict.lookup(PDFName.of('Filter'))
  if (!filterEntry) return []
  if (filterEntry instanceof PDFName) {
    return [filterEntry.decodeText()]
  }
  if ('size' in filterEntry && typeof filterEntry.get === 'function') {
    const names: string[] = []
    const size = (filterEntry as any).size as number
    for (let i = 0; i < size; i++) {
      const item = (filterEntry as any).get(i)
      if (item instanceof PDFName) {
        names.push(item.decodeText())
      }
    }
    return names
  }
  return []
}

function isSupportedImage(dict: PDFDict): boolean {
  const subtype = dict.lookup(PDFName.of('Subtype'))
  if (!(subtype instanceof PDFName) || subtype.decodeText() !== 'Image') {
    return false
  }

  const filters = getFilterNames(dict)
  if (!filters.length) return false

  // Focus on JPEG images for now (DCTDecode)
  if (!filters.includes('DCTDecode')) return false
  if (filters.some(filter => filter === 'JPXDecode' || filter === 'JBIG2Decode')) return false

  return true
}

function getNumber(dict: PDFDict, name: string): number | null {
  const value = dict.lookup(PDFName.of(name))
  if (value instanceof PDFNumber) {
    return value.asNumber()
  }
  return null
}

const skipNames = new Set(['Mask', 'SMask'])

function shouldDownscale(dict: PDFDict, width: number, height: number, config: ImageCompressionConfig): boolean {
  const name = dict.lookup(PDFName.of('Name'))
  if (name instanceof PDFName) {
    const decoded = name.decodeText()
    if (skipNames.has(decoded)) {
      return false
    }
  }

  const currentMax = Math.max(width, height)
  if (currentMax > config.maxDimension) return true
  if (config.quality <= 0.92) return true
  return false
}

async function downscaleJpeg(
  data: Uint8Array,
  width: number,
  height: number,
  config: ImageCompressionConfig
): Promise<{ buffer: Uint8Array; width: number; height: number } | null> {
  try {
    const blob = new Blob([data], { type: 'image/jpeg' })
    const bitmap = await createImageBitmap(blob)

    const ratio = Math.min(1, config.maxDimension / Math.max(bitmap.width, bitmap.height))
    const targetWidth = Math.max(1, Math.round(bitmap.width * ratio))
    const targetHeight = Math.max(1, Math.round(bitmap.height * ratio))

    if (targetWidth === bitmap.width && targetHeight === bitmap.height && config.quality >= 0.95) {
      bitmap.close?.()
      return null
    }

    const canvas = new OffscreenCanvas(targetWidth, targetHeight)
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      bitmap.close?.()
      return null
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
    bitmap.close?.()

    const outputBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: config.quality })
    const buffer = new Uint8Array(await outputBlob.arrayBuffer())
    canvas.width = 0
    canvas.height = 0

    return {
      buffer,
      width: targetWidth,
      height: targetHeight
    }
  } catch (error) {
    console.warn('Image downscale failed', error)
    return null
  }
}

export async function compressPdfPreservingVectors(
  document: PDFDocument,
  preset: VectorPreset
): Promise<boolean> {
  if (!hasOffscreenCanvasSupport()) {
    return false
  }

  const context = document.context
  const config = VECTOR_COMPRESSION_CONFIG[preset]

  let modified = false

  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue

    const dict = object.dict
    if (!isSupportedImage(dict)) continue

    const width = getNumber(dict, 'Width')
    const height = getNumber(dict, 'Height')
    if (!width || !height) continue

    if (!shouldDownscale(dict, width, height, config)) {
      continue
    }

    const originalBytes = object.getContents()
    const result = await downscaleJpeg(originalBytes, width, height, config)
    if (!result) continue

    const newDict = cloneDict(dict)
    newDict.set(PDFName.of('Width'), PDFNumber.of(result.width))
    newDict.set(PDFName.of('Height'), PDFNumber.of(result.height))
    newDict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8))
    newDict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'))
    newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'))
    newDict.set(PDFName.of('Length'), PDFNumber.of(result.buffer.byteLength))
    if (newDict.has(PDFName.of('DecodeParms'))) {
      newDict.delete(PDFName.of('DecodeParms'))
    }

    const newStream = PDFRawStream.of(newDict, result.buffer)
    context.assign(ref as PDFRef, newStream)
    modified = true
  }

  return modified
}

export function hasOffscreenCanvasSupport(): boolean {
  return typeof OffscreenCanvas !== 'undefined'
    && typeof (OffscreenCanvas.prototype as any)?.convertToBlob === 'function'
}

export function compressContentStreams(
  document: PDFDocument,
  preset: VectorPreset
): boolean {
  const context = document.context
  const level = preset === 'small' ? 9 : preset === 'balanced' ? 7 : 5
  let modified = false

  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue
    const dict = object.dict
    const subtype = dict.lookup(PDFName.of('Subtype'))
    if (subtype instanceof PDFName && subtype.decodeText() === 'Image') continue

    const filter = dict.lookup(PDFName.of('Filter'))
    const isFlate = filter instanceof PDFName && filter.decodeText() === 'FlateDecode'
    if (!isFlate) continue

    const encoded = object.getContents()
    if (!encoded || encoded.length < 256) continue

    let decoded: Uint8Array
    try {
      decoded = inflate(encoded)
    } catch (error) {
      continue
    }

    let working = decoded
    if (preset === 'small') {
      try {
        const text = textDecoder.decode(decoded)
        const rounded = text
          .replace(floatRegex, (match) => {
            const num = Number.parseFloat(match)
            if (!Number.isFinite(num)) return match
            const roundedNum = Math.round(num * 100) / 100
            return roundedNum === 0 ? '0' : roundedNum.toString()
          })
          .replace(/\s{2,}/g, ' ')
        working = textEncoder.encode(rounded)
      } catch (error) {
        working = decoded
      }
    }

    let recompressed: Uint8Array
    try {
      recompressed = deflate(working, { level })
    } catch (error) {
      continue
    }

    if (recompressed.length >= encoded.length - 8) {
      continue
    }

    const newDict = cloneDict(dict)
    newDict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'))
    newDict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length))
    if (newDict.has(PDFName.of('DecodeParms'))) {
      newDict.delete(PDFName.of('DecodeParms'))
    }

    const newStream = PDFRawStream.of(newDict, recompressed)
    context.assign(ref as PDFRef, newStream)
    modified = true
  }

  return modified
}

function collectContentStreams(page: PDFPage, context: PDFDocument['context']): PDFStream[] {
  const contents = page.node.Contents()
  if (!contents) return []
  const streams: PDFStream[] = []

  const pushStream = (value: any) => {
    const stream = context.lookupMaybe(value, PDFStream)
    if (stream instanceof PDFStream) {
      streams.push(stream)
    }
  }

  if (contents instanceof PDFArray) {
    const size = contents.size()
    for (let idx = 0; idx < size; idx++) {
      pushStream(contents.get(idx))
    }
  } else {
    streams.push(contents)
  }

  return streams
}

function collectUsedFontsForPage(page: PDFPage, context: PDFDocument['context']): Set<string> {
  const used = new Set<string>()
  const streams = collectContentStreams(page, context)
  for (const stream of streams) {
    try {
      const content = textDecoder.decode(stream.decode())
      fontRegex.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = fontRegex.exec(content)) !== null) {
        used.add(match[1])
      }
    } catch (error) {
      console.warn('Failed to parse content stream for fonts', error)
    }
  }
  return used
}

const refKey = (ref: PDFRef) => `${ref.objectNumber}-${ref.generationNumber}`

export function pruneUnusedFonts(document: PDFDocument): boolean {
  const pages = document.getPages()
  if (!pages.length) return false

  const fontUsageByDict = new Map<PDFDict, Set<string>>()
  const fontsPerDict = new Map<PDFDict, Array<[PDFName, any]>>()

  for (const page of pages) {
    const resources = page.node.Resources()
    if (!resources) continue
    const fontsDict = resources.lookupMaybe(PDFName.of('Font'), PDFDict)
    if (!fontsDict) continue

    const usedFonts = collectUsedFontsForPage(page, document.context)
    const existing = fontUsageByDict.get(fontsDict) ?? new Set<string>()
    usedFonts.forEach(name => existing.add(name))
    fontUsageByDict.set(fontsDict, existing)

    if (!fontsPerDict.has(fontsDict)) {
      fontsPerDict.set(fontsDict, fontsDict.entries())
    }
  }

  if (!fontUsageByDict.size) {
    return false
  }

  let modified = false
  const prunedFontRefs: PDFRef[] = []

  for (const [fontsDict, entries] of fontsPerDict.entries()) {
    const used = fontUsageByDict.get(fontsDict) ?? new Set<string>()
    for (const [fontName, fontRef] of entries) {
      const name = fontName.decodeText()
      if (!used.has(name)) {
        fontsDict.delete(fontName)
        if (fontRef instanceof PDFRef) {
          prunedFontRefs.push(fontRef)
        }
        modified = true
      }
    }
  }

  if (!modified || prunedFontRefs.length === 0) {
    return modified
  }

  const activeRefs = new Set<string>()
  for (const page of pages) {
    const resources = page.node.Resources()
    if (!resources) continue
    const fontsDict = resources.lookupMaybe(PDFName.of('Font'), PDFDict)
    if (!fontsDict) continue
    for (const [, value] of fontsDict.entries()) {
      if (value instanceof PDFRef) {
        activeRefs.add(refKey(value))
      }
    }
  }

  const context = document.context
  for (const ref of prunedFontRefs) {
    if (!activeRefs.has(refKey(ref))) {
      context.delete(ref)
    }
  }

  return modified
}
