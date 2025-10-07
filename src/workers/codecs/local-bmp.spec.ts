import { describe, it, expect } from 'vitest'
import { encode, decode } from './local-bmp'
import type { JSquashImageData } from './index'

function createImageData(width: number, height: number, fill: [number, number, number, number]): JSquashImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    data[idx] = fill[0]
    data[idx + 1] = fill[1]
    data[idx + 2] = fill[2]
    data[idx + 3] = fill[3]
  }
  return { data, width, height }
}

describe('BMP encode/decode', () => {
  it('encodes and decodes round trip', async () => {
    const input = createImageData(2, 2, [255, 128, 64, 255])
    const buffer = await encode(input)
    expect(buffer.byteLength).toBeGreaterThan(0)

    const decoded = await decode(buffer)
    expect(decoded.width).toBe(2)
    expect(decoded.height).toBe(2)
    expect(Array.from(decoded.data)).toEqual(Array.from(input.data))
  })
})
