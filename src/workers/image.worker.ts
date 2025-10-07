import type { ImageConvertOpts, ImageConvertResult } from './types'
import {
  ensureCodecsLoaded,
  areCodecsLoaded,
  decodeImage,
  encodeImage,
  detectFormat,
  getMimeType,
  resizeImageData,
  type JSquashImageData
} from './codecs'
import { stripMetadata } from './metadata'

console.log('[Worker] Image worker booting')

function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  opts: ImageConvertOpts
): { width: number; height: number } {
  if (opts.scale && opts.scale !== 1.0) {
    const result = {
      width: Math.round(originalWidth * opts.scale),
      height: Math.round(originalHeight * opts.scale)
    }
    return result
  }

  let width = opts.width ?? originalWidth
  let height = opts.height ?? originalHeight

  if (opts.longEdge) {
    const aspectRatio = originalWidth / originalHeight
    if (originalWidth > originalHeight) {
      width = opts.longEdge
      height = Math.round(opts.longEdge / aspectRatio)
    } else {
      height = opts.longEdge
      width = Math.round(opts.longEdge * aspectRatio)
    }
  } else if (opts.width && !opts.height) {
    height = Math.round(opts.width / (originalWidth / originalHeight))
  } else if (opts.height && !opts.width) {
    width = Math.round(opts.height * (originalWidth / originalHeight))
  }

  return { width, height }
}

async function convertImage(
  buffer: ArrayBuffer,
  opts: ImageConvertOpts,
  onProgress?: (progress: number) => void,
  onStage?: (stage: string) => void
): Promise<ImageConvertResult> {
  try {
    onProgress?.(0.05)

    const bytes = new Uint8Array(buffer)
    const originalFormat = detectFormat(bytes)

    const needsResize = opts.scale || opts.width || opts.height || opts.longEdge
    const needsFormatChange = originalFormat !== opts.to
    const needsExifStrip = opts.stripExif

    if (!needsResize && !needsFormatChange && !needsExifStrip) {
      const blob = new Blob([buffer], { type: getMimeType(opts.to) })
      onProgress?.(1.0)
      return {
        blob,
        size: blob.size,
        width: 0,
        height: 0,
        format: opts.to
      }
    }

    if (!areCodecsLoaded()) {
      onStage?.('Loading codecs…')
    }
    await ensureCodecsLoaded()

    onStage?.('Decoding...')
    onProgress?.(0.1)
    const imageData = await decodeImage(buffer)
    const { width: originalWidth, height: originalHeight } = imageData
    onProgress?.(0.3)

    const { width: targetWidth, height: targetHeight } = calculateResizeDimensions(
      originalWidth,
      originalHeight,
      opts
    )
    onProgress?.(0.35)

    let processedImageData: JSquashImageData = imageData
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      onStage?.('Resizing...')
      onProgress?.(0.4)
      const startResize = performance.now()
      processedImageData = await resizeImageData(imageData, targetWidth, targetHeight)
      console.log('[Worker] Resize took', Math.round(performance.now() - startResize), 'ms')
      onProgress?.(0.7)
    } else {
      onProgress?.(0.7)
    }

    onStage?.('Encoding...')
    onProgress?.(0.75)
    let encodedBuffer = await encodeImage(processedImageData, opts.to, { quality: opts.quality })
    if (opts.stripExif) {
      encodedBuffer = stripMetadata(encodedBuffer, opts.to)
    }
    onProgress?.(0.95)

    const blob = new Blob([encodedBuffer], { type: getMimeType(opts.to) })
    onProgress?.(1.0)

    return {
      blob,
      size: blob.size,
      width: targetWidth,
      height: targetHeight,
      format: opts.to
    }
  } catch (error) {
    throw new Error(`Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { id, type, data } = event.data

  try {
    if (type === 'ping') {
      self.postMessage({ id, result: 'pong' })
      return
    }

    if (type === 'convert') {
      const progressCallback = (progress: number) => {
        self.postMessage({ id, type: 'progress', progress })
      }

      const stageCallback = (stage: string) => {
        self.postMessage({ id, type: 'stage', stage })
      }

      const result = await convertImage(data.buffer, data.opts, progressCallback, stageCallback)
      self.postMessage({ id, result })
      return
    }

    throw new Error(`Unknown message type: ${type}`)
  } catch (error) {
    console.error('[Worker] Error:', error)
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

console.log('[Worker] Image worker ready')
