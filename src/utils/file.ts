// File manipulation and download utilities

type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type ClampedArray = Uint8ClampedArray<ArrayBuffer>

function get2DContext(canvas: OffscreenCanvas | HTMLCanvasElement): Canvas2DContext | null {
  const context = canvas.getContext('2d')
  if (!context) return null
  return context as Canvas2DContext
}

function toClampedArray(data: Uint8Array | Uint8ClampedArray): ClampedArray {
  if (data instanceof Uint8ClampedArray && data.buffer instanceof ArrayBuffer) {
    return data as ClampedArray
  }
  return Uint8ClampedArray.from(data) as ClampedArray
}

/**
 * Trigger file download in browser
 */
export async function downloadFile(blob: Blob, filename: string): Promise<void> {
  // Try File System Access API first (better UX)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'File',
          accept: { [blob.type]: [`.${filename.split('.').pop()}`] },
        }],
      })

      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      // User cancelled or API not available, fall through to legacy method
      if ((error as any).name !== 'AbortError') {
        console.warn('File System Access API failed, falling back to download:', error)
      }
    }
  }

  // Fallback: traditional download link
  const navigatorAny = window.navigator as typeof window.navigator & {
    msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => void
  }

  const downloadBlob = blob.type === 'application/pdf'
    ? new Blob([blob], { type: 'application/octet-stream' })
    : blob

  if (typeof navigatorAny.msSaveOrOpenBlob === 'function') {
    navigatorAny.msSaveOrOpenBlob(downloadBlob, filename)
    return
  }

  const anchor = document.createElementNS('http://www.w3.org/1999/xhtml', 'a') as HTMLAnchorElement
  const supportsDownloadAttr = typeof anchor.download !== 'undefined'
  const isMacOSWebView = typeof navigator !== 'undefined'
    && /Macintosh/.test(navigator.userAgent)
    && /AppleWebKit/.test(navigator.userAgent)
    && !/Safari/.test(navigator.userAgent)

  const URLObject = window.URL || (window as any).webkitURL

  if (supportsDownloadAttr && !isMacOSWebView && URLObject?.createObjectURL) {
    const objectUrl = URLObject.createObjectURL(downloadBlob)
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = 'noopener'
    const clickAnchor = () => {
      try {
        anchor.dispatchEvent(new MouseEvent('click'))
      } catch (error) {
        const evt = document.createEvent('MouseEvents')
        evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0,
          false, false, false, false, 0, null)
        anchor.dispatchEvent(evt)
      }
    }
    setTimeout(clickAnchor, 0)
    setTimeout(() => {
      URLObject.revokeObjectURL(objectUrl)
    }, 40_000)
    return
  }

  // Safari and older browsers fallback: convert to data URL
  await new Promise<void>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) {
        reject(new Error('Failed to generate download URL'))
        return
      }
      const url = result.replace(/^data:[^;]*/, 'data:attachment/file')
      const popup = window.open(url, '_blank')
      if (!popup) {
        window.location.href = url
      }
      resolve()
    }
    reader.readAsDataURL(downloadBlob)
  })
}

/**
 * Download multiple files as a ZIP (using JSZip library if needed)
 * For MVP, we'll download them individually with a delay
 */
export async function downloadMultipleFiles(
  files: Array<{ blob: Blob; filename: string }>,
  delay: number = 300
): Promise<void> {
  for (const { blob, filename } of files) {
    await downloadFile(blob, filename)
    // Small delay to avoid browser blocking multiple downloads
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

/**
 * Download multiple files as a ZIP archive
 */
export async function downloadAsZip(
  files: Array<{ blob: Blob; filename: string }>,
  zipFilename: string = 'shifteo-export.zip'
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // Add all files to ZIP
  for (const { blob, filename } of files) {
    zip.file(filename, blob)
  }

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  // Download the ZIP
  await downloadFile(zipBlob, zipFilename)
}

/**
 * Read file as ArrayBuffer
 */
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Read file as Data URL
 */
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Read file as Text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Create a File object from Blob
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type })
}

/**
 * Validate file before processing
 */
