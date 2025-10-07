import { describe, it, expect } from 'vitest'
import {
  inferOriginalImageFormat,
  inferProcessingFormat,
  generateOutputFilename
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

  it('infers processing format with SVG fallback', () => {
    expect(inferProcessingFormat(fakeFile('picture.jpeg'))).toBe('jpeg')
    expect(inferProcessingFormat(fakeFile('vector.svg'))).toBe('png')
    expect(inferProcessingFormat(fakeFile('no-ext', 'image/webp'))).toBe('webp')
  })

  it('generates filenames with dimensions when provided', () => {
    const filename = generateOutputFilename('photo.png', 'webp', '${name}-${w}x${h}.${ext}', {
      width: 1920,
      height: 1080
    })
    expect(filename).toBe('photo-1920x1080.webp')
  })
})
