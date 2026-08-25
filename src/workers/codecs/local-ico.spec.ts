import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { encode, decode } from './local-ico'

const testPath = Bun.fileURLToPath(new URL('./local-ico.spec.ts', import.meta.url))
const wasmPaths = new Map([
  ['squoosh_png_bg.wasm', Bun.resolveSync('@jsquash/png/codec/pkg/squoosh_png_bg.wasm', testPath)],
  ['squoosh_resize_bg.wasm', Bun.resolveSync('@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm', testPath)]
])
const originalFetch = globalThis.fetch

beforeAll(() => {
  const fetchWithWasm = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : ''
    const wasmPath = [...wasmPaths.entries()].find(([filename]) => url.endsWith(filename))?.[1]
    if (wasmPath) {
      const wasmBytes = new Uint8Array(await Bun.file(wasmPath).arrayBuffer())
      return new Response(wasmBytes, {
        status: 200,
        headers: { 'Content-Type': 'application/wasm' }
      })
    }
    return originalFetch(input, init)
  }
  globalThis.fetch = fetchWithWasm as typeof globalThis.fetch
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

function createTestData(width: number, height: number): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      data[idx] = 50 * x
      data[idx + 1] = 60 * y
      data[idx + 2] = 120
      data[idx + 3] = 255
    }
  }
  return { data, width, height }
}

describe('ICO encode/decode', () => {
  it('encodes multiple resolutions and decodes the largest one', async () => {
    const image = createTestData(32, 32)
    const icoBuffer = await encode(image)
    expect(icoBuffer.byteLength).toBeGreaterThan(0)

    const header = new DataView(icoBuffer)
    expect(header.getUint16(0, true)).toBe(0)
    expect(header.getUint16(2, true)).toBe(1)
    expect(header.getUint16(4, true)).toBe(2)

    const decoded = await decode(icoBuffer)
    expect(decoded.width).toBe(image.width)
    expect(decoded.height).toBe(image.height)
    expect(Array.from(decoded.data)).toEqual(Array.from(image.data))
  })
})
