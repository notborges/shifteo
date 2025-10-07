import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { encode, decode } from './local-ico'

const require = createRequire(import.meta.url)
const wasmPath = require.resolve('@jsquash/png/codec/pkg/squoosh_png_bg.wasm')

beforeAll(() => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : ''
    if (url.endsWith('squoosh_png_bg.wasm')) {
      const data = await readFile(wasmPath)
      return new Response(data, { status: 200 })
    }
    if (originalFetch) {
      return originalFetch(input as any, init)
    }
    throw new Error(`Unexpected fetch request: ${url}`)
  }

  if (!WebAssembly.instantiateStreaming) {
    WebAssembly.instantiateStreaming = async (source: Response | Promise<Response>, importObject: WebAssembly.Imports) => {
      const response = await source
      const buffer = await response.arrayBuffer()
      return WebAssembly.instantiate(buffer, importObject)
    }
  }
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
  it('round-trips image data for ICO', async () => {
    const image = createTestData(4, 4)
    const icoBuffer = await encode(image)
    expect(icoBuffer.byteLength).toBeGreaterThan(0)

    const decoded = await decode(icoBuffer)
    expect(decoded.width).toBe(image.width)
    expect(decoded.height).toBe(image.height)
    expect(Array.from(decoded.data)).toEqual(Array.from(image.data))
  })
})
