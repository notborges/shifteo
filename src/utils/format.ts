// Format capabilities and detection utilities

import type { JobKind, ImageFormat } from '@/workers/types'

export interface FormatCapability {
  input: readonly string[]
  output: readonly string[]
  maxMb: number
  notes?: string
}

export const CAPABILITIES = {
  image: {
    input: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'bmp', 'tif', 'tiff', 'ico'] as const,
    output: ['png', 'jpeg', 'webp', 'avif', 'bmp', 'tiff', 'ico'] as const,
    maxMb: 100,
  },
  document: {
    input: ['pdf', 'docx', 'html'] as const,
    output: ['pdf', 'html', 'png', 'jpeg'] as const,
    maxMb: 50,
    notes: 'DOCX→HTML best; HTML→PDF fidelity varies; PDF→Images via canvas render.'
  },
} as const satisfies Record<string, FormatCapability>

// MIME type mappings
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/html': 'html',
}

const EXT_TO_MIME: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'webp': 'image/webp',
  'avif': 'image/avif',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'tif': 'image/tiff',
  'tiff': 'image/tiff',
  'ico': 'image/vnd.microsoft.icon',
  'pdf': 'application/pdf',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'html': 'text/html',
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMime(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType] ?? null
}

/**
 * Get MIME type from file extension
 */
export function getMimeFromExtension(ext: string): string | null {
  return EXT_TO_MIME[ext.toLowerCase()] ?? null
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : ''
}

/**
 * Detect job kind (image or document) from file
 */
export function detectJobKind(file: File): JobKind | null {
  const ext = getExtensionFromMime(file.type) || getFileExtension(file.name)

  if (CAPABILITIES.image.input.includes(ext as any)) {
    return 'image'
  }

  if (CAPABILITIES.document.input.includes(ext as any)) {
    return 'document'
  }

  return null
}

/**
 * Check if format is supported for input
 */
export function isFormatSupported(file: File): boolean {
  return detectJobKind(file) !== null
}

/**
 * Get suggested output formats for a given input file
 */
export function getSuggestedOutputFormats(file: File): readonly string[] {
  const kind = detectJobKind(file)
  if (!kind) return []
  return CAPABILITIES[kind].output
}

/**
 * Check if file size exceeds limits
 */
export function isFileTooLarge(file: File): { tooLarge: boolean; maxMb: number; actualMb: number } {
  const kind = detectJobKind(file)
  if (!kind) return { tooLarge: false, maxMb: 0, actualMb: 0 }

  const maxBytes = CAPABILITIES[kind].maxMb * 1024 * 1024
  const actualMb = file.size / 1024 / 1024

  return {
    tooLarge: file.size > maxBytes,
    maxMb: CAPABILITIES[kind].maxMb,
    actualMb
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * Generate output filename based on pattern
 */
export function generateOutputFilename(
  originalName: string,
  format: string,
  pattern: string = '${name}.${ext}',
  metadata?: { width?: number; height?: number; page?: number }
): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')

  const tokens: Record<string, string> = {
    name: nameWithoutExt,
    ext: format,
    w: metadata?.width ? String(metadata.width) : '',
    h: metadata?.height ? String(metadata.height) : '',
    p: metadata?.page ? String(metadata.page) : ''
  }

  return pattern.replace(/\$\{(name|ext|w|h|p)\}/gi, (_, key: string) => {
    const value = tokens[key.toLowerCase()]
    return value ?? ''
  })
}

export type OriginalImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'svg'
  | 'bmp' | 'tiff' | 'ico'

/**
 * Infer the original image format label from a filename or MIME type.
 */
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

/**
 * Infer the default processing format for a file. SVG falls back to PNG.
 */
export function inferProcessingFormat(file: File): ImageFormat {
  const inferred = inferOriginalImageFormat(file)
  if (!inferred || inferred === 'svg') {
    return 'png'
  }
  return inferred
}
