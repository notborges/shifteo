import type { JSquashImageData } from './index'

function decode(buffer: ArrayBuffer): Promise<JSquashImageData> {
  const view = new DataView(buffer)
  if (view.getUint8(0) !== 0x42 || view.getUint8(1) !== 0x4D) {
    return Promise.reject(new Error('Not a BMP file'))
  }

  const dataOffset = view.getUint32(10, true)
  const dibHeaderSize = view.getUint32(14, true)
  if (dibHeaderSize < 40) {
    return Promise.reject(new Error('Unsupported BMP header size'))
  }

  const width = view.getInt32(18, true)
  let height = view.getInt32(22, true)
  const topDown = height < 0
  const absHeight = Math.abs(height)
  const planes = view.getUint16(26, true)
  const bitsPerPixel = view.getUint16(28, true)
  const compression = view.getUint32(30, true)

  if (planes !== 1) {
    return Promise.reject(new Error('Unsupported BMP planes'))
  }
  if (compression !== 0) {
    return Promise.reject(new Error('Compressed BMP not supported'))
  }
  if (bitsPerPixel !== 24 && bitsPerPixel !== 32) {
    return Promise.reject(new Error('Only 24-bit and 32-bit BMP images are supported'))
  }

  const rowSize = Math.floor((bitsPerPixel * Math.abs(width) + 31) / 32) * 4
  const pixelData = new Uint8ClampedArray(Math.abs(width) * absHeight * 4)

  let srcOffset = dataOffset
  for (let row = 0; row < absHeight; row++) {
    const destRow = topDown ? row : absHeight - 1 - row
    for (let col = 0; col < Math.abs(width); col++) {
      const destIdx = (destRow * Math.abs(width) + col) * 4
      const pixelIdx = srcOffset + col * (bitsPerPixel / 8)
      const blue = view.getUint8(pixelIdx)
      const green = view.getUint8(pixelIdx + 1)
      const red = view.getUint8(pixelIdx + 2)
      const alpha = bitsPerPixel === 32 ? view.getUint8(pixelIdx + 3) : 255

      pixelData[destIdx] = red
      pixelData[destIdx + 1] = green
      pixelData[destIdx + 2] = blue
      pixelData[destIdx + 3] = alpha
    }
    srcOffset += rowSize
  }

  return Promise.resolve({
    data: pixelData,
    width: Math.abs(width),
    height: absHeight
  })
}

function encode(imageData: JSquashImageData): Promise<ArrayBuffer> {
  const { width, height, data } = imageData
  const rowSize = width * 4
  const imageSize = rowSize * height
  const fileSize = 14 + 40 + imageSize

  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4D)
  view.setUint32(2, fileSize, true)
  view.setUint32(6, 0, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // bottom-up
  view.setUint16(26, 1, true)
  view.setUint16(28, 32, true)
  view.setUint32(30, 0, true)
  view.setUint32(34, imageSize, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)
  view.setUint32(46, 0, true)
  view.setUint32(50, 0, true)

  let offset = 54
  for (let row = height - 1; row >= 0; row--) {
    const rowOffset = row * rowSize
    for (let col = 0; col < width; col++) {
      const idx = rowOffset + col * 4
      const red = data[idx]
      const green = data[idx + 1]
      const blue = data[idx + 2]
      const alpha = data[idx + 3]

      view.setUint8(offset++, blue)
      view.setUint8(offset++, green)
      view.setUint8(offset++, red)
      view.setUint8(offset++, alpha)
    }
  }

  return Promise.resolve(buffer)
}

export { decode, encode }
