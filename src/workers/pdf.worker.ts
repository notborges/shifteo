/* eslint-disable no-restricted-globals */
import { PDFDocument, PDFName, PDFDict } from '@pdfme/pdf-lib'
import type { DocTask } from './types'
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

    // Drop metadata keys that often carry large XML payloads
    try {
      const metadataRef = document.catalog.get(PDFName.of('Metadata'))
      if (metadataRef) {
        document.catalog.delete(PDFName.of('Metadata'))
      }
      const info = document.context.trailerInfo
      if (info && info instanceof PDFDict) {
        const cleanupKeys = ['Author', 'Creator', 'Producer', 'ModDate', 'CreationDate']
        for (const key of cleanupKeys) {
          const name = PDFName.of(key)
          if (info.has(name)) {
            info.delete(name)
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
      useObjectStreams: true,
      useXRefStream: true
    }

    postProgress(id, 0.4)

    const fontPruned = pruneUnusedFonts(document)
    const streamsCompressed = compressContentStreams(document, preset)

    postStage(id, 'Compressing embedded images')
    const vectorCompressionApplied = await compressPdfPreservingVectors(document, preset)
    const structuralOptimised = fontPruned || streamsCompressed || vectorCompressionApplied

    const canRasterise = hasOffscreenCanvasSupport()

    if (!structuralOptimised && preset === 'small' && canRasterise) {
      try {
        postStage(id, 'Rendering pages')
        const pdfjs = await loadPdfJsRenderer()
        const loadingTask = pdfjs.getDocument({ data: buffer })
        const pdfProxy = await loadingTask.promise
        const totalPages = pdfProxy.numPages ?? pdfProxy._pdfInfo?.numPages ?? 0

        const output = await PDFDocument.create()
        const scale = 0.92
        const quality = 0.85

        for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
          postStage(id, `Rendering page ${pageIndex} / ${totalPages}`)
          const page = await pdfProxy.getPage(pageIndex)
          const viewport = page.getViewport({ scale })
          const width = Math.max(1, Math.round(viewport.width))
          const height = Math.max(1, Math.round(viewport.height))

          const canvas = new OffscreenCanvas(width, height)
          const context = canvas.getContext('2d', { alpha: false })
          if (!context) {
            throw new Error('Unable to acquire OffscreenCanvas context')
          }

          const renderTask = page.render({
            canvasContext: context,
            viewport,
            background: 'rgb(255,255,255)'
          })
          await renderTask.promise

          const imageBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
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

        postStage(id, 'Finalising output')
        const rasterBytes = await output.save({ useObjectStreams: true })
        const rasterBuffer = rasterBytes.slice().buffer

        const baseName = sanitizeFileName(meta?.name ?? 'document', 'document')
        const filename = `${baseName}-small.pdf`

        const response: WorkerResponse = {
          id,
          result: {
            kind: 'pdf',
            buffer: rasterBuffer,
            filename
          } satisfies PdfResultPayload
        }

        self.postMessage(response, [rasterBuffer])
        return
      } catch (error) {
        console.warn('Raster compression fallback', error)
      }
    }

    const compressedBytes = await document.save(saveOptions)
    const compressedBuffer = compressedBytes.slice().buffer

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

    const response: WorkerResponse = {
      id,
      result: {
        kind: 'pdf',
        buffer: compressedBuffer,
        filename
      } satisfies PdfResultPayload
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
