/* eslint-disable no-restricted-globals */
import { PDFDocument, PDFName, PDFDict } from '@pdfme/pdf-lib'
import type { DocTask, PdfCompressionOptions, PdfCompressionStats } from './types'
import { buildOrganizedDocument } from './pdfOrganize'
import { compressPdfPreservingVectors, hasOffscreenCanvasSupport, VectorPreset, pruneUnusedFonts, compressContentStreams } from './pdfCompression'

type ExtractDocTask<K extends DocTask['kind']> = Extract<DocTask, { kind: K }>

interface RunMessage {
  buffers: ArrayBuffer[]
  meta: Array<{ name: string; type: string }>
  task: DocTask
}

interface WorkerMessage {
  id: number
  type: 'ping' | 'run'
  data: RunMessage | Record<string, never>
}

type WorkerResponse =
  | { id: number; result: 'pong' }
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'stage'; stage: string }
  | { id: number; result?: unknown; error?: string }

interface PdfjsModule {
  getDocument: (params: any) => any
  GlobalWorkerOptions: { workerSrc?: string }
}

interface PdfResultPayload {
  kind: 'pdf'
  buffer: ArrayBuffer
  filename?: string
  pageCount?: number
  stats?: PdfCompressionStats
}

interface PdfCollectionPayload {
  kind: 'pdf-collection'
  entries: Array<{
    buffer: ArrayBuffer
    filename: string
  }>
}

declare const self: DedicatedWorkerGlobalScope

let pdfjsRendererPromise: Promise<PdfjsModule> | null = null

async function loadPdfJsRenderer(): Promise<PdfjsModule> {
  if (!pdfjsRendererPromise) {
    pdfjsRendererPromise = (async () => {
      const pdfjsModule = await import('pdfjs-dist/build/pdf')
      const pdfjs = (pdfjsModule as any).default ?? pdfjsModule
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        const workerModule = await import('pdfjs-dist/build/pdf.worker?url')
        pdfjs.GlobalWorkerOptions.workerSrc = (workerModule as { default?: string }).default ?? (workerModule as unknown as string)
      }
      return pdfjs as PdfjsModule
    })()
  }
  return pdfjsRendererPromise
}

function postStage(id: number, stage: string) {
  const response: WorkerResponse = { id, type: 'stage', stage }
  self.postMessage(response)
}

function postProgress(id: number, progress: number) {
  const response: WorkerResponse = { id, type: 'progress', progress }
  self.postMessage(response)
}

function sanitizeFileName(name: string, fallback: string): string {
  if (!name) return fallback
  return name.replace(/\.[^.]+$/, '') || fallback
}

async function handleMerge(id: number, payload: RunMessage) {
  const { buffers, meta } = payload

  if (!buffers.length) {
    const response: WorkerResponse = { id, error: 'Select at least one PDF to merge.' }
    self.postMessage(response)
    return
  }

  try {
    postStage(id, 'Creating workspace')
    const merged = await PDFDocument.create()

    for (let index = 0; index < buffers.length; index++) {
      const buffer = buffers[index]
      if (!buffer) {
        throw new Error(`Unable to read document ${index + 1}`)
      }
      const label = meta[index]?.name || `Document ${index + 1}`
      postStage(id, `Adding ${label}`)

      const sourceBytes = new Uint8Array(buffer)
      const source = await PDFDocument.load(sourceBytes)
      const copiedPages = await merged.copyPages(source, source.getPageIndices())
      copiedPages.forEach(page => merged.addPage(page))

      postProgress(id, (index + 1) / buffers.length)
    }

    postStage(id, 'Finalising merge')
    const mergedBytes = await merged.save()
    const mergedBuffer = mergedBytes.slice().buffer

    const pageCount = merged.getPageCount()
    const baseName = buffers.length === 1
      ? `${sanitizeFileName(meta[0]?.name ?? 'document', 'document')}-merged`
      : `shifteo-merged-${Date.now()}`
    const filename = `${baseName}.pdf`

    const response: WorkerResponse = {
      id,
      result: {
        kind: 'pdf',
        buffer: mergedBuffer,
        filename,
        pageCount
      } satisfies PdfResultPayload
    }

    self.postMessage(response, [mergedBuffer])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to merge PDFs'
    const response: WorkerResponse = { id, error: message }
    self.postMessage(response)
  }
}

