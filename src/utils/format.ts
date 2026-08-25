import { MIME_TO_EXTENSION, SUPPORTED_INPUT_EXTENSIONS } from '@/constants/image'
import type { OriginalImageFormat } from '@/constants/image'

export type { OriginalImageFormat } from '@/constants/image'

function getExtensionFromMime(mimeType: string): string | null {
  return MIME_TO_EXTENSION[mimeType] ?? null
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : ''
}

function detectImage(file: File): boolean {
  const ext = getExtensionFromMime(file.type) || getFileExtension(file.name)
  return SUPPORTED_INPUT_EXTENSIONS.has(ext)
}

export function isFormatSupported(file: File): boolean {
  return detectImage(file)
}

export function generateOutputFilename(
  originalName: string,
  format: string
): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
  return `${nameWithoutExt}.${format}`
}

export function inferOriginalImageFormat(file: File): OriginalImageFormat | null {
  const ext = getExtensionFromMime(file.type) || getFileExtension(file.name)

  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg'
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'avif':
      return 'avif'
    case 'jxl':
      return 'jxl'
    case 'heic':
    case 'heif':
      return 'heic'
    case 'svg':
      return 'svg'
    case 'bmp':
      return 'bmp'
    case 'tif':
    case 'tiff':
      return 'tiff'
    case 'ico':
      return 'ico'
    default:
      return null
  }
}
