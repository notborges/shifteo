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

class ImageWorkerPool {
  private workers: Worker[] = []
  private availableWorkers: Set<Worker> = new Set()
  private queue: QueuedJob[] = []
  private messageId = 0
  private maxWorkers: number

  constructor() {
    this.maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 4)
    console.log(`[Pool] Creating pool with ${this.maxWorkers} workers`)
    this.initializeWorkers()
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(new URL('./image.worker.ts', import.meta.url), {
        type: 'module'
      })
      this.workers.push(worker)
      this.availableWorkers.add(worker)
      console.log(`[Pool] Worker ${i + 1}/${this.maxWorkers} created`)
    }
  }

  private async processWithWorker(
    worker: Worker,
    file: File,
    opts: ImageConvertOpts,
    onProgress?: (progress: number) => void,
    onStage?: (stage: string) => void
  ): Promise<ImageConvertResult> {
    return new Promise(async (resolve, reject) => {
      const id = this.messageId++
      const arrayBuffer = await file.arrayBuffer()
      const plainOpts = toRaw(opts)

      const handler = (event: MessageEvent) => {
        // Handle stage updates
        if (event.data.id === id && event.data.type === 'stage') {
          onStage?.(event.data.stage)
          return
        }

        // Handle progress updates
        if (event.data.id === id && event.data.type === 'progress') {
          onProgress?.(event.data.progress)
          return
        }

        // Handle completion
        if (event.data.id === id && !event.data.type) {
          worker.removeEventListener('message', handler)
          this.availableWorkers.add(worker)
          this.processNextInQueue()

          if (event.data.error) {
            reject(new Error(event.data.error))
          } else {
            resolve(event.data.result)
          }
        }
      }

      worker.addEventListener('message', handler)

      worker.addEventListener('error', (error) => {
        worker.removeEventListener('message', handler)
        this.availableWorkers.add(worker)
        reject(new Error(`Worker error: ${error.message}`))
      })

      worker.postMessage(
        { id, type: 'convert', data: { buffer: arrayBuffer, opts: plainOpts } },
        [arrayBuffer]
      )
    })
  }

  private processNextInQueue() {
    if (this.queue.length === 0 || this.availableWorkers.size === 0) {
      return
    }

    const worker = Array.from(this.availableWorkers)[0]
    if (!worker) return

    const job = this.queue.shift()!

    this.availableWorkers.delete(worker)
    this.processWithWorker(worker, job.file, job.opts, job.onProgress, job.onStage)
      .then(job.resolve)
      .catch(job.reject)
  }

  async convert(
    file: File,
    opts: ImageConvertOpts,
    onProgress?: (progress: number) => void,
    onStage?: (stage: string) => void
  ): Promise<ImageConvertResult> {
    return new Promise((resolve, reject) => {
      if (this.availableWorkers.size > 0) {
        const worker = Array.from(this.availableWorkers)[0]
        if (!worker) {
          reject(new Error('No available worker'))
          return
        }
        this.availableWorkers.delete(worker)
        this.processWithWorker(worker, file, opts, onProgress, onStage)
          .then(resolve)
          .catch(reject)
      } else {
        this.queue.push({ file, opts, resolve, reject, onProgress, onStage })
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
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.availableWorkers.clear()
    this.queue = []
  }
}

export const imageWorkerPool = new ImageWorkerPool()
