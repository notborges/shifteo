declare module 'libheif-js' {
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

  const libheif: LibHeif
  export default libheif
}
