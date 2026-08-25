export type EncodableFormat = 'png' | 'jpeg' | 'webp'

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength && view.buffer instanceof ArrayBuffer) {
    return view.buffer
  }
  return view.slice().buffer
}

function rebuildFromParts(parts: Uint8Array[]): ArrayBuffer {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let position = 0
  for (const part of parts) {
    output.set(part, position)
    position += part.length
  }
  return toArrayBuffer(output)
}

function stripJpegMetadata(buffer: Uint8Array): ArrayBuffer {
  if (buffer.length < 2) return toArrayBuffer(buffer)

  const parts: Uint8Array[] = [buffer.subarray(0, 2)] // SOI
  let offset = 2

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF || offset + 1 >= buffer.length) {
      parts.push(buffer.subarray(offset))
      break
    }

    const marker = buffer[offset + 1]!

    if (marker === 0xD9 || marker === 0xDA) {
      parts.push(buffer.subarray(offset))
      break
    }

    if (offset + 4 > buffer.length) {
      parts.push(buffer.subarray(offset))
      break
    }

    const segmentLength = (buffer[offset + 2]! << 8) + buffer[offset + 3]!
    const segmentEnd = offset + 2 + segmentLength
    if (segmentEnd > buffer.length) {
      parts.push(buffer.subarray(offset))
      break
    }

    const isExif = marker === 0xE1
    const isIcc = marker === 0xE2

    if (!isExif && !isIcc) {
      parts.push(buffer.subarray(offset, segmentEnd))
    }

    offset = segmentEnd
  }

  return rebuildFromParts(parts)
}

function stripPngMetadata(buffer: Uint8Array): ArrayBuffer {
  if (buffer.length < 8) return toArrayBuffer(buffer)

  const parts: Uint8Array[] = [buffer.subarray(0, 8)]
  let offset = 8

  while (offset + 8 <= buffer.length) {
    const length = (((buffer[offset]! << 24) >>> 0) | (buffer[offset + 1]! << 16) | (buffer[offset + 2]! << 8) | buffer[offset + 3]!) >>> 0
    const type = String.fromCharCode(
      buffer[offset + 4]!,
      buffer[offset + 5]!,
      buffer[offset + 6]!,
      buffer[offset + 7]!
    )
    const chunkTotal = 12 + length
    const chunkEnd = offset + chunkTotal

    if (chunkEnd > buffer.length) {
      parts.push(buffer.subarray(offset))
      break
    }

    const shouldStrip = type === 'eXIf' || type === 'tEXt' || type === 'iTXt' || type === 'zTXt'

    if (!shouldStrip) {
      parts.push(buffer.subarray(offset, chunkEnd))
    }

    offset = chunkEnd

    if (type === 'IEND') {
      parts.push(buffer.subarray(offset))
      break
    }
  }

  return rebuildFromParts(parts)
}

function stripWebpMetadata(buffer: Uint8Array): ArrayBuffer {
  if (buffer.length < 12) {
    return toArrayBuffer(buffer)
  }

  if (String.fromCharCode(buffer[0]!, buffer[1]!, buffer[2]!, buffer[3]!) !== 'RIFF') {
    return toArrayBuffer(buffer)
  }

  const chunks: Uint8Array[] = []
  const header = buffer.slice(0, 12)
  let offset = 12

  while (offset + 8 <= buffer.length) {
    const chunkId = String.fromCharCode(
      buffer[offset]!,
      buffer[offset + 1]!,
      buffer[offset + 2]!,
      buffer[offset + 3]!
    )
    const chunkSize = buffer[offset + 4]! | (buffer[offset + 5]! << 8) | (buffer[offset + 6]! << 16) | (buffer[offset + 7]! << 24)
    const paddedSize = chunkSize + (chunkSize % 2)
    const chunkEnd = offset + 8 + paddedSize

    if (chunkEnd > buffer.length) {
      break
    }

    const shouldStrip = chunkId === 'EXIF' || chunkId === 'XMP ' || chunkId === 'ICCP'

    if (!shouldStrip) {
      chunks.push(buffer.subarray(offset, chunkEnd))
    }

    offset = chunkEnd
  }

  const chunksSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(12 + chunksSize)
  output.set(header, 0)

  const riffSize = chunksSize + 4
  output[4] = riffSize & 0xFF
  output[5] = (riffSize >> 8) & 0xFF
  output[6] = (riffSize >> 16) & 0xFF
  output[7] = (riffSize >> 24) & 0xFF

  let position = 12
  for (const chunk of chunks) {
    output.set(chunk, position)
    position += chunk.length
  }

  return toArrayBuffer(output)
}

export function stripMetadata(buffer: ArrayBuffer, format: EncodableFormat): ArrayBuffer {
  const bytes = new Uint8Array(buffer)

  switch (format) {
    case 'jpeg':
      return stripJpegMetadata(bytes)
    case 'png':
      return stripPngMetadata(bytes)
    case 'webp':
      return stripWebpMetadata(bytes)
    default:
      return buffer
  }
}

export function hasExifChunk(buffer: ArrayBuffer, format: EncodableFormat): boolean {
  const bytes = new Uint8Array(buffer)

  switch (format) {
    case 'jpeg': {
      let offset = 2
      while (offset + 4 <= bytes.length) {
        if (bytes[offset] !== 0xFF) break
        const marker = bytes[offset + 1]!
        if (marker === 0xDA || marker === 0xD9) break
        const segmentLength = (bytes[offset + 2]! << 8) + bytes[offset + 3]!
        const segmentEnd = offset + 2 + segmentLength
        if (segmentEnd > bytes.length) break
        if (marker === 0xE1) {
          return true
        }
        offset = segmentEnd
      }
      return false
    }
    case 'png': {
      let offset = 8
      while (offset + 8 <= bytes.length) {
        const length =
          (((bytes[offset]! << 24) >>> 0) |
            (bytes[offset + 1]! << 16) |
            (bytes[offset + 2]! << 8) |
            bytes[offset + 3]!) >>> 0
        const type = String.fromCharCode(
          bytes[offset + 4]!,
          bytes[offset + 5]!,
          bytes[offset + 6]!,
          bytes[offset + 7]!
        )
        if (type === 'eXIf') return true
        const chunkTotal = 12 + length
        const chunkEnd = offset + chunkTotal
        if (chunkEnd > bytes.length) break
        offset = chunkEnd
        if (type === 'IEND') break
      }
      return false
    }
    case 'webp': {
      let offset = 12
      while (offset + 8 <= bytes.length) {
        const chunkId = String.fromCharCode(
          bytes[offset]!,
          bytes[offset + 1]!,
          bytes[offset + 2]!,
          bytes[offset + 3]!
        )
        const chunkSize =
          bytes[offset + 4]! |
          (bytes[offset + 5]! << 8) |
          (bytes[offset + 6]! << 16) |
          (bytes[offset + 7]! << 24)
        const paddedSize = chunkSize + (chunkSize % 2)
        const chunkEnd = offset + 8 + paddedSize
        if (chunkEnd > bytes.length) break
        if (chunkId === 'EXIF') return true
        offset = chunkEnd
      }
      return false
    }
    default:
      return false
  }
}
