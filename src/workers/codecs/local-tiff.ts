import type { JSquashImageData } from './index'

type UtifModule = typeof import('utif')['default']

let utifModulePromise: Promise<UtifModule> | null = null
let UTIF: UtifModule | null = null

async function ensureUTIF() {
  if (!utifModulePromise) {
    utifModulePromise = import('utif').then(mod => mod.default)
  }
  if (!UTIF) {
    UTIF = await utifModulePromise
  }
}

export async function decode(buffer: ArrayBuffer, pageIndex = 0): Promise<JSquashImageData> {
  await ensureUTIF()
  const utif = UTIF!

  const ifds = utif.decode(buffer)
  if (!ifds || ifds.length === 0) {
    throw new Error('TIFF image contains no IFDs')
  }

  const index = Math.max(0, Math.min(pageIndex, ifds.length - 1))
  const selectedIFD = ifds[index]!
  utif.decodeImage(buffer, selectedIFD)
  const rgba = utif.toRGBA8(selectedIFD)

  const width = selectedIFD.width ?? selectedIFD.t256?.[0]
  const height = selectedIFD.height ?? selectedIFD.t257?.[0]

  if (!width || !height) {
    throw new Error('Unable to determine TIFF dimensions')
  }

  return {
    data: new Uint8ClampedArray(rgba),
    width,
    height
  }
}

export async function encode(imageData: JSquashImageData): Promise<ArrayBuffer> {
  await ensureUTIF()

  const rgba = Uint8Array.from(imageData.data)

  const buffer = UTIF!.encodeImage(rgba, imageData.width, imageData.height)
  return buffer instanceof ArrayBuffer ? buffer : Uint8Array.from(buffer).buffer
}
