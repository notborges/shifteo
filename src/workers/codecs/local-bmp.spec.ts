import { describe, it, expect } from 'vitest'
import { encode, decode } from './local-bmp'
import type { JSquashImageData } from './index'

describe('BMP encode/decode', () => {
  it('encodes and decodes round trip', async () => {
    const input: JSquashImageData = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 128,
        0, 0, 255, 64,
        255, 255, 255, 0
      ])
    }
    const buffer = await encode(input)
    expect(buffer.byteLength).toBeGreaterThan(0)

    const decoded = await decode(buffer)
    expect(decoded.width).toBe(2)
    expect(decoded.height).toBe(2)
    expect(Array.from(decoded.data)).toEqual(Array.from(input.data))
  })
})
