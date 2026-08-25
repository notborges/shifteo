export const IMAGE_FORMATS = [
  'png',
  'jpeg',
  'webp',
  'avif',
  'bmp',
  'tiff',
  'ico',
  'jxl'
] as const

export type ImageFormat = typeof IMAGE_FORMATS[number]
export type OriginalImageFormat = ImageFormat | 'heic' | 'svg'
export type ExtendedImageFormat = ImageFormat | 'svg'

export const SELECTABLE_OUTPUT_FORMATS = [
  'webp',
  'jpeg',
  'png',
  'avif',
  'jxl',
  'tiff',
  'ico'
] as const satisfies readonly ImageFormat[]

export const FILTER_PRESETS = [
  'grayscale',
  'sepia',
  'vintage',
  'cool',
  'warm',
  'dramatic',
  'fade',
  'vivid'
] as const

export type FilterPreset = typeof FILTER_PRESETS[number] | 'none'

export const SUPPORTED_INPUT_EXTENSIONS: ReadonlySet<string> = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'jxl',
  'heic',
  'heif',
  'svg',
  'bmp',
  'tif',
  'tiff',
  'ico'
])

export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/jxl': 'jxl',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico'
}

export const SUPPORTED_INPUT_MIME_TYPES: ReadonlySet<string> = new Set(Object.keys(MIME_TO_EXTENSION))
export const SUPPORTED_INPUT_ACCEPT = [...SUPPORTED_INPUT_MIME_TYPES].join(',')

export const IMAGE_MIME_TYPES: Record<ImageFormat | 'heic', string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  jxl: 'image/jxl',
  heic: 'image/heic',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  ico: 'image/vnd.microsoft.icon'
}

export const DEFAULT_OUTPUT_FORMAT: ImageFormat = 'webp'
export const DEFAULT_IMAGE_QUALITY = 0.85
export const QUEUE_THUMBNAIL_SIZE = 200

export function isImageFormat(value: string): value is ImageFormat {
  return IMAGE_FORMATS.includes(value as ImageFormat)
}