export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateFile(
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): FileValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${(options.maxSize / 1024 / 1024).toFixed(2)}MB)`)
  }

  // Check MIME type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`)
  }

  // Check file extension
  if (options.allowedExtensions) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !options.allowedExtensions.includes(ext)) {
      errors.push(`File extension .${ext} is not supported`)
    }
  }

  // Warn if file name is very long
  if (file.name.length > 255) {
    warnings.push('File name is very long and may cause issues')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Generate unique ID for tracking
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(
  file: File,
  options: { pageIndex?: number; buffer?: ArrayBuffer } = {}
): Promise<{ width: number; height: number } | null> {
  const lowerName = file.name.toLowerCase()

  if (file.type === 'image/tiff' || lowerName.endsWith('.tif') || lowerName.endsWith('.tiff')) {
    return import('@/workers/codecs/local-tiff').then(async ({ decode }) => {
      const buffer = options.buffer ?? await file.arrayBuffer()
      const image = await decode(buffer, options.pageIndex ?? 0)
      return { width: image.width, height: image.height }
    }).catch(() => null)
  }

  if (
    file.type === 'image/x-icon' ||
    file.type === 'image/vnd.microsoft.icon' ||
    lowerName.endsWith('.ico')
  ) {
    return import('@/workers/codecs/local-ico').then(async ({ decode }) => {
      const image = await decode(await file.arrayBuffer())
      return { width: image.width, height: image.height }
    }).catch(() => null)
  }

  if (file.type === 'image/bmp' || lowerName.endsWith('.bmp')) {
    return import('@/workers/codecs/local-bmp').then(async ({ decode }) => {
      const image = await decode(await file.arrayBuffer())
      return { width: image.width, height: image.height }
    }).catch(() => null)
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

/**
 * Generate thumbnail for SVG file
 */
async function generateSVGThumbnail(file: File, size: number): Promise<string | null> {
  try {
    const svgText = await file.text()
    const blob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    return new Promise((resolve) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          URL.revokeObjectURL(url)
          resolve(null)
          return
        }

        const scale = size / Math.max(img.width, img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const offsetX = (size - scaledWidth) / 2
        const offsetY = (size - scaledHeight) / 2

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

    canvas.toBlob((thumbBlob) => {
      URL.revokeObjectURL(url)
      if (thumbBlob) {
        resolve(URL.createObjectURL(thumbBlob))
      } else {
        resolve(null)
      }
    }, 'image/png', 0.9)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    })
  } catch (error) {
    console.error('Failed to generate SVG thumbnail:', error)
    return null
  }
}

/**
 * Generate thumbnail from image file
 */
export async function generateThumbnail(
  file: File,
  size: number = 48,
  options: { pageIndex?: number; buffer?: ArrayBuffer } = {}
): Promise<string | null> {
  try {
    // Special handling for SVG
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      return await generateSVGThumbnail(file, size)
    }

    // TIFF thumbnails require manual decode because browsers do not natively render them
    if (
      file.type === 'image/tiff' ||
      file.name.toLowerCase().endsWith('.tif') ||
      file.name.toLowerCase().endsWith('.tiff')
    ) {
      return await generateTiffThumbnail(file, size, options.pageIndex ?? 0, options.buffer)
    }

    if (
      file.type === 'image/x-icon' ||
      file.type === 'image/vnd.microsoft.icon' ||
      file.name.toLowerCase().endsWith('.ico')
    ) {
      return await generateIcoThumbnail(file, size, options.buffer)
    }

    // Regular images
    const bitmap = await createImageBitmap(file)
    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const sourceSize = Math.min(bitmap.width, bitmap.height)
    const sourceX = (bitmap.width - sourceSize) / 2
    const sourceY = (bitmap.height - sourceSize) / 2

    ctx.drawImage(
      bitmap,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, size, size
    )

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Failed to generate thumbnail:', error)
    return null
  }
}

async function generateTiffThumbnail(file: File, size: number, pageIndex: number, buffer?: ArrayBuffer): Promise<string | null> {
  try {
    const [{ decode }] = await Promise.all([
      import('@/workers/codecs/local-tiff')
    ])

    const dataBuffer = buffer ?? await file.arrayBuffer()
    const imageData = await decode(dataBuffer, pageIndex)
    return await renderImageDataThumbnail(imageData, size)
  } catch (error) {
    console.error('Failed to render TIFF thumbnail:', error)
    return null
  }
}

async function generateIcoThumbnail(file: File, size: number, buffer?: ArrayBuffer): Promise<string | null> {
  try {
    const [{ decode }] = await Promise.all([
      import('@/workers/codecs/local-ico')
    ])

    const dataBuffer = buffer ?? await file.arrayBuffer()
    const imageData = await decode(dataBuffer)
    return await renderImageDataThumbnail(imageData, size)
  } catch (error) {
    console.error('Failed to render ICO thumbnail:', error)
    return null
  }
}

async function renderImageDataThumbnail(imageData: { data: Uint8ClampedArray | Uint8Array; width: number; height: number }, size: number): Promise<string | null> {
  const scale = Math.min(size / imageData.width, size / imageData.height, 1)
  const targetWidth = Math.max(1, Math.round(imageData.width * scale))
  const targetHeight = Math.max(1, Math.round(imageData.height * scale))

  const sourceCanvas = createCanvas(imageData.width, imageData.height)
  const sourceCtx = get2DContext(sourceCanvas)
  if (!sourceCtx || typeof (sourceCtx as CanvasRenderingContext2D).putImageData !== 'function') {
    return null
  }

  const data = toClampedArray(imageData.data)
  const imageDataObj = new ImageData(data, imageData.width, imageData.height)
  if ('putImageData' in sourceCtx) {
    (sourceCtx as CanvasRenderingContext2D).putImageData(imageDataObj, 0, 0)
  } else {
    return null
  }

  const outputCanvas = createCanvas(size, size)
  const outputCtx = get2DContext(outputCanvas)
  if (!outputCtx || typeof (outputCtx as CanvasRenderingContext2D).drawImage !== 'function') {
    return null
  }

  if ('clearRect' in outputCtx) {
    (outputCtx as CanvasRenderingContext2D).clearRect(0, 0, size, size)
  }

  const offsetX = (size - targetWidth) / 2
  const offsetY = (size - targetHeight) / 2
  ;(outputCtx as CanvasRenderingContext2D).drawImage(sourceCanvas as any, 0, 0, imageData.width, imageData.height, offsetX, offsetY, targetWidth, targetHeight)

  const blob = await canvasToBlob(outputCanvas)
  return blob ? URL.createObjectURL(blob) : null
}

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

async function canvasToBlob(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Blob | null> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/png' })
  }

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(blob => resolve(blob), 'image/png')
  })
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

export async function wrapImageBlobAsSvg(blob: Blob, width: number, height: number): Promise<Blob> {
  const dataUrl = await blobToDataUrl(blob)
  const safeWidth = Number.isFinite(width) && width > 0 ? Math.round(width) : 1
  const safeHeight = Number.isFinite(height) && height > 0 ? Math.round(height) : 1

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">` +
    `<image href="${dataUrl}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />` +
    `</svg>`

  return new Blob([svg], { type: 'image/svg+xml' })
}
