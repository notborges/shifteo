import type { ExtendedImageFormat } from '@/constants/image'

export type JobStatus = 'idle' | 'running' | 'completed' | 'error'

export interface Job {
  id: string
  file: File
  status: JobStatus
  error?: string
  result?: Blob
  thumbnail?: string
  originalDimensions?: { width: number; height: number }
  outputDimensions?: { width: number; height: number }
  outputFormat?: ExtendedImageFormat
  createdAt: number
  completedAt?: number
}
