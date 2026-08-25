import { describe, it, expect } from 'vitest'
import { encode, decode } from './local-tiff'

function createImageData(width: number, height: number): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      data[idx] = x * 50
      data[idx + 1] = y * 50
      data[idx + 2] = 128
      data[idx + 3] = 255
    }
  }
  return { data, width, height }
}

describe('TIFF encode/decode', () => {
  it('round-trips image data', async () => {
    const image = createImageData(3, 2)
    const buffer = await encode(image)
    expect(buffer.byteLength).toBeGreaterThan(0)

    const decoded = await decode(buffer)
    expect(decoded.width).toBe(image.width)
    expect(decoded.height).toBe(image.height)
    expect(Array.from(decoded.data)).toEqual(Array.from(image.data))
  })
})
