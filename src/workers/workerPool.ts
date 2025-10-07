import type { ImageConvertOpts, ImageConvertResult } from './types'
import { toRaw } from 'vue'

interface QueuedJob {
  file: File
  opts: ImageConvertOpts
  resolve: (result: ImageConvertResult) => void
  reject: (error: Error) => void
  onProgress?: (progress: number) => void
  onStage?: (stage: string) => void
}

interface PendingJob extends Omit<QueuedJob, 'file' | 'opts'> {
  id: number
}

interface WorkerListeners {
  message: (event: MessageEvent) => void
  error: (event: ErrorEvent) => void
  messageError: (event: MessageEvent) => void
}

class ImageWorkerPool {
  private workers: Worker[] = []
  private availableWorkers: Set<Worker> = new Set()
  private queue: QueuedJob[] = []
  private pendingJobs: Map<Worker, PendingJob> = new Map()
  private workerListeners: Map<Worker, WorkerListeners> = new Map()
  private messageId = 0
  private maxWorkers: number

  constructor() {
    this.maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 4)
    console.log(`[Pool] Creating pool with ${this.maxWorkers} workers`)
    this.initializeWorkers()
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = this.createWorker()
      this.workers.push(worker)
      this.availableWorkers.add(worker)
      console.log(`[Pool] Worker ${i + 1}/${this.maxWorkers} created`)
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./image.worker.ts', import.meta.url), {
      type: 'module'
    })

    const messageHandler = (event: MessageEvent) => this.onWorkerMessage(worker, event)
    const errorHandler = (event: ErrorEvent) => this.onWorkerError(worker, event)
    const messageErrorHandler = (event: MessageEvent) => this.onWorkerMessageError(worker, event)

    worker.addEventListener('message', messageHandler)
    worker.addEventListener('error', errorHandler)
    worker.addEventListener('messageerror', messageErrorHandler)

    this.workerListeners.set(worker, {
      message: messageHandler,
      error: errorHandler,
      messageError: messageErrorHandler
    })

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

    if (event.data.type === 'stage') {
      pending.onStage?.(event.data.stage)
      return
    }

    this.finishPendingJob(worker, event.data.error ? new Error(event.data.error) : undefined, event.data.result)
  }

  private onWorkerError(worker: Worker, event: ErrorEvent) {
    const message = event.message || event.error?.message || 'Unknown worker error'
    this.finishPendingJob(worker, new Error(`Worker error: ${message}`))
  }

  private onWorkerMessageError(worker: Worker, _event: MessageEvent) {
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
    this.pendingJobs.set(worker, { id, resolve: job.resolve, reject: job.reject, onProgress: job.onProgress, onStage: job.onStage })

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

  async convert(
    file: File,
    opts: ImageConvertOpts,
    onProgress?: (progress: number) => void,
    onStage?: (stage: string) => void
  ): Promise<ImageConvertResult> {
    return new Promise((resolve, reject) => {
      const job: QueuedJob = { file, opts, resolve, reject, onProgress, onStage }

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

  async ping(): Promise<'pong'> {
    const worker = this.workers[0]
    if (!worker) {
      throw new Error('No workers available')
    }
    return new Promise((resolve, _reject) => {
      const id = this.messageId++
      const handler = (event: MessageEvent) => {
        if (event.data.id === id) {
          worker.removeEventListener('message', handler)
          resolve(event.data.result)
        }
      }
      worker.addEventListener('message', handler)
      worker.postMessage({ id, type: 'ping', data: {} })
    })
  }

  terminate() {
    this.workers.forEach(worker => {
      const listeners = this.workerListeners.get(worker)
      if (listeners) {
        worker.removeEventListener('message', listeners.message)
        worker.removeEventListener('error', listeners.error)
        worker.removeEventListener('messageerror', listeners.messageError)
      }
      worker.terminate()
    })
    this.workers = []
    this.availableWorkers.clear()
    this.queue = []
    this.pendingJobs.clear()
    this.workerListeners.clear()
  }
}

export const imageWorkerPool = new ImageWorkerPool()