async function handleOrganize(id: number, payload: RunMessage, task: ExtractDocTask<'pdf_organize'>) {
  const buffer = payload.buffers[0]
  const meta = payload.meta[0]

  if (!buffer) {
    const response: WorkerResponse = { id, error: 'Select a PDF to organise.' }
    self.postMessage(response)
    return
  }

  try {
    postStage(id, 'Loading document')
    const sourceBytes = new Uint8Array(buffer)
    const document = await PDFDocument.load(sourceBytes)
    const { document: organisedDocument, order } = await buildOrganizedDocument(document, task.order, task.rotations ?? {})

    postStage(id, 'Finalising output')
    postProgress(id, 1)

    const organisedBytes = await organisedDocument.save({ useObjectStreams: true })
    const organisedBuffer = organisedBytes.slice().buffer

    const baseName = sanitizeFileName(meta?.name ?? 'document', 'document')
    const filename = `${baseName}-organised.pdf`

    const response: WorkerResponse = {
      id,
      result: {
        kind: 'pdf',
        buffer: organisedBuffer,
        filename,
        pageCount: order.length
      } satisfies PdfResultPayload
    }

    self.postMessage(response, [organisedBuffer])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to organise PDF'
    const response: WorkerResponse = { id, error: message }
    self.postMessage(response)
  }
}

async function handleSplit(id: number, payload: RunMessage, task: ExtractDocTask<'pdf_split'>) {
  const buffer = payload.buffers[0]
  const meta = payload.meta[0]

  if (!buffer) {
    const response: WorkerResponse = { id, error: 'Select a PDF to split.' }
    self.postMessage(response)
    return
  }

  try {
    postStage(id, 'Loading document')
    const sourceBytes = new Uint8Array(buffer)
    const source = await PDFDocument.load(sourceBytes)
    const totalPages = source.getPageCount()

    const rawPages = Array.isArray(task.pages) ? task.pages : []
    const normalized = rawPages.length > 0
      ? rawPages.map(page => Math.min(Math.max(1, page), totalPages))
      : source.getPageIndices().map(index => index + 1)

    const uniquePages = Array.from(new Set(normalized)).sort((a, b) => a - b)
    if (uniquePages.length === 0) {
      throw new Error('No valid pages selected')
    }

    const mode = task.mode ?? 'single'

    if (mode === 'individual') {
      postStage(id, 'Extracting pages')
      const entries: PdfCollectionPayload['entries'] = []

      for (let i = 0; i < uniquePages.length; i++) {
        const pageIndex = uniquePages[i] ?? 0
        if (pageIndex <= 0) continue
        const singleDoc = await PDFDocument.create()
        const [copied] = await singleDoc.copyPages(source, [pageIndex - 1])
        singleDoc.addPage(copied)
        const bytes = await singleDoc.save()
        const bufferCopy = bytes.slice().buffer
        const baseName = meta?.name ? sanitizeFileName(meta.name, 'document') : 'document'
        const filename = `${baseName}-page-${pageIndex}.pdf`
        entries.push({ buffer: bufferCopy, filename })
        postProgress(id, (i + 1) / uniquePages.length)
      }

      const response: WorkerResponse = {
        id,
        result: {
          kind: 'pdf-collection',
          entries
        } satisfies PdfCollectionPayload
      }

      self.postMessage(response, entries.map(entry => entry.buffer))
      return
    }

    postStage(id, 'Copying pages')
    const output = await PDFDocument.create()
    const copied = await output.copyPages(
      source,
      uniquePages.map(page => page - 1)
    )
    copied.forEach(page => output.addPage(page))
    postProgress(id, 0.8)

    postStage(id, 'Finalising split')
    const outputBytes = await output.save()
    const outputBuffer = outputBytes.slice().buffer
    const suffix = uniquePages.length === totalPages
      ? 'extracted'
      : `pages-${uniquePages.map(page => page).join('-')}`
    const baseName = meta?.name ? sanitizeFileName(meta.name, 'document') : 'document'
    const filename = `${baseName}-${suffix}.pdf`

    const response: WorkerResponse = {
      id,
      result: {
        kind: 'pdf',
        buffer: outputBuffer,
        filename,
        pageCount: uniquePages.length
      } satisfies PdfResultPayload
    }

    self.postMessage(response, [outputBuffer])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to split PDF'
    const response: WorkerResponse = { id, error: message }
    self.postMessage(response)
  }
}

