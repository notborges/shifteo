declare module 'utif' {
  interface Ifd {
    width?: number
    height?: number
    t256?: number[]
    t257?: number[]
    [key: string]: unknown
  }

  interface UtifModule {
    decode(buffer: ArrayBuffer): Ifd[]
    decodeImage(buffer: ArrayBuffer, ifd: Ifd): void
    toRGBA8(ifd: Ifd): Uint8Array
    encodeImage(data: Uint8Array, width: number, height: number): ArrayBuffer | Uint8Array
  }

  const UTIF: UtifModule
  export default UTIF
}
