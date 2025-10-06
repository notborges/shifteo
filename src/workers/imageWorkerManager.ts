import { toRaw } from 'vue'
import type { ImageConvertOpts, ImageConvertResult } from './types'

let workerInstance: Worker | null = null

/**
 * Get or create image worker instance (without Comlink)
 */
function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./image.worker.ts', import.meta.url), {
      type: 'module'
    })
    console.log('[Manager] Worker created')
  }
  return workerInstance
}

let messageId = 0

/**
 * Send message to worker and wait for response
 */
function sendToWorker<T>(type: string, data: any, transferables: Transferable[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = getWorker()
    const id = messageId++

    console.log('[Manager] Sending message to worker, id:', id, 'type:', type)

    const handler = (event: MessageEvent) => {
      console.log('[Manager] Received message from worker:', event.data)
      if (event.data.id === id) {
        console.log('[Manager] Message ID matches, resolving')
        worker.removeEventListener('message', handler)
        if (event.data.error) {
          reject(new Error(event.data.error))
        } else {
          resolve(event.data.result)
        }
      }
    }

    worker.addEventListener('message', handler)

    // Add error handler
    worker.addEventListener('error', (error) => {
      console.error('[Manager] Worker error event:', error)
      console.error('[Manager] Worker error message:', error.message)
      console.error('[Manager] Worker error filename:', error.filename)
      console.error('[Manager] Worker error lineno:', error.lineno)
      reject(new Error(`Worker error: ${error.message} at ${error.filename}:${error.lineno}`))
    })

    worker.addEventListener('messageerror', (error) => {
      console.error('[Manager] Worker message error:', error)
      reject(new Error('Worker message error'))
    })

    try {
      // Pass transferables as second argument to transfer ArrayBuffers instead of cloning
      worker.postMessage({ id, type, data }, transferables)
      console.log('[Manager] Message posted successfully')
    } catch (error) {
      console.error('[Manager] Error posting message:', error)
      reject(error)
    }
  })
}

/**
 * Image worker API
 */
export const imageWorker = {
  async ping(): Promise<'pong'> {
    return sendToWorker<'pong'>('ping', {})
  },

  async convert(file: File, opts: ImageConvertOpts): Promise<ImageConvertResult> {
    console.log('[Manager] Converting file:', file.name, 'with opts:', opts)
    const arrayBuffer = await file.arrayBuffer()
    console.log('[Manager] ArrayBuffer size:', arrayBuffer.byteLength)
    // Use toRaw to convert Vue reactive proxy to plain object
    const plainOpts = toRaw(opts)
    console.log('[Manager] Plain opts:', plainOpts)
    // Transfer ArrayBuffer to worker (zero-copy)
    const result = await sendToWorker<ImageConvertResult>(
      'convert',
      { buffer: arrayBuffer, opts: plainOpts },
      [arrayBuffer] // Transfer the ArrayBuffer
    )
    console.log('[Manager] Conversion result:', result)
    return result
  },

  async batch(files: File[], opts: ImageConvertOpts): Promise<ImageConvertResult[]> {
    const results: ImageConvertResult[] = []
    for (const file of files) {
      const result = await this.convert(file, opts)
      results.push(result)
    }
    return results
  }
}

/**
 * Terminate image worker
 */
export function terminateImageWorker(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
}
