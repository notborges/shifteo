import { PDFDocument, degrees } from '@pdfme/pdf-lib'

export interface OrganizeResult {
  document: PDFDocument
  order: number[]
}

export async function buildOrganizedDocument(
  source: PDFDocument,
  requestedOrder: number[] | undefined,
  rotations: Record<number, number> = {}
): Promise<OrganizeResult> {
  const pageCount = source.getPageCount()
  const rawOrder = Array.isArray(requestedOrder) && requestedOrder.length > 0
    ? requestedOrder
    : Array.from({ length: pageCount }, (_, index) => index + 1)

  const uniqueOrder = Array.from(new Set(rawOrder))
    .map(page => Math.min(Math.max(1, Math.floor(page)), pageCount))
    .filter(page => page >= 1 && page <= pageCount)

  if (!uniqueOrder.length) {
    throw new Error('No pages selected for output')
  }

  const output = await PDFDocument.create()

  for (const pageNumber of uniqueOrder) {
    const index = pageNumber - 1
    const [copied] = await output.copyPages(source, [index])
    if (!copied) {
      throw new Error(`Failed to copy page ${pageNumber}`)
    }
    const rotation = rotations[pageNumber]
    if (typeof rotation === 'number') {
      const normalized = ((rotation % 360) + 360) % 360
      copied.setRotation(degrees(normalized))
    }
    output.addPage(copied)
  }

  return {
    document: output,
    order: uniqueOrder
  }
}
