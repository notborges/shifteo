import type { FilterPreset } from '@/constants/image'
import type { ImageAdjustments } from '../types'
import type { JSquashImageData } from './index'

interface PhotonImage {
  get_width(): number
  get_height(): number
  get_raw_pixels(): Uint8Array
  free(): void
}

interface PhotonImageConstructor {
  new (raw_pixels: Uint8Array, width: number, height: number): PhotonImage
}

interface PhotonModule {
  PhotonImage: PhotonImageConstructor
  adjust_brightness: (img: PhotonImage, brightness: number) => void
  adjust_contrast: (img: PhotonImage, contrast: number) => void
  saturate_hsl: (img: PhotonImage, level: number) => void
  sharpen: (img: PhotonImage) => void
  grayscale: (img: PhotonImage) => void
  sepia: (img: PhotonImage) => void
  tint: (img: PhotonImage, r: number, g: number, b: number) => void
}

import photonWasmUrl from '@silvia-odwyer/photon/photon_rs_bg.wasm?url'

let photonModule: PhotonModule | null = null
let loadingPromise: Promise<PhotonModule> | null = null

export async function loadPhoton(): Promise<PhotonModule> {
  if (photonModule) return photonModule

  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const photon = await import('@silvia-odwyer/photon')
    // Photon must be initialized with the bundled WASM URL in a worker.
    if (typeof photon.default === 'function') {
      await photon.default({ module_or_path: photonWasmUrl })
    }
    photonModule = photon as unknown as PhotonModule
    return photonModule
  })()

  return loadingPromise
}

export async function applyAdjustments(
  imageData: JSquashImageData,
  adjustments: ImageAdjustments
): Promise<JSquashImageData> {
  const { brightness = 0, contrast = 0, saturation = 0, sharpness = 0 } = adjustments

  if (brightness === 0 && contrast === 0 && saturation === 0 && sharpness === 0) {
    return imageData
  }

  const photon = await loadPhoton()
  const { width, height, data } = imageData

  const expectedLength = width * height * 4
  if (data.length !== expectedLength) {
    console.warn(`[Photon] Data length mismatch: got ${data.length}, expected ${expectedLength}`)
    return imageData
  }

  // Photon requires a Uint8Array rather than a Uint8ClampedArray.
  const rawData = new Uint8Array(data.length)
  rawData.set(data)

  const img = new photon.PhotonImage(rawData, width, height)

  try {
    if (brightness !== 0) {
      photon.adjust_brightness(img, brightness)
    }

    if (contrast !== 0) {
      photon.adjust_contrast(img, contrast)
    }

    if (saturation !== 0) {
      photon.saturate_hsl(img, saturation)
    }

    if (sharpness > 0) {
      const iterations = Math.ceil(sharpness / 25)
      for (let i = 0; i < iterations; i++) {
        photon.sharpen(img)
      }
    }

    const processedPixels = img.get_raw_pixels()
    const newData = new Uint8ClampedArray(processedPixels) as Uint8ClampedArray<ArrayBuffer>

    return {
      width,
      height,
      data: newData
    }
  } finally {
    img.free()
  }
}

export async function applyFilter(
  imageData: JSquashImageData,
  filter: FilterPreset
): Promise<JSquashImageData> {
  if (filter === 'none') {
    return imageData
  }

  const photon = await loadPhoton()
  const { width, height, data } = imageData

  const expectedLength = width * height * 4
  if (data.length !== expectedLength) {
    console.warn(`[Photon] Filter data length mismatch: got ${data.length}, expected ${expectedLength}`)
    return imageData
  }

  const rawData = new Uint8Array(data.length)
  rawData.set(data)

  const img = new photon.PhotonImage(rawData, width, height)

  try {
    switch (filter) {
      case 'grayscale':
        photon.grayscale(img)
        break
      case 'sepia':
        photon.sepia(img)
        break
      case 'vintage':
        // Warm, faded look: reduce saturation, add warmth, reduce contrast
        photon.saturate_hsl(img, -20)
        photon.tint(img, 30, 15, 0) // Warm tint
        photon.adjust_contrast(img, -15)
        break
      case 'cool':
        // Blue tint
        photon.tint(img, -10, 0, 20)
        break
      case 'warm':
        // Orange/amber tint
        photon.tint(img, 25, 10, -10)
        break
      case 'dramatic':
        // High contrast black & white
        photon.grayscale(img)
        photon.adjust_contrast(img, 50)
        break
      case 'fade':
        // Lifted blacks, reduced contrast
        photon.adjust_contrast(img, -25)
        photon.adjust_brightness(img, 10)
        break
      case 'vivid':
        // Increased saturation and contrast
        photon.saturate_hsl(img, 30)
        photon.adjust_contrast(img, 15)
        break
    }

    const processedPixels = img.get_raw_pixels()
    const newData = new Uint8ClampedArray(processedPixels) as Uint8ClampedArray<ArrayBuffer>

    return {
      width,
      height,
      data: newData
    }
  } finally {
    img.free()
  }
}
