import type { ImageConvertOpts, ImageConvertResult } from './types'
import {
  ensureCodecsLoaded,
  decodeImage,
  encodeImage,
  getMimeType,
  resizeImageData,
  type JSquashImageData
} from './codecs'
import { stripMetadata } from './metadata'
import { applyAdjustments, applyFilter } from './codecs/photon'

function cropImageData(
  imageData: JSquashImageData,
  x: number,
  y: number,
  cropWidth: number,
  cropHeight: number
): JSquashImageData {
  const { width: srcWidth, height: srcHeight, data: srcData } = imageData

  const clampedX = Math.max(0, Math.min(x, srcWidth))
  const clampedY = Math.max(0, Math.min(y, srcHeight))
  const clampedW = Math.min(cropWidth, srcWidth - clampedX)
  const clampedH = Math.min(cropHeight, srcHeight - clampedY)

  if (clampedW <= 0 || clampedH <= 0) {
    throw new Error('Invalid crop region')
  }

  const newData = new Uint8ClampedArray(clampedW * clampedH * 4) as Uint8ClampedArray<ArrayBuffer>

  for (let row = 0; row < clampedH; row++) {
    const srcRowStart = ((clampedY + row) * srcWidth + clampedX) * 4
    const dstRowStart = row * clampedW * 4
    const rowBytes = clampedW * 4

    for (let i = 0; i < rowBytes; i++) {
      newData[dstRowStart + i] = srcData[srcRowStart + i]!
    }
  }

  return { width: clampedW, height: clampedH, data: newData }
}

function rotateImageData(
  imageData: JSquashImageData,
  angle: 0 | 90 | 180 | 270
): JSquashImageData {
  if (angle === 0) return imageData

  const { width, height, data } = imageData

  const newWidth = angle === 180 ? width : height
  const newHeight = angle === 180 ? height : width
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4) as Uint8ClampedArray<ArrayBuffer>

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4
      let dstX: number, dstY: number

      switch (angle) {
        case 90:
          // 90° clockwise: (x, y) -> (height - 1 - y, x)
          dstX = height - 1 - y
          dstY = x
          break
        case 180:
          // 180°: (x, y) -> (width - 1 - x, height - 1 - y)
          dstX = width - 1 - x
          dstY = height - 1 - y
          break
        case 270:
          // 270° clockwise (90° counter-clockwise): (x, y) -> (y, width - 1 - x)
          dstX = y
          dstY = width - 1 - x
          break
        default:
          dstX = x
          dstY = y
      }

      const dstIndex = (dstY * newWidth + dstX) * 4
      newData[dstIndex] = data[srcIndex]!
      newData[dstIndex + 1] = data[srcIndex + 1]!
      newData[dstIndex + 2] = data[srcIndex + 2]!
      newData[dstIndex + 3] = data[srcIndex + 3]!
    }
  }

  return { width: newWidth, height: newHeight, data: newData }
}

function flipImageData(
  imageData: JSquashImageData,
  horizontal: boolean,
  vertical: boolean
): JSquashImageData {
  if (!horizontal && !vertical) return imageData

  const { width, height, data } = imageData
  const newData = new Uint8ClampedArray(width * height * 4) as Uint8ClampedArray<ArrayBuffer>

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4
      const dstX = horizontal ? width - 1 - x : x
      const dstY = vertical ? height - 1 - y : y
      const dstIndex = (dstY * width + dstX) * 4

      newData[dstIndex] = data[srcIndex]!
      newData[dstIndex + 1] = data[srcIndex + 1]!
      newData[dstIndex + 2] = data[srcIndex + 2]!
      newData[dstIndex + 3] = data[srcIndex + 3]!
    }
  }

  return { width, height, data: newData }
}

function applyTransforms(
  imageData: JSquashImageData,
  opts: ImageConvertOpts
): JSquashImageData {
  let result = imageData

  if (opts.rotation) {
    result = rotateImageData(result, opts.rotation)
  }

  if (opts.flipH || opts.flipV) {
    result = flipImageData(result, !!opts.flipH, !!opts.flipV)
  }

  return result
}

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
  onProgress?: (progress: number) => void
): Promise<ImageConvertResult> {
  try {
    onProgress?.(0.05)

    const needsTransform = opts.rotation || opts.flipH || opts.flipV
    const needsCrop = opts.crop && opts.crop.width > 0 && opts.crop.height > 0

    await ensureCodecsLoaded()

    onProgress?.(0.1)
    let imageData = await decodeImage(buffer, { pageIndex: opts.sourcePage })
    onProgress?.(0.2)

    if (needsCrop && opts.crop) {
      imageData = cropImageData(
        imageData,
        opts.crop.x,
        opts.crop.y,
        opts.crop.width,
        opts.crop.height
      )
    }
    onProgress?.(0.3)

    if (needsTransform) {
      imageData = applyTransforms(imageData, opts)
    }
    onProgress?.(0.4)

    const { width: transformedWidth, height: transformedHeight } = imageData

    const { width: targetWidth, height: targetHeight } = calculateResizeDimensions(
      transformedWidth,
      transformedHeight,
      opts
    )
    onProgress?.(0.4)

    let processedImageData: JSquashImageData = imageData
    if (targetWidth !== transformedWidth || targetHeight !== transformedHeight) {
      onProgress?.(0.4)
      processedImageData = await resizeImageData(imageData, targetWidth, targetHeight, opts.resizeMethod)
      onProgress?.(0.7)
    } else {
      onProgress?.(0.7)
    }

    if (opts.filter && opts.filter !== 'none') {
      processedImageData = await applyFilter(processedImageData, opts.filter)
    }
    onProgress?.(0.8)

    const hasAdjustments = opts.adjustments && (
      opts.adjustments.brightness !== 0 ||
      opts.adjustments.contrast !== 0 ||
      opts.adjustments.saturation !== 0 ||
      (opts.adjustments.sharpness && opts.adjustments.sharpness > 0)
    )
    if (hasAdjustments && opts.adjustments) {
      processedImageData = await applyAdjustments(processedImageData, opts.adjustments)
    }
    onProgress?.(0.85)

    onProgress?.(0.9)
    let encodedBuffer = await encodeImage(processedImageData, opts.to, { quality: opts.quality })
    if (opts.to === 'png' || opts.to === 'jpeg' || opts.to === 'webp') {
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
    throw new Error(
      `Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    )
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { id, type, data } = event.data

  try {
    if (type === 'convert') {
      const progressCallback = (progress: number) => {
        self.postMessage({ id, type: 'progress', progress })
      }

      const result = await convertImage(data.buffer, data.opts, progressCallback)
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
