// IndexedDB utilities for settings and temp storage

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings } from '@/workers/types'

interface ShifteoDB extends DBSchema {
  settings: {
    key: string
    value: any
  }
  tempFiles: {
    key: string
    value: {
      id: string
      blob: Blob | File
      createdAt: number
      metadata?: {
        filename?: string
        type?: string
        originalDimensions?: { width: number; height: number }
        thumbnailBlob?: Blob
      }
    }
    indexes: { 'createdAt': number }
  }
}

const DB_NAME = 'shifteo-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<ShifteoDB> | null = null

/**
 * Initialize and get database instance
 */
async function getDB(): Promise<IDBPDatabase<ShifteoDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<ShifteoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }

      // Create temp files store with TTL index
      if (!db.objectStoreNames.contains('tempFiles')) {
        const tempStore = db.createObjectStore('tempFiles', { keyPath: 'id' })
        tempStore.createIndex('createdAt', 'createdAt')
      }
    },
  })

  return dbInstance
}

// === Settings Management ===

const DEFAULT_SETTINGS: AppSettings = {
  defaultImageFormat: 'webp',
  defaultImageQuality: 0.85,
  stripExifByDefault: true,
  defaultPdfPaperSize: 'A4',
  defaultPdfMargin: 20,
  defaultPdfDpi: 150,
  outputNamingPattern: '${name}.${ext}',
  darkMode: true,
  showPreview: true,
}

/**
 * Get app settings
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const db = await getDB()
    const stored = await db.get('settings', 'app-settings')
    return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS
  } catch (error) {
    console.error('Failed to get settings:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Save app settings
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const db = await getDB()
    const current = await getSettings()
    const updated = { ...current, ...settings }
    await db.put('settings', updated, 'app-settings')
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  try {
    const db = await getDB()
    await db.put('settings', DEFAULT_SETTINGS, 'app-settings')
  } catch (error) {
    console.error('Failed to reset settings:', error)
    throw error
  }
}

// === Temp File Storage ===

/**
 * Store a temporary blob
 */
export async function storeTempBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB()
    await db.put('tempFiles', {
      id,
      blob,
      createdAt: Date.now(),
    })
  } catch (error) {
    console.error('Failed to store temp blob:', error)
    throw error
  }
}

/**
 * Retrieve a temporary blob
 */
export async function getTempBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getDB()
    const record = await db.get('tempFiles', id)
    return record?.blob ?? null
  } catch (error) {
    console.error('Failed to get temp blob:', error)
    return null
  }
}

/**
 * Delete a temporary blob
 */
export async function deleteTempBlob(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('tempFiles', id)
  } catch (error) {
    console.error('Failed to delete temp blob:', error)
  }
}

/**
 * Clean up old temporary files (older than TTL milliseconds)
 */
export async function cleanupOldTempFiles(ttlMs: number = 24 * 60 * 60 * 1000): Promise<number> {
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

/**
 * Clear all temporary files
 */
export async function clearAllTempFiles(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear('tempFiles')
  } catch (error) {
    console.error('Failed to clear temp files:', error)
    throw error
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  tempFilesCount: number
  tempFilesSize: number
}> {
  try {
    const db = await getDB()
    const tempFiles = await db.getAll('tempFiles')

    const tempFilesSize = tempFiles.reduce((sum, record) => sum + record.blob.size, 0)

    return {
      tempFilesCount: tempFiles.length,
      tempFilesSize,
    }
  } catch (error) {
    console.error('Failed to get storage stats:', error)
    return {
      tempFilesCount: 0,
      tempFilesSize: 0,
    }
  }
}

// === Queue Persistence ===

/**
 * Store queue job for persistence (options not saved - they come from current UI)
 */
export async function storeQueueJob(job: {
  id: string
  file: File
  originalDimensions?: { width: number; height: number }
  thumbnailBlob?: Blob
}): Promise<void> {
  try {
    const db = await getDB()
    await db.put('tempFiles', {
      id: job.id,
      blob: job.file,
      createdAt: Date.now(),
      metadata: {
        filename: job.file.name,
        type: job.file.type,
        originalDimensions: job.originalDimensions,
        thumbnailBlob: job.thumbnailBlob
      }
    })
  } catch (error) {
    if ((error as any).name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, skipping persistence')
    } else {
      console.error('Failed to store queue job:', error)
    }
  }
}

/**
 * Restore all queue jobs from IndexedDB (options not restored - they come from current UI)
 */
export async function restoreQueueJobs(): Promise<Array<{
  id: string
  file: File
  originalDimensions?: { width: number; height: number }
  thumbnailUrl?: string
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
        thumbnailUrl
      }
    })
  } catch (error) {
    console.error('Failed to restore queue:', error)
    return []
  }
}

/**
 * Remove specific job from storage
 */
export async function removeQueueJob(id: string): Promise<void> {
  try {
    console.log('[IDB] Removing job:', id)
    const db = await getDB()
    const tx = db.transaction('tempFiles', 'readwrite')
    await tx.store.delete(id)
    await tx.done
    console.log('[IDB] Job removed and transaction committed')
  } catch (error) {
    console.error('[IDB] Failed to remove queue job:', error)
    throw error
  }
}

/**
 * Remove multiple jobs from storage (batch operation)
 */
export async function removeMultipleQueueJobs(ids: string[]): Promise<void> {
  try {
    console.log('[IDB] Removing multiple jobs:', ids.length)
    const db = await getDB()
    const tx = db.transaction('tempFiles', 'readwrite')

    for (const id of ids) {
      await tx.store.delete(id)
    }

    await tx.done
    console.log('[IDB] Batch removal complete')
  } catch (error) {
    console.error('[IDB] Batch removal failed:', error)
    throw error
  }
}