async function handleCompress(id: number, payload: RunMessage, task: ExtractDocTask<'pdf_compress'>) {
  const buffer = payload.buffers[0]
  const meta = payload.meta[0]

  if (!buffer) {
    const response: WorkerResponse = { id, error: 'Select a PDF to compress.' }
    self.postMessage(response)
    return
  }

  try {
    postStage(id, 'Loading document')
    const sourceBytes = new Uint8Array(buffer)
    const document = await PDFDocument.load(sourceBytes)
    const preset: VectorPreset = task.preset ?? 'light'
    const compressionOptions: PdfCompressionOptions = task.options ?? {}
    const presetDefaults = {
      light: { imageQuality: 0.94, maxImageDimension: 2600, coordinatePrecision: 4 },
      balanced: { imageQuality: 0.9, maxImageDimension: 2100, coordinatePrecision: 4 },
      small: { imageQuality: 0.75, maxImageDimension: 1400, coordinatePrecision: 4 }
    } as const
    const defaults = presetDefaults[preset]
    const imageQuality = Math.min(1, Math.max(0.5, compressionOptions.imageQuality ?? defaults.imageQuality))
    const maxImageDimension = Math.max(400, compressionOptions.maxImageDimension ?? defaults.maxImageDimension)
    const coordinatePrecision = Math.max(0, Math.min(4, Math.round(compressionOptions.coordinatePrecision ?? defaults.coordinatePrecision)))
    const pruneFontsEnabled = compressionOptions.pruneFonts !== false
    const recompressStreamsEnabled = compressionOptions.recompressStreams !== false

    const metadataKeysRemoved: string[] = []

    // Drop metadata keys that often carry large XML payloads
    try {
      const metadataRef = document.catalog.get(PDFName.of('Metadata'))
      if (metadataRef) {
        document.catalog.delete(PDFName.of('Metadata'))
        metadataKeysRemoved.push('Metadata')
      }
      const info = document.context.trailerInfo
      if (info && info instanceof PDFDict) {
        const cleanupKeys = ['Author', 'Creator', 'Producer', 'ModDate', 'CreationDate']
        for (const key of cleanupKeys) {
          const name = PDFName.of(key)
          if (info.has(name)) {
            info.delete(name)
            metadataKeysRemoved.push(key)
          }
        }
      }
    } catch (error) {
      console.warn('Metadata cleanup failed', error)
    }

    postStage(id, 'Optimising structure')
    const saveOptions: Parameters<PDFDocument['save']>[0] = {
      addDefaultPage: false,
      objectsPerTick: preset === 'small' ? 8 : preset === 'balanced' ? 16 : 28,
      useObjectStreams: true
    }

    postProgress(id, 0.4)

    const fontResult = pruneUnusedFonts(document, pruneFontsEnabled)
    const streamLevel = preset === 'small' ? 9 : preset === 'balanced' ? 9 : 9
    const streamResult = compressContentStreams(document, {
      level: streamLevel
    })

    postStage(id, 'Compressing embedded images')
    const imageResult = await compressPdfPreservingVectors(document, preset, {
      maxDimension: maxImageDimension,
      quality: imageQuality
    })
    const vectorCompressionApplied = imageResult.modified
    const structuralOptimised = fontResult.removedCount > 0 || streamResult.modified || vectorCompressionApplied

    const canRasterise = hasOffscreenCanvasSupport()
    let compressedBuffer: ArrayBuffer | null = null
    let rasterFallbackUsed = false

    if (!structuralOptimised && preset === 'small' && canRasterise) {
      try {
        postStage(id, 'Rendering pages')
        const pdfjs = await loadPdfJsRenderer()
        const loadingTask = pdfjs.getDocument({ data: buffer })
        const pdfProxy = await loadingTask.promise
        const totalPages = pdfProxy.numPages ?? pdfProxy._pdfInfo?.numPages ?? 0

        const output = await PDFDocument.create()
        const scale = 0.92
        const fallbackQuality = 0.82

        for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
          postStage(id, `Rendering page ${pageIndex} / ${totalPages}`)
          const page = await pdfProxy.getPage(pageIndex)
          const viewport = page.getViewport({ scale })
          const width = Math.max(1, Math.round(viewport.width))
          const height = Math.max(1, Math.round(viewport.height))

          const canvas = new OffscreenCanvas(width, height)
          const context2d = canvas.getContext('2d', { alpha: false })
          if (!context2d) {
            throw new Error('Unable to acquire OffscreenCanvas context')
          }

          const renderTask = page.render({
            canvasContext: context2d,
            viewport,
            background: 'rgb(255,255,255)'
          })
          await renderTask.promise

          const imageBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: fallbackQuality })
          const imageBuffer = await imageBlob.arrayBuffer()
          const embeddedImage = await output.embedJpg(imageBuffer)

          const outputPage = output.addPage([viewport.width, viewport.height])
          outputPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height
          })

          canvas.width = 0
          canvas.height = 0
          page.cleanup?.()
          postProgress(id, pageIndex / Math.max(1, totalPages))
        }

        await loadingTask.destroy()
        await pdfProxy.destroy?.()

        const rasterBytes = await output.save({ useObjectStreams: true })
        compressedBuffer = rasterBytes.slice().buffer
        rasterFallbackUsed = true
      } catch (error) {
        console.warn('Raster compression fallback', error)
      }
    }

    if (!compressedBuffer) {
      const compressedBytes = await document.save(saveOptions)
      compressedBuffer = compressedBytes.slice().buffer
    }

    if (!compressedBuffer) {
      throw new Error('Compression pipeline failed to produce output')
    }

    postStage(id, 'Finalising output')
    postProgress(id, 1)

    const baseName = sanitizeFileName(meta?.name ?? 'document', 'document')
    let suffix: string
    switch (preset) {
      case 'light':
        suffix = 'light'
        break
      case 'balanced':
        suffix = 'balanced'
        break
      case 'small':
        suffix = 'small'
        break
      default:
        suffix = 'compressed'
        break
    }
    const filename = `${baseName}-${suffix}.pdf`

    const stats: PdfCompressionStats = {
      originalBytes: buffer.byteLength,
      compressedBytes: compressedBuffer.byteLength,
      fontsRemoved: fontResult.removedCount,
      streamsRecompressed: streamResult.streams,
      imagesDownscaled: imageResult.downscaled,
      rasterFallbackUsed,
      preset,
      options: {
        imageQuality,
        maxImageDimension,
        coordinatePrecision,
        pruneFonts: pruneFontsEnabled,
        recompressStreams: recompressStreamsEnabled
      },
      details: {
        metadataKeysRemoved: Array.from(new Set(metadataKeysRemoved)),
        fontsRemoved: fontResult.removedFonts,
        imageChanges: imageResult.images,
        streamChanges: streamResult.changes,
        imageBytesSaved: imageResult.totalBytesSaved,
        streamBytesSaved: streamResult.totalBytesSaved
      }
    }

    const response: WorkerResponse = {
      id,
      result: {
        kind: 'pdf',
        buffer: compressedBuffer,
        filename,
        stats
      } satisfies PdfResultPayload & { stats: typeof stats }
    }

    self.postMessage(response, [compressedBuffer])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compress PDF'
    const response: WorkerResponse = { id, error: message }
    self.postMessage(response)
  }
}

async function handleRun(id: number, payload: RunMessage) {
  const { task } = payload

  switch (task.kind) {
    case 'pdf_merge':
      await handleMerge(id, payload)
      break
    case 'pdf_split':
      await handleSplit(id, payload, task as ExtractDocTask<'pdf_split'>)
      break
    case 'pdf_compress':
      await handleCompress(id, payload, task as ExtractDocTask<'pdf_compress'>)
      break
    case 'pdf_organize':
      await handleOrganize(id, payload, task as ExtractDocTask<'pdf_organize'>)
      break
    default: {
      const message = `PDF operation "${task.kind}" is not implemented yet`
      const response: WorkerResponse = { id, error: message }
      self.postMessage(response)
    }
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data

  if (type === 'ping') {
    const response: WorkerResponse = { id, result: 'pong' }
    self.postMessage(response)
    return
  }

  if (type === 'run') {
    void handleRun(id, data as RunMessage)
    return
  }

  const response: WorkerResponse = { id, error: 'Unknown worker message type' }
  self.postMessage(response)
})

console.log('[Worker] PDF worker ready')
