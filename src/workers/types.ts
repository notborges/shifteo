import type { FilterPreset, ImageFormat } from '@/constants/image'

export type RotationAngle = 0 | 90 | 180 | 270

export type ResizeMethod = 'lanczos3' | 'mitchell' | 'catrom' | 'triangle'

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageAdjustments {
  brightness?: number
  contrast?: number
  saturation?: number
  sharpness?: number
}

export interface ImageConvertOpts {
  to: ImageFormat
  quality?: number
  width?: number
  height?: number
  longEdge?: number
  scale?: number
  resizeMethod?: ResizeMethod
  sourcePage?: number
  rotation?: RotationAngle
  flipH?: boolean
  flipV?: boolean
  crop?: CropRegion
  adjustments?: ImageAdjustments
  filter?: FilterPreset
}

export interface ImageConvertResult {
  blob: Blob
  size: number
  width: number
  height: number
  format: ImageFormat
}
