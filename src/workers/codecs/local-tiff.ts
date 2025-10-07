import type { JSquashImageData } from './index'

let utifModulePromise: Promise<any> | null = null
let UTIF: any

async function ensureUTIF() {
  if (!utifModulePromise) {
    utifModulePromise = import('utif').then(mod => mod.default ?? mod)
  }
  if (!UTIF) {
    UTIF = await utifModulePromise
  }
}

export async function decode(buffer: ArrayBuffer): Promise<JSquashImageData> {
  await ensureUTIF()

  const ifds = UTIF.decode(buffer)
  if (!ifds || ifds.length === 0) {
    throw new Error('TIFF image contains no IFDs')
  }

  const firstIFD = ifds[0]
  UTIF.decodeImage(buffer, firstIFD)
  const rgba = UTIF.toRGBA8(firstIFD)

  const width = firstIFD.width ?? firstIFD.t256?.[0]
  const height = firstIFD.height ?? firstIFD.t257?.[0]

  if (!width || !height) {
    throw new Error('Unable to determine TIFF dimensions')
  }

  return {
    data: rgba,
    width,
    height
  }
}

export async function encode(imageData: JSquashImageData): Promise<ArrayBuffer> {
  await ensureUTIF()

  const rgba = imageData.data instanceof Uint8ClampedArray
    ? imageData.data
    : new Uint8ClampedArray(imageData.data)

  const buffer = UTIF.encodeImage(rgba, imageData.width, imageData.height)
  return buffer instanceof ArrayBuffer ? buffer : buffer.buffer
}
