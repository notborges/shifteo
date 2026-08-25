import type { ImageConvertOpts, ImageConvertResult } from './types'
import { toRaw } from 'vue'

interface QueuedJob {
  file: File
  opts: ImageConvertOpts
  resolve: (result: ImageConvertResult) => void
  reject: (error: Error) => void
  onProgress?: (progress: number) => void
}

interface PendingJob extends Omit<QueuedJob, 'file' | 'opts'> {
  id: number
}

class ImageWorkerPool {
  private availableWorkers: Set<Worker> = new Set()
  private queue: QueuedJob[] = []
  private pendingJobs: Map<Worker, PendingJob> = new Map()
  private messageId = 0
  private maxWorkers: number

  constructor() {
    this.maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 4)
    this.initializeWorkers()
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = this.createWorker()
      this.availableWorkers.add(worker)
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./image.worker.ts', import.meta.url), {
      type: 'module'
    })

    const messageHandler = (event: MessageEvent) => this.onWorkerMessage(worker, event)
    const errorHandler = (event: ErrorEvent) => this.onWorkerError(worker, event)
    const messageErrorHandler = () => this.onWorkerMessageError(worker)

    worker.addEventListener('message', messageHandler)
    worker.addEventListener('error', errorHandler)
    worker.addEventListener('messageerror', messageErrorHandler)

    return worker
  }

  private onWorkerMessage(worker: Worker, event: MessageEvent) {
    const pending = this.pendingJobs.get(worker)
    if (!pending || event.data?.id !== pending.id) {
      return
    }

    if (event.data.type === 'progress') {
      pending.onProgress?.(event.data.progress)
      return
    }

    this.finishPendingJob(worker, event.data.error ? new Error(event.data.error) : undefined, event.data.result)
  }

  private onWorkerError(worker: Worker, event: ErrorEvent) {
    const message = event.message || event.error?.message || 'Unknown worker error'
    this.finishPendingJob(worker, new Error(`Worker error: ${message}`))
  }

  private onWorkerMessageError(worker: Worker) {
    this.finishPendingJob(worker, new Error('Worker message error'))
  }

  private finishPendingJob(worker: Worker, error?: Error, result?: ImageConvertResult) {
    const pending = this.pendingJobs.get(worker)
    if (!pending) {
      return
    }

    this.pendingJobs.delete(worker)
    this.availableWorkers.add(worker)

    queueMicrotask(() => this.processNextInQueue())

    if (error) {
      pending.reject(error)
    } else if (result !== undefined) {
      pending.resolve(result)
    } else {
      pending.reject(new Error('Worker finished without result'))
    }
  }

  private processNextInQueue() {
    if (this.queue.length === 0 || this.availableWorkers.size === 0) {
      return
    }

    const worker = this.availableWorkers.values().next().value as Worker | undefined
    if (!worker) return

    const job = this.queue.shift()
    if (!job) return

    this.availableWorkers.delete(worker)
    this.startJob(worker, job)
  }

  private async startJob(worker: Worker, job: QueuedJob) {
    const id = this.messageId++
    let arrayBuffer: ArrayBuffer

    try {
      arrayBuffer = await job.file.arrayBuffer()
    } catch (error) {
      this.availableWorkers.add(worker)
      queueMicrotask(() => this.processNextInQueue())
      job.reject(error instanceof Error ? error : new Error('Failed to read file data'))
      return
    }

    const plainOpts = toRaw(job.opts)
    this.pendingJobs.set(worker, { id, resolve: job.resolve, reject: job.reject, onProgress: job.onProgress })

    try {
      worker.postMessage(
        { id, type: 'convert', data: { buffer: arrayBuffer, opts: plainOpts } },
        [arrayBuffer]
      )
    } catch (error) {
      this.pendingJobs.delete(worker)
      this.availableWorkers.add(worker)
      queueMicrotask(() => this.processNextInQueue())
      job.reject(error instanceof Error ? error : new Error('Failed to post message to worker'))
    }
  }

  convert(
    file: File,
    opts: ImageConvertOpts,
    onProgress?: (progress: number) => void
  ): Promise<ImageConvertResult> {
    return new Promise((resolve, reject) => {
      const job: QueuedJob = { file, opts, resolve, reject, onProgress }

      if (this.availableWorkers.size > 0) {
        const worker = this.availableWorkers.values().next().value as Worker | undefined
        if (!worker) {
          reject(new Error('No available worker'))
          return
        }
        this.availableWorkers.delete(worker)
        this.startJob(worker, job)
      } else {
        this.queue.push(job)
      }
    })
  }
}
export const imageWorkerPool = new ImageWorkerPool()
