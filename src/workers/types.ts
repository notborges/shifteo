// Worker type definitions for Shifteo

// === Image Worker Types ===

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'tiff' | 'ico'
export type ExtendedImageFormat = ImageFormat | 'svg'

export interface ImageConvertOpts {
  to: ImageFormat
  quality?: number // 0..1 (for lossy formats)
  width?: number // px
  height?: number // px
  longEdge?: number // px (will preserve aspect ratio)
  scale?: number // multiplier (e.g., 0.5 = 50%, 2.0 = 200%)
  keepExif?: boolean // default false
  stripExif?: boolean // convenience flag for UI layer
  colorSpace?: 'srgb' | 'display-p3'
  sourcePage?: number // for multi-frame inputs like TIFF
}

export interface ImageConvertResult {
  blob: Blob
  size: number
  width: number
  height: number
  format: ImageFormat
}

export interface ProgressUpdate {
  progress: number // 0..1
  message?: string
}

// === Document Worker Types ===

export interface PdfCompressionOptions {
  imageQuality?: number // 0..1
  maxImageDimension?: number // px
  coordinatePrecision?: number // decimal places to retain in content streams
  pruneFonts?: boolean
  recompressStreams?: boolean
}

export interface PdfImageChange {
  name?: string
  before: { width: number; height: number; bytes: number }
  after: { width: number; height: number; bytes: number }
  savedBytes: number
}

export interface PdfStreamChange {
  ref: string
  savedBytes: number
}

export interface PdfCompressionDetails {
  metadataKeysRemoved: string[]
  fontsRemoved: string[]
  imageChanges: PdfImageChange[]
  streamChanges: PdfStreamChange[]
  imageBytesSaved: number
  streamBytesSaved: number
}

export interface PdfCompressionStats {
  originalBytes: number
  compressedBytes: number
  fontsRemoved: number
  streamsRecompressed: number
  imagesDownscaled: number
  rasterFallbackUsed: boolean
  preset: 'light' | 'balanced' | 'small'
  options: Required<PdfCompressionOptions>
  details: PdfCompressionDetails
}

export interface PdfOrganizeTask {
  kind: 'pdf_organize'
  order?: number[]
  rotations?: Record<number, number>
}

export type DocTask =
  | { kind: 'docx_to_html' }
  | { kind: 'html_to_pdf'; options?: { margin?: number; page?: 'A4' | 'Letter' } }
  | { kind: 'pdf_to_images'; dpi?: number; pageRange?: { start: number; end: number } }
  | { kind: 'pdf_merge' }
  | { kind: 'pdf_split'; pages: number[]; mode?: 'single' | 'individual' }
  | { kind: 'pdf_compress'; preset?: 'light' | 'balanced' | 'small'; options?: PdfCompressionOptions }
  | PdfOrganizeTask

export interface DocConvertResult {
  blob?: Blob | Blob[]
  pageCount?: number
  filename?: string
  files?: Array<{ blob: Blob; filename: string }>
  stats?: PdfCompressionStats
}

// === Base Worker Interface ===

export interface ShifteoWorker {
  ping(): Promise<'pong'>
}

// === Image Worker Interface ===

export interface ImageWorker extends ShifteoWorker {
  convert(
    file: File,
    opts: ImageConvertOpts,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<ImageConvertResult>

  batch(
    files: File[],
    opts: ImageConvertOpts,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<ImageConvertResult[]>
}

// === Document Worker Interface ===

export interface DocWorker extends ShifteoWorker {
  run(
    input: File | File[],
    task: DocTask,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<DocConvertResult>
}

// === Queue Management Types ===

export type JobStatus = 'idle' | 'running' | 'completed' | 'error'
export type JobKind = 'image' | 'document'

export interface Job {
  id: string
  file: File
  kind: JobKind
  status: JobStatus
  progress: number // 0..1
  stage?: string // e.g., "Decoding", "Resizing", "Encoding"
  error?: string
  result?: Blob | Blob[]
  thumbnail?: string // Blob URL for image preview
  originalDimensions?: { width: number; height: number }
  outputDimensions?: { width: number; height: number }
  outputFormat?: ExtendedImageFormat // Actual format used for conversion
  sourcePage?: number
  options?: ImageConvertOpts | DocTask // Deprecated - kept for backwards compat, not used
  createdAt: number
  completedAt?: number
}

// === Settings Types ===

export interface AppSettings {
  // Image defaults
  defaultImageFormat: ExtendedImageFormat
  defaultImageQuality: number
  stripExifByDefault: boolean

  // Document defaults
  defaultPdfPaperSize: 'A4' | 'Letter'
  defaultPdfMargin: number
  defaultPdfDpi: number

  // Output naming
  outputNamingPattern: string // e.g., "${name}.${ext}" or "${name}-${w}x${h}.${ext}"

  // UI preferences
  darkMode: boolean
  showPreview: boolean
}
