import { PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFDocument, PDFArray, PDFStream, PDFPage } from '@pdfme/pdf-lib'
import { deflate, inflate } from 'pako'
import type { PdfImageChange, PdfStreamChange } from './types'

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
const textDecoder = new TextDecoder('latin1')

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
  if (filterEntry instanceof PDFArray) {
    const names: string[] = []
    const size = filterEntry.size()
    for (let i = 0; i < size; i++) {
      const item = filterEntry.get(i)
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
  config: ImageCompressionConfig
): Promise<{ buffer: Uint8Array; width: number; height: number } | null> {
  try {
    const bufferCopy = new ArrayBuffer(data.byteLength)
    new Uint8Array(bufferCopy).set(data)
    const blob = new Blob([bufferCopy], { type: 'image/jpeg' })
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
  preset: VectorPreset,
  overrides: Partial<ImageCompressionConfig> = {}
): Promise<{ modified: boolean; downscaled: number; totalBytesSaved: number; images: PdfImageChange[] }> {
  if (!hasOffscreenCanvasSupport()) {
    return { modified: false, downscaled: 0, totalBytesSaved: 0, images: [] }
  }

  const context = document.context
  const base = VECTOR_COMPRESSION_CONFIG[preset]
  const config: ImageCompressionConfig = {
    maxDimension: overrides.maxDimension ?? base.maxDimension,
    quality: overrides.quality ?? base.quality
  }

  let downscaled = 0
  let totalBytesSaved = 0
  const imageChanges: PdfImageChange[] = []

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
    const result = await downscaleJpeg(originalBytes, config)
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
    downscaled++

    const nameEntry = dict.lookup(PDFName.of('Name'))
    const label = nameEntry instanceof PDFName ? nameEntry.decodeText() : undefined
    const savedBytes = Math.max(0, originalBytes.byteLength - result.buffer.byteLength)
    totalBytesSaved += savedBytes
    imageChanges.push({
      name: label,
      before: { width, height, bytes: originalBytes.byteLength },
      after: { width: result.width, height: result.height, bytes: result.buffer.byteLength },
      savedBytes
    })
  }

  return { modified: downscaled > 0, downscaled, totalBytesSaved, images: imageChanges }
}

export function hasOffscreenCanvasSupport(): boolean {
  return typeof OffscreenCanvas !== 'undefined'
    && typeof (OffscreenCanvas.prototype as any)?.convertToBlob === 'function'
}

interface StreamCompressionConfig {
  level: number
}

export function compressContentStreams(
  document: PDFDocument,
  config: StreamCompressionConfig
): { modified: boolean; streams: number; totalBytesSaved: number; changes: PdfStreamChange[] } {
  const context = document.context
  const level = Math.min(9, Math.max(1, config.level))

  let rewritten = 0
  let totalBytesSaved = 0
  const changes: PdfStreamChange[] = []

  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue
    const dict = object.dict
    const subtype = dict.lookup(PDFName.of('Subtype'))
    if (subtype instanceof PDFName && subtype.decodeText() === 'Image') continue

    const filter = dict.lookup(PDFName.of('Filter'))
    if (!(filter instanceof PDFName) || filter.decodeText() !== 'FlateDecode') continue

    const encoded = object.getContents()
    if (!encoded || encoded.length < 64) continue

    let decoded: Uint8Array
    try {
      decoded = inflate(encoded)
    } catch (error) {
      continue
    }

    // SAFE: Just recompress at higher level, NO content modification
    let recompressed: Uint8Array
    try {
      recompressed = deflate(decoded, { level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 })
    } catch (error) {
      continue
    }

    const savedBytes = encoded.length - recompressed.length
    if (savedBytes <= 8) {
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
    rewritten++
    totalBytesSaved += savedBytes
    const refObject = ref as PDFRef
    changes.push({
      ref: `${refObject.objectNumber}-${refObject.generationNumber}`,
      savedBytes
    })
  }

  return {
    modified: rewritten > 0,
    streams: rewritten,
    totalBytesSaved,
    changes
  }
}

function collectContentStreams(page: PDFPage, context: PDFDocument['context']): PDFRawStream[] {
  const contents = page.node.Contents()
  if (!contents) return []
  const streams: PDFRawStream[] = []

  const pushStream = (value: any) => {
    const stream = context.lookupMaybe(value, PDFStream)
    if (stream instanceof PDFRawStream) {
      streams.push(stream)
    }
  }

  if (contents instanceof PDFArray) {
    const size = contents.size()
    for (let idx = 0; idx < size; idx++) {
      pushStream(contents.get(idx))
    }
  } else if (contents instanceof PDFRawStream) {
    streams.push(contents)
  } else if (contents instanceof PDFStream) {
    const raw = contents as PDFStream
    if (raw instanceof PDFRawStream) {
      streams.push(raw)
    }
  }

  return streams
}

function collectUsedFontsForPage(page: PDFPage, context: PDFDocument['context']): Set<string> {
  const used = new Set<string>()
  const streams = collectContentStreams(page, context)
  for (const stream of streams) {
    try {
      const filter = stream.dict.lookup(PDFName.of('Filter'))
      const encoded = stream.getContents()
      let decoded = encoded
      if (filter instanceof PDFName && filter.decodeText() === 'FlateDecode') {
        decoded = inflate(encoded)
      }
      const content = textDecoder.decode(decoded)
      fontRegex.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = fontRegex.exec(content)) !== null) {
        if (match[1]) {
          used.add(match[1])
        }
      }
    } catch (error) {
      console.warn('Failed to parse content stream for fonts', error)
    }
  }
  return used
}

const refKey = (ref: PDFRef) => `${ref.objectNumber}-${ref.generationNumber}`

export function pruneUnusedFonts(document: PDFDocument, enabled = true): { removedCount: number; removedFonts: string[] } {
  if (!enabled) return { removedCount: 0, removedFonts: [] }

  const pages = document.getPages()
  if (!pages.length) return { removedCount: 0, removedFonts: [] }

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
    return { removedCount: 0, removedFonts: [] }
  }

  let removedCount = 0
  const removedFonts: string[] = []
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
        removedCount++
        removedFonts.push(name)
      }
    }
  }

  if (removedCount === 0 || prunedFontRefs.length === 0) {
    return { removedCount, removedFonts }
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

  return { removedCount, removedFonts }
}
