import type { DocTask, DocConvertResult } from './types'

interface PendingJob {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
  onProgress?: (progress: number) => void
  onStage?: (stage: string) => void
}

interface FileMeta {
  name: string
  type: string
}

interface RunPayload {
  buffers: ArrayBuffer[]
  meta: FileMeta[]
  task: DocTask
}

interface WorkerResponse {
  id: number
  result?: unknown
  error?: string
  type?: 'progress' | 'stage'
  progress?: number
  stage?: string
}

interface WorkerPdfResult {
  kind: 'pdf'
  buffer: ArrayBuffer
  filename?: string
  pageCount?: number
  stats?: unknown
}

interface WorkerPdfCollectionResult {
  kind: 'pdf-collection'
  entries: Array<{ buffer: ArrayBuffer; filename: string }>
}

class PdfWorkerPool {
  private worker: Worker | null = null
  private pending = new Map<number, PendingJob>()
  private messageId = 0

  constructor() {
    if (typeof window !== 'undefined') {
      this.worker = this.createWorker()
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), {
      type: 'module'
    })

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const { id, type, progress, stage, error, result } = event.data
      const pending = this.pending.get(id)
      if (!pending) return

      if (type === 'progress' && typeof progress === 'number') {
        pending.onProgress?.(progress)
        return
      }

      if (type === 'stage' && typeof stage === 'string') {
        pending.onStage?.(stage)
        return
      }

      this.pending.delete(id)

      if (error) {
        pending.reject(new Error(error))
        return
      }

      if (result && typeof result === 'object' && 'kind' in result) {
        const payload = result as WorkerPdfResult | WorkerPdfCollectionResult
        if (payload.kind === 'pdf') {
          const blob = new Blob([payload.buffer], { type: 'application/pdf' })
          pending.resolve({
            blob,
            pageCount: payload.pageCount,
            filename: payload.filename,
            stats: (payload as { stats?: unknown }).stats
          })
          return
        }
        if (payload.kind === 'pdf-collection') {
          const files = payload.entries.map(entry => ({
            blob: new Blob([entry.buffer], { type: 'application/pdf' }),
            filename: entry.filename
          }))
          pending.resolve({
            blob: files.map(file => file.blob),
            files
          })
          return
        }
      }

      if (result) {
        pending.resolve(result as DocConvertResult)
      } else {
        pending.reject(new Error('Worker finished without result'))
      }
    })

    worker.addEventListener('error', (event: ErrorEvent) => {
      this.flushWithError(new Error(event.message || 'PDF worker error'))
    })

    worker.addEventListener('messageerror', () => {
      this.flushWithError(new Error('PDF worker message error'))
    })

    return worker
  }

  private flushWithError(error: Error) {
    this.pending.forEach(({ reject }) => reject(error))
    this.pending.clear()
  }

  async run(
    input: File | File[],
    task: DocTask,
    hooks: { onProgress?: (progress: number) => void; onStage?: (stage: string) => void } = {}
  ): Promise<DocConvertResult> {
    if (!this.worker) {
      throw new Error('PDF worker not initialised')
    }

    const files = Array.isArray(input) ? input : [input]
    const buffers: ArrayBuffer[] = []
    const meta: FileMeta[] = []

    for (const file of files) {
      buffers.push(await file.arrayBuffer())
      meta.push({ name: file.name, type: file.type })
    }

    const id = this.messageId++

    const payload: RunPayload = {
      buffers,
      meta,
      task
    }

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (result) => resolve(result as DocConvertResult),
        reject,
        onProgress: hooks.onProgress,
        onStage: hooks.onStage
      })

      try {
        this.worker!.postMessage({ id, type: 'run', data: payload }, buffers)
      } catch (error) {
        this.pending.delete(id)
        reject(error instanceof Error ? error : new Error('Failed to post PDF task to worker'))
      }
    })
  }

  async ping(): Promise<'pong'> {
    if (!this.worker) throw new Error('PDF worker not initialised')

    const id = this.messageId++

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (result) => resolve(result as 'pong'),
        reject
      })

      try {
        this.worker!.postMessage({ id, type: 'ping', data: {} })
      } catch (error) {
        this.pending.delete(id)
        reject(error instanceof Error ? error : new Error('Failed to ping PDF worker'))
      }
    })
  }
}

export const pdfWorkerPool = new PdfWorkerPool()
