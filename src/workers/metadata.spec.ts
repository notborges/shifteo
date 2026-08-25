import { describe, it, expect } from 'vitest'
import { stripMetadata, hasExifChunk } from './metadata'

function makeJpegWithExif(): ArrayBuffer {
  const data = new Uint8Array([
    0xFF, 0xD8, // SOI
    0xFF, 0xE1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66, // APP1 with "Exif"
    0xFF, 0xDA, // SOS
    0x00, 0x00, 0xFF, 0xD9 // image data + EOI
  ])
  return data.buffer
}

function makePngWithExif(): ArrayBuffer {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const exifChunk = new Uint8Array([
    0x00, 0x00, 0x00, 0x00,
    0x65, 0x58, 0x49, 0x66,
    0x12, 0x34, 0x56, 0x78,
    0x00, 0x00, 0x00, 0x00
  ])
  const iendChunk = new Uint8Array([
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ])
  const buffer = new Uint8Array(signature.length + exifChunk.length + iendChunk.length)
  buffer.set(signature, 0)
  buffer.set(exifChunk, signature.length)
  buffer.set(iendChunk, signature.length + exifChunk.length)
  return buffer.buffer
}

function makeWebpWithExif(): ArrayBuffer {
  const header = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x12, 0x00, 0x00, 0x00, // size placeholder
    0x57, 0x45, 0x42, 0x50 // WEBP
  ])
  const exifChunk = new Uint8Array([
    0x45, 0x58, 0x49, 0x46, // EXIF
    0x04, 0x00, 0x00, 0x00, // size 4
    0x11, 0x22, 0x33, 0x44,
    0x00, 0x00 // padding
  ])
  const vp8Chunk = new Uint8Array([
    0x56, 0x50, 0x38, 0x20, // VP8 
    0x02, 0x00, 0x00, 0x00,
    0xAA, 0xBB
  ])
  const buffer = new Uint8Array(header.length + exifChunk.length + vp8Chunk.length)
  buffer.set(header, 0)
  buffer.set(exifChunk, header.length)
  buffer.set(vp8Chunk, header.length + exifChunk.length)
  return buffer.buffer
}

describe('metadata stripping', () => {
  it('removes EXIF from jpeg buffers', () => {
    const original = makeJpegWithExif()
    expect(hasExifChunk(original, 'jpeg')).toBe(true)
    const stripped = stripMetadata(original, 'jpeg')
    expect(hasExifChunk(stripped, 'jpeg')).toBe(false)
  })

  it('removes EXIF from png buffers', () => {
    const original = makePngWithExif()
    expect(hasExifChunk(original, 'png')).toBe(true)
    const stripped = stripMetadata(original, 'png')
    expect(hasExifChunk(stripped, 'png')).toBe(false)
  })

  it('removes EXIF from webp buffers', () => {
    const original = makeWebpWithExif()
    expect(hasExifChunk(original, 'webp')).toBe(true)
    const stripped = stripMetadata(original, 'webp')
    expect(hasExifChunk(stripped, 'webp')).toBe(false)
  })
})
