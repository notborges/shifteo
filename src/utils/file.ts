// File manipulation and download utilities

/**
 * Trigger file download in browser
 */
export async function downloadFile(blob: Blob, filename: string): Promise<void> {
  // Try File System Access API first (better UX)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'File',
          accept: { [blob.type]: [`.${filename.split('.').pop()}`] },
        }],
      })

      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      // User cancelled or API not available, fall through to legacy method
      if ((error as any).name !== 'AbortError') {
        console.warn('File System Access API failed, falling back to download:', error)
      }
    }
  }

  // Fallback: traditional download link
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'

  document.body.appendChild(a)
  a.click()

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Download multiple files as a ZIP (using JSZip library if needed)
 * For MVP, we'll download them individually with a delay
 */
export async function downloadMultipleFiles(
  files: Array<{ blob: Blob; filename: string }>,
  delay: number = 300
): Promise<void> {
  for (const { blob, filename } of files) {
    await downloadFile(blob, filename)
    // Small delay to avoid browser blocking multiple downloads
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

/**
 * Download multiple files as a ZIP archive
 */
export async function downloadAsZip(
  files: Array<{ blob: Blob; filename: string }>,
  zipFilename: string = 'shifteo-export.zip'
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // Add all files to ZIP
  for (const { blob, filename } of files) {
    zip.file(filename, blob)
  }

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  // Download the ZIP
  await downloadFile(zipBlob, zipFilename)
}

/**
 * Read file as ArrayBuffer
 */
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Read file as Data URL
 */
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Read file as Text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Create a File object from Blob
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type })
}

/**
 * Validate file before processing
 */
export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateFile(
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): FileValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${(options.maxSize / 1024 / 1024).toFixed(2)}MB)`)
  }

  // Check MIME type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`)
  }

  // Check file extension
  if (options.allowedExtensions) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !options.allowedExtensions.includes(ext)) {
      errors.push(`File extension .${ext} is not supported`)
    }
  }

  // Warn if file name is very long
  if (file.name.length > 255) {
    warnings.push('File name is very long and may cause issues')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Generate unique ID for tracking
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

/**
 * Generate thumbnail from image file
 */
export async function generateThumbnail(
  file: File,
  size: number = 48
): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Calculate crop to square (center crop)
    const sourceSize = Math.min(bitmap.width, bitmap.height)
    const sourceX = (bitmap.width - sourceSize) / 2
    const sourceY = (bitmap.height - sourceSize) / 2

    ctx.drawImage(
      bitmap,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, size, size
    )

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Failed to generate thumbnail:', error)
    return null
  }
}
