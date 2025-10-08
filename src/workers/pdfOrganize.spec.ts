import { describe, expect, it } from 'vitest'
import { PDFDocument } from '@pdfme/pdf-lib'
import { buildOrganizedDocument } from './pdfOrganize'

const rotationAngle = (page: any): number => {
  const rotation = page.getRotation?.()
  if (rotation && typeof rotation.angle === 'number') {
    return rotation.angle
  }
  return 0
}

describe('buildOrganizedDocument', () => {
  it('reorders and rotates pages', async () => {
    const source = await PDFDocument.create()
    source.addPage([200, 200])
    source.addPage([210, 210])
    source.addPage([220, 220])

    const { document, order } = await buildOrganizedDocument(source, [3, 1], { 3: 90 })

    expect(order).toEqual([3, 1])
    expect(document.getPageCount()).toBe(2)

    const first = document.getPage(0)
    expect(first.getWidth()).toBeCloseTo(220)
    expect(rotationAngle(first)).toBe(90)

    const second = document.getPage(1)
    expect(second.getWidth()).toBeCloseTo(200)
    expect(rotationAngle(second)).toBe(0)
  })

  it('defaults to sequential order when none provided', async () => {
    const source = await PDFDocument.create()
    source.addPage([200, 200])
    source.addPage([210, 210])

    const { document, order } = await buildOrganizedDocument(source, undefined, {})

    expect(order).toEqual([1, 2])
    expect(document.getPageCount()).toBe(2)
    expect(document.getPage(0).getWidth()).toBeCloseTo(200)
    expect(document.getPage(1).getWidth()).toBeCloseTo(210)
  })
})
