import type { ImageConvertOpts, ImageConvertResult } from './types'

console.log('[Worker] Starting imports...')

// Dynamic imports to catch errors
let decodePng: any, encodePng: any
let decodeJpeg: any, encodeJpeg: any
let decodeWebp: any, encodeWebp: any
let decodeAvif: any, encodeAvif: any
let optimisePng: any
let resizeImage: any

async function loadModules() {
  try {
    console.log('[Worker] Loading PNG module...')
    const pngModule = await import('@jsquash/png')
    decodePng = pngModule.decode
    encodePng = pngModule.encode
    console.log('[Worker] PNG loaded')

    console.log('[Worker] Loading JPEG module...')
    const jpegModule = await import('@jsquash/jpeg')
    decodeJpeg = jpegModule.decode
    encodeJpeg = jpegModule.encode
    console.log('[Worker] JPEG loaded')

    console.log('[Worker] Loading WebP module...')
    const webpModule = await import('@jsquash/webp')
    decodeWebp = webpModule.decode
    encodeWebp = webpModule.encode
    console.log('[Worker] WebP loaded')

    console.log('[Worker] Loading AVIF module...')
    const avifModule = await import('@jsquash/avif')
    decodeAvif = avifModule.decode
    encodeAvif = avifModule.encode
    console.log('[Worker] AVIF loaded')

    console.log('[Worker] Loading OxiPNG module...')
    const oxipngModule = await import('@jsquash/oxipng')
    optimisePng = oxipngModule.optimise
    console.log('[Worker] OxiPNG loaded')

    console.log('[Worker] Loading Resize module...')
    resizeImage = (await import('@jsquash/resize')).default
    console.log('[Worker] Resize loaded')

    console.log('[Worker] All modules loaded successfully!')
  } catch (error) {
    console.error('[Worker] FATAL: Failed to load modules:', error)
    throw error
  }
}


// ImageData type for jSquash
interface JSquashImageData {
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
}

/**
 * Decode image from various formats to raw ImageData
 */
async function decodeImage(arrayBuffer: ArrayBuffer): Promise<JSquashImageData> {
  const bytes = new Uint8Array(arrayBuffer)

  // Try to detect format from magic bytes
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return await decodePng(arrayBuffer)
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return await decodeJpeg(arrayBuffer)
  }

  // WebP: RIFF ... WEBP
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return await decodeWebp(arrayBuffer)
  }

  // AVIF: try as fallback or based on ftyp
  try {
    return await decodeAvif(arrayBuffer)
  } catch {
    // Try all decoders as last resort
    try {
      return await decodePng(arrayBuffer)
    } catch {
      try {
        return await decodeJpeg(arrayBuffer)
      } catch {
        return await decodeWebp(arrayBuffer)
      }
    }
  }
}

/**
 * Encode ImageData to target format
 */
async function encodeImage(
  imageData: JSquashImageData,
  format: 'png' | 'jpeg' | 'webp' | 'avif',
  quality?: number
): Promise<ArrayBuffer> {
  switch (format) {
    case 'png': {
      const encoded = await encodePng(imageData)
      // Always optimize, but use faster level for large images
      const pixelCount = imageData.width * imageData.height
      const level = pixelCount > 4000000 ? 1 : 2
      console.log(`[Worker] Optimizing PNG with level ${level}`)
      return await optimisePng(encoded, { level })
    }
    case 'jpeg':
      return await encodeJpeg(imageData, { quality: Math.round((quality ?? 0.85) * 100) })
    case 'webp':
      return await encodeWebp(imageData, { quality: Math.round((quality ?? 0.85) * 100) })
    case 'avif':
      return await encodeAvif(imageData, { quality: Math.round((quality ?? 0.85) * 100) })
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

/**
 * Calculate resize dimensions while maintaining aspect ratio
 */
function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  opts: ImageConvertOpts
): { width: number; height: number } {
  // Handle scale first (percentage of original)
  if (opts.scale && opts.scale !== 1.0) {
    console.log('[Worker] Using scale mode:', opts.scale, 'x original')
    const result = {
      width: Math.round(originalWidth * opts.scale),
      height: Math.round(originalHeight * opts.scale)
    }
    console.log('[Worker] Scale result:', result)
    return result
  }

  let width = opts.width ?? originalWidth
  let height = opts.height ?? originalHeight

  // Handle longEdge option
  if (opts.longEdge) {
    const aspectRatio = originalWidth / originalHeight
    if (originalWidth > originalHeight) {
      width = opts.longEdge
      height = Math.round(opts.longEdge / aspectRatio)
    } else {
      height = opts.longEdge
      width = Math.round(opts.longEdge * aspectRatio)
    }
  }
  // Handle width/height with aspect ratio preservation
  else if (opts.width && !opts.height) {
    height = Math.round(opts.width / (originalWidth / originalHeight))
  } else if (opts.height && !opts.width) {
    width = Math.round(opts.height * (originalWidth / originalHeight))
  }

  return { width, height }
}

/**
 * Get MIME type for format
 */
function getMimeType(format: 'png' | 'jpeg' | 'webp' | 'avif'): string {
  const mimeTypes = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif'
  }
  return mimeTypes[format]
}

