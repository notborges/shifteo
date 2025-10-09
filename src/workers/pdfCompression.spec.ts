import { describe, expect, it } from 'vitest'
import { deflate } from 'pako'
import { PDFDocument, PDFName, PDFNumber, PDFDict, PDFRawStream, StandardFonts } from '@pdfme/pdf-lib'

import { compressContentStreams, pruneUnusedFonts } from './pdfCompression'

const encoder = new TextEncoder()

describe('pdfCompression helpers', () => {
  it('records stream compression details with byte savings', async () => {
    const document = await PDFDocument.create()
    const page = document.addPage()

    const verboseLine = '10.123456 20.987654 1 0 0 1 0 0 cm BT /F1 12 Tf (Hello World) Tj ET'
    const payload = encoder.encode(Array.from({ length: 24 }, () => verboseLine).join('\n'))
    const compressed = deflate(payload, { level: 6 })

    const context = document.context
    const dict = PDFDict.withContext(context)
    dict.set(PDFName.of('Length'), PDFNumber.of(compressed.length))
    dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'))
    const stream = PDFRawStream.of(dict, compressed)
    const streamRef = context.register(stream)

    page.node.set(PDFName.of('Contents'), streamRef)

    const result = compressContentStreams(document, {
      level: 9
    })

    expect(result.modified).toBe(true)
    expect(result.streams).toBe(1)
    expect(result.changes).toHaveLength(1)
    const change = result.changes[0]!
    expect(change.savedBytes).toBeGreaterThan(8)
    expect(result.totalBytesSaved).toBe(change.savedBytes)
  })

  it('prunes unused fonts and reports their names', async () => {
    const document = await PDFDocument.create()
    const page = document.addPage()

    const context = document.context
    const usedFont = await document.embedFont(StandardFonts.Courier)
    const unusedFont = await document.embedFont(StandardFonts.Helvetica)

    const fontsDict = PDFDict.withContext(context)
    fontsDict.set(PDFName.of('F1'), usedFont.ref)
    fontsDict.set(PDFName.of('F2'), unusedFont.ref)

    const fontsRef = context.register(fontsDict)
    const resources = page.node.Resources() ?? context.obj({})
    resources.set(PDFName.of('Font'), fontsRef)
    const resourcesRef = context.register(resources)
    page.node.set(PDFName.of('Resources'), resourcesRef)

    const result = pruneUnusedFonts(document, true)

    expect(result.removedCount).toBe(2)
    expect(result.removedFonts).toEqual(['F1', 'F2'])
    expect(fontsDict.has(PDFName.of('F1'))).toBe(false)
    expect(fontsDict.has(PDFName.of('F2'))).toBe(false)
  })
})
