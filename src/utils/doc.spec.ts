import { describe, it, expect } from 'vitest'
import {
  describeDocTask,
  docTaskDefaultExtension,
  docTaskSummaryList,
  docTaskLabel
} from './doc'

describe('doc utilities', () => {
  it('summarises html to pdf with options', () => {
    const summary = describeDocTask({ kind: 'html_to_pdf', options: { margin: 10, page: 'Letter' } })
    expect(summary).toContain('Letter')
    expect(summary).toContain('10')
  })

  it('returns sensible default extension', () => {
    expect(docTaskDefaultExtension({ kind: 'docx_to_html' })).toBe('html')
    expect(docTaskDefaultExtension({ kind: 'pdf_merge' })).toBe('pdf')
  })

  it('produces list summaries', () => {
    const summaries = docTaskSummaryList([
      { kind: 'pdf_to_images', dpi: 72 },
      { kind: 'pdf_split', pages: [1, 3] }
    ])
    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toContain('72')
  })

  it('returns labels for tasks', () => {
    expect(docTaskLabel({ kind: 'pdf_to_images' })).toBe('PDF to Images')
  })
})
