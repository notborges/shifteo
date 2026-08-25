import { inferOriginalImageFormat } from './format'

type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type ClampedArray = Uint8ClampedArray<ArrayBuffer>

interface SaveFileHandle {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
}

interface BrowserWindow extends Window {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: Array<{ description: string; accept: Record<string, string[]> }>
  }) => Promise<SaveFileHandle>
  webkitURL?: typeof URL
}

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

export async function downloadFile(blob: Blob, filename: string): Promise<void> {
  const browserWindow = window as BrowserWindow

  if (browserWindow.showSaveFilePicker) {
    try {
      const handle = await browserWindow.showSaveFilePicker({
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
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.warn('File System Access API failed, falling back to download:', error)
      }
    }
  }

  const navigatorAny = window.navigator as typeof window.navigator & {
    msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => void
  }

  if (typeof navigatorAny.msSaveOrOpenBlob === 'function') {
    navigatorAny.msSaveOrOpenBlob(blob, filename)
    return
  }

  const anchor = document.createElementNS('http://www.w3.org/1999/xhtml', 'a') as HTMLAnchorElement
  const supportsDownloadAttr = typeof anchor.download !== 'undefined'
  const isMacOSWebView = typeof navigator !== 'undefined'
    && /Macintosh/.test(navigator.userAgent)
    && /AppleWebKit/.test(navigator.userAgent)
    && !/Safari/.test(navigator.userAgent)

  const URLObject = window.URL || browserWindow.webkitURL

  if (supportsDownloadAttr && !isMacOSWebView && URLObject?.createObjectURL) {
    const objectUrl = URLObject.createObjectURL(blob)
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = 'noopener'
    const clickAnchor = () => {
      try {
        anchor.dispatchEvent(new MouseEvent('click'))
      } catch {
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
    reader.readAsDataURL(blob)
  })
}

export async function downloadAsZip(
  files: Array<{ blob: Blob; filename: string }>,
  zipFilename: string = 'shifteo-export.zip'
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  for (const { blob, filename } of files) {
    zip.file(filename, blob)
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  await downloadFile(zipBlob, zipFilename)
}

export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export async function getImageDimensions(
  file: File,
  options: { pageIndex?: number; buffer?: ArrayBuffer } = {}
): Promise<{ width: number; height: number } | null> {
  const format = inferOriginalImageFormat(file)

  if (format === 'tiff') {
    return import('@/workers/codecs/local-tiff').then(async ({ decode }) => {
      const buffer = options.buffer ?? await file.arrayBuffer()
      const image = await decode(buffer, options.pageIndex ?? 0)
      return { width: image.width, height: image.height }
    }).catch(() => null)
  }

  if (format === 'ico') {
    return import('@/workers/codecs/local-ico').then(async ({ decode }) => {
      const image = await decode(await file.arrayBuffer())
      return { width: image.width, height: image.height }
    }).catch(() => null)
  }

  if (format === 'bmp') {
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
          resolve(thumbBlob ? URL.createObjectURL(thumbBlob) : null)
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

export async function generateThumbnail(
  file: File,
  size: number = 48,
  options: { pageIndex?: number; buffer?: ArrayBuffer } = {}
): Promise<string | null> {
  try {
    const format = inferOriginalImageFormat(file)

    if (format === 'svg') {
      return await generateSVGThumbnail(file, size)
    }

    if (format === 'tiff') {
      return await generateTiffThumbnail(file, size, options.pageIndex ?? 0, options.buffer)
    }

    if (format === 'ico') {
      return await generateIcoThumbnail(file, size, options.buffer)
    }

    const bitmap = await createImageBitmap(file)
    try {
      const canvas = createCanvas(size, size)
      const ctx = get2DContext(canvas)
      if (!ctx) return null

      const sourceSize = Math.min(bitmap.width, bitmap.height)
      const sourceX = (bitmap.width - sourceSize) / 2
      const sourceY = (bitmap.height - sourceSize) / 2

      ctx.drawImage(
        bitmap,
        sourceX, sourceY, sourceSize, sourceSize,
        0, 0, size, size
      )

      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8)
      return blob ? URL.createObjectURL(blob) : null
    } finally {
      bitmap.close()
    }
  } catch (error) {
    console.error('Failed to generate thumbnail:', error)
    return null
  }
}

async function generateTiffThumbnail(file: File, size: number, pageIndex: number, buffer?: ArrayBuffer): Promise<string | null> {
  try {
    const { decode } = await import('@/workers/codecs/local-tiff')
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
    const { decode } = await import('@/workers/codecs/local-ico')
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
  ;(outputCtx as CanvasRenderingContext2D).drawImage(sourceCanvas as CanvasImageSource, 0, 0, imageData.width, imageData.height, offsetX, offsetY, targetWidth, targetHeight)

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

async function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type = 'image/png',
  quality?: number
): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, ...(quality === undefined ? {} : { quality }) })
  }

  const htmlCanvas = canvas as HTMLCanvasElement
  return await new Promise<Blob | null>((resolve) => {
    htmlCanvas.toBlob(blob => resolve(blob), type, quality)
  })
}
