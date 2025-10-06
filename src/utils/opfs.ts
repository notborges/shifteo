// Origin Private File System (OPFS) utilities
// OPFS provides fast, private file storage for web apps
// Note: Synchronous access handles are only available in Web Workers

/**
 * Check if OPFS is supported in current browser
 */
export function isOPFSSupported(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage
}

/**
 * Get OPFS root directory
 */
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  if (!isOPFSSupported()) {
    throw new Error('OPFS is not supported in this browser')
  }
  return await navigator.storage.getDirectory()
}

/**
 * Write a blob to OPFS
 */
export async function writeFileToOPFS(
  filename: string,
  blob: Blob,
  directory?: string
): Promise<void> {
  try {
    const root = await getOPFSRoot()

    // Get or create directory if specified
    let targetDir = root
    if (directory) {
      targetDir = await root.getDirectoryHandle(directory, { create: true })
    }

    // Create/overwrite file
    const fileHandle = await targetDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()

    await writable.write(blob)
    await writable.close()
  } catch (error) {
    console.error('Failed to write file to OPFS:', error)
    throw error
  }
}

/**
 * Read a file from OPFS
 */
export async function readFileFromOPFS(
  filename: string,
  directory?: string
): Promise<File | null> {
  try {
    const root = await getOPFSRoot()

    let targetDir = root
    if (directory) {
      targetDir = await root.getDirectoryHandle(directory, { create: false })
    }

    const fileHandle = await targetDir.getFileHandle(filename, { create: false })
    return await fileHandle.getFile()
  } catch (error) {
    if ((error as any).name === 'NotFoundError') {
      return null
    }
    console.error('Failed to read file from OPFS:', error)
    throw error
  }
}

/**
 * Delete a file from OPFS
 */
export async function deleteFileFromOPFS(
  filename: string,
  directory?: string
): Promise<void> {
  try {
    const root = await getOPFSRoot()

    let targetDir = root
    if (directory) {
      targetDir = await root.getDirectoryHandle(directory, { create: false })
    }

    await targetDir.removeEntry(filename)
  } catch (error) {
    if ((error as any).name !== 'NotFoundError') {
      console.error('Failed to delete file from OPFS:', error)
    }
  }
}

/**
 * List files in OPFS directory
 */
export async function listOPFSFiles(directory?: string): Promise<string[]> {
  try {
    const root = await getOPFSRoot()

    let targetDir = root
    if (directory) {
      targetDir = await root.getDirectoryHandle(directory, { create: false })
    }

    const files: string[] = []
    // @ts-ignore - TypeScript doesn't have full FileSystemDirectoryHandle types yet
    for await (const [name, handle] of targetDir.entries()) {
      if (handle.kind === 'file') {
        files.push(name)
      }
    }

    return files
  } catch (error) {
    console.error('Failed to list OPFS files:', error)
    return []
  }
}

/**
 * Clear all files in an OPFS directory
 */
export async function clearOPFSDirectory(directory?: string): Promise<number> {
  try {
    const root = await getOPFSRoot()

    let targetDir = root
    if (directory) {
      try {
        targetDir = await root.getDirectoryHandle(directory, { create: false })
      } catch {
        return 0 // Directory doesn't exist
      }
    }

    let deleted = 0
    // @ts-ignore
    for await (const [name, handle] of targetDir.entries()) {
      if (handle.kind === 'file') {
        await targetDir.removeEntry(name)
        deleted++
      } else if (handle.kind === 'directory') {
        await targetDir.removeEntry(name, { recursive: true })
        deleted++
      }
    }

    return deleted
  } catch (error) {
    console.error('Failed to clear OPFS directory:', error)
    return 0
  }
}

/**
 * Get size of all files in OPFS directory
 */
export async function getOPFSDirectorySize(directory?: string): Promise<number> {
  try {
    const root = await getOPFSRoot()

    let targetDir = root
    if (directory) {
      try {
        targetDir = await root.getDirectoryHandle(directory, { create: false })
      } catch {
        return 0
      }
    }

    let totalSize = 0
    // @ts-ignore
    for await (const [name, handle] of targetDir.entries()) {
      if (handle.kind === 'file') {
        const file = await handle.getFile()
        totalSize += file.size
      }
    }

    return totalSize
  } catch (error) {
    console.error('Failed to get OPFS directory size:', error)
    return 0
  }
}

/**
 * Create a unique temporary filename
 */
export function createTempFilename(prefix: string = 'temp', extension: string = 'tmp'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}_${timestamp}_${random}.${extension}`
}
