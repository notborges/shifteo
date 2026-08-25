// HEIC/HEIF is supported as an input format only.

interface HeifImage {
  get_width(): number
  get_height(): number
  display(imageData: ImageData, callback: (result: ImageData | null) => void): void
}

interface HeifDecoder {
  decode(buffer: ArrayBuffer): HeifImage[]
}

interface LibHeif {
  HeifDecoder: new () => HeifDecoder
}

let libheif: LibHeif | null = null
let loadingPromise: Promise<LibHeif> | null = null

async function loadLibHeif(): Promise<LibHeif> {
  if (libheif) return libheif

  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const module = await import('libheif-js')
    libheif = module.default || module
    return libheif!
  })()

  return loadingPromise
}

export async function decode(buffer: ArrayBuffer): Promise<ImageData> {
  const heif = await loadLibHeif()

  const decoder = new heif.HeifDecoder()
  const images = decoder.decode(buffer)

  if (!images || images.length === 0) {
    throw new Error('No images found in HEIC file')
  }

  const image = images[0]!
  const width = image.get_width()
  const height = image.get_height()

  const imageData = new ImageData(width, height)

  return new Promise((resolve, reject) => {
    try {
      image.display(imageData, (result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('HEIC decode failed'))
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}
