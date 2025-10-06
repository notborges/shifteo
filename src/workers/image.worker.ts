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
    const resizeModule = await import('@jsquash/resize')
    resizeImage = resizeModule.resize
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
      // Optionally optimize PNG
      return await optimisePng(encoded, { level: 2 })
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
 * Convert image function
 */
async function convertImage(buffer: ArrayBuffer, opts: ImageConvertOpts): Promise<ImageConvertResult> {
  try {
    // Decode image
    const imageData = await decodeImage(buffer)
    const { width: originalWidth, height: originalHeight } = imageData

    // Calculate target dimensions
    const { width: targetWidth, height: targetHeight } = calculateResizeDimensions(
      originalWidth,
      originalHeight,
      opts
    )

    // Resize if needed
    let processedImageData = imageData
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      processedImageData = await resizeImage(imageData, {
        width: targetWidth,
        height: targetHeight
      })
    }

    // Encode to target format
    const encodedBuffer = await encodeImage(processedImageData, opts.to, opts.quality)

    // Create blob
    const blob = new Blob([encodedBuffer], { type: getMimeType(opts.to) })

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
      const result = await convertImage(data.buffer, data.opts)
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