/**
 * Detect format from buffer magic bytes
 */
function detectFormat(bytes: Uint8Array): 'png' | 'jpeg' | 'webp' | 'avif' | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png'
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpeg'
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp'
  return null
}

/**
 * Convert image function
 */
async function convertImage(
  buffer: ArrayBuffer,
  opts: ImageConvertOpts,
  onProgress?: (progress: number) => void,
  onStage?: (stage: string) => void
): Promise<ImageConvertResult> {
  console.log('[Worker] convertImage called with opts:', opts)
  console.log('[Worker] Scale value:', opts.scale)

  try {
    onProgress?.(0.05)

    const bytes = new Uint8Array(buffer)
    const originalFormat = detectFormat(bytes)

    // Check if this is a no-op
    const needsResize = opts.scale || opts.width || opts.height || opts.longEdge
    const needsFormatChange = originalFormat !== opts.to
    const needsExifStrip = opts.stripExif

    if (!needsResize && !needsFormatChange && !needsExifStrip) {
      console.log('[Worker] No-op detected')
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

    // Decode
    console.log('[Worker] Decoding...')
    onStage?.('Decoding...')
    onProgress?.(0.1)
    const imageData = await decodeImage(buffer)
    const { width: originalWidth, height: originalHeight } = imageData
    console.log('[Worker] Original:', originalWidth, 'x', originalHeight)
    onProgress?.(0.3)

    // Calculate target dimensions
    const { width: targetWidth, height: targetHeight } = calculateResizeDimensions(
      originalWidth,
      originalHeight,
      opts
    )

    console.log('[Worker] Target:', targetWidth, 'x', targetHeight)
    onProgress?.(0.35)

    // Resize if needed
    let processedImageData = imageData
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      console.log('[Worker] Resizing...')
      onStage?.('Resizing...')
      onProgress?.(0.4)
      const startResize = performance.now()
      processedImageData = await resizeImage(imageData, {
        width: targetWidth,
        height: targetHeight,
        method: 'mitchell'
      })
      console.log('[Worker] Resize took:', Math.round(performance.now() - startResize), 'ms')
      onProgress?.(0.7)
    } else {
      onProgress?.(0.7)
    }

    // Encode
    console.log('[Worker] Encoding...')
    onStage?.('Encoding...')
    onProgress?.(0.75)
    const encodedBuffer = await encodeImage(processedImageData, opts.to, opts.quality)
    onProgress?.(0.95)

    // Create blob
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

let modulesReady = false
let moduleLoadPromise = loadModules().then(() => {
  modulesReady = true
  console.log('[Worker] Modules ready, worker can now process messages')
}).catch(error => {
  console.error('[Worker] Failed to initialize:', error)
})

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent) => {
  const { id, type, data } = event.data
  console.log('[Worker] Received message:', type, id)

  try {
    // Wait for modules to load before processing
    if (!modulesReady) {
      console.log('[Worker] Waiting for modules to load...')
      await moduleLoadPromise
      console.log('[Worker] Modules loaded, proceeding')
    }

    if (type === 'ping') {
      console.log('[Worker] Sending pong')
      self.postMessage({ id, result: 'pong' })
    } else if (type === 'convert') {
      console.log('[Worker] Starting conversion with opts:', data.opts)

      // Progress callback
      const progressCallback = (progress: number) => {
        self.postMessage({ id, type: 'progress', progress })
      }

      // Stage callback
      const stageCallback = (stage: string) => {
        self.postMessage({ id, type: 'stage', stage })
      }

      const result = await convertImage(data.buffer, data.opts, progressCallback, stageCallback)
      console.log('[Worker] Conversion complete, size:', result.size)
      self.postMessage({ id, result })
    } else {
      throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    console.error('[Worker] Error:', error)
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

console.log('[Worker] Image worker loaded and ready')
