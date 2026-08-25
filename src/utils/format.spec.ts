import { describe, it, expect } from 'vitest'
import {
  inferOriginalImageFormat,
  generateOutputFilename,
  isFormatSupported
} from './format'

function fakeFile(name: string, type = ''): File {
  return { name, type } as unknown as File
}

describe('format utilities', () => {
  it('infers original format from filename', () => {
    expect(inferOriginalImageFormat(fakeFile('photo.JPG'))).toBe('jpeg')
    expect(inferOriginalImageFormat(fakeFile('icon.png'))).toBe('png')
    expect(inferOriginalImageFormat(fakeFile('vector.svg', 'image/svg+xml'))).toBe('svg')
    expect(inferOriginalImageFormat(fakeFile('scan.tiff'))).toBe('tiff')
    expect(inferOriginalImageFormat(fakeFile('favicon.ico', 'image/x-icon'))).toBe('ico')
    expect(inferOriginalImageFormat(fakeFile('unknown.bin'))).toBeNull()
  })

  it('checks supported formats using MIME type or extension', () => {
    expect(isFormatSupported(fakeFile('photo', 'image/jpeg'))).toBe(true)
    expect(isFormatSupported(fakeFile('photo.webp'))).toBe(true)
    expect(isFormatSupported(fakeFile('document.pdf', 'application/pdf'))).toBe(false)
  })

  it('generates output filenames', () => {
    expect(generateOutputFilename('photo.png', 'webp')).toBe('photo.webp')
  })
})
