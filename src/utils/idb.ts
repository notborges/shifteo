import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { TEMP_FILE_TTL_MS } from '@/constants/storage'

interface SessionState {
  phase: 'ready' | 'shifting' | 'done'
  recipe: {
    format: string | null
    resize: number | null
    cropAspect: string | null
    brightness: number
    contrast: number
    saturation: number
    sharpness: number
    filter: string | null
    rotate: number | null
    flipH: boolean
    flipV: boolean
  }
  activeImageIndex: number
}

interface ShifteoDB extends DBSchema {
  session: {
    key: string
    value: SessionState
  }
  tempFiles: {
    key: string
    value: {
      id: string
      blob: Blob | File
      // Keep result blobs at the top level; nested blobs are not restored reliably.
      resultBlob?: Blob
      createdAt: number
      metadata?: {
        filename?: string
        type?: string
        originalDimensions?: { width: number; height: number }
        thumbnailBlob?: Blob
        outputDimensions?: { width: number; height: number }
        outputFormat?: string
        status?: string
      }
    }
    indexes: { 'createdAt': number }
  }
}

const DB_NAME = 'shifteo-storage'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<ShifteoDB> | null = null

async function getDB(): Promise<IDBPDatabase<ShifteoDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<ShifteoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session')
      }

      if (!db.objectStoreNames.contains('tempFiles')) {
        const tempStore = db.createObjectStore('tempFiles', { keyPath: 'id' })
        tempStore.createIndex('createdAt', 'createdAt')
      }
    },
  })

  return dbInstance
}

export async function cleanupOldTempFiles(ttlMs: number = TEMP_FILE_TTL_MS): Promise<number> {
  try {
    const db = await getDB()
    const cutoff = Date.now() - ttlMs
    const tx = db.transaction('tempFiles', 'readwrite')
    const index = tx.store.index('createdAt')

    let deleted = 0
    for await (const cursor of index.iterate()) {
      if (cursor.value.createdAt < cutoff) {
        await cursor.delete()
        deleted++
      }
    }

    await tx.done
    return deleted
  } catch (error) {
    console.error('Failed to cleanup temp files:', error)
    return 0
  }
}

export async function clearAllTempFiles(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear('tempFiles')
  } catch (error) {
    console.error('Failed to clear temp files:', error)
    throw error
  }
}

export async function storeSessionState(state: SessionState): Promise<void> {
  try {
    const db = await getDB()
    await db.put('session', state, 'session-state')
  } catch (error) {
    console.error('Failed to store session state:', error)
  }
}

export async function restoreSessionState(): Promise<SessionState | null> {
  try {
    const db = await getDB()
    return (await db.get('session', 'session-state')) as SessionState | undefined ?? null
  } catch (error) {
    console.error('Failed to restore session state:', error)
    return null
  }
}

export async function clearSessionState(): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('session', 'session-state')
  } catch (error) {
    console.error('Failed to clear session state:', error)
  }
}

export async function storeQueueJob(job: {
  id: string
  file: File
  originalDimensions?: { width: number; height: number }
  thumbnailBlob?: Blob
  resultBlob?: Blob
  outputDimensions?: { width: number; height: number }
  outputFormat?: string
  status?: string
}): Promise<void> {
  try {
    const db = await getDB()
    await db.put('tempFiles', {
      id: job.id,
      blob: job.file,
      resultBlob: job.resultBlob,
      createdAt: Date.now(),
      metadata: {
        filename: job.file.name,
        type: job.file.type,
        originalDimensions: job.originalDimensions,
        thumbnailBlob: job.thumbnailBlob,
        outputDimensions: job.outputDimensions,
        outputFormat: job.outputFormat,
        status: job.status
      }
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, skipping persistence')
    } else {
      console.error('Failed to store queue job:', error)
    }
  }
}

export async function restoreQueueJobs(): Promise<Array<{
  id: string
  file: File
  originalDimensions?: { width: number; height: number }
  thumbnailUrl?: string
  resultBlob?: Blob
  outputDimensions?: { width: number; height: number }
  outputFormat?: string
  status?: string
}>> {
  try {
    const db = await getDB()
    const records = await db.getAll('tempFiles')

    return records.map(record => {
      const thumbnailUrl = record.metadata?.thumbnailBlob
        ? URL.createObjectURL(record.metadata.thumbnailBlob)
        : undefined

      return {
        id: record.id,
        file: record.blob as File,
        originalDimensions: record.metadata?.originalDimensions,
        thumbnailUrl,
        resultBlob: record.resultBlob,
        outputDimensions: record.metadata?.outputDimensions,
        outputFormat: record.metadata?.outputFormat,
        status: record.metadata?.status
      }
    })
  } catch (error) {
    console.error('Failed to restore queue:', error)
    return []
  }
}

export async function removeQueueJob(id: string): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction('tempFiles', 'readwrite')
    await tx.store.delete(id)
    await tx.done
  } catch (error) {
    console.error('[IDB] Failed to remove queue job:', error)
    throw error
  }
}
