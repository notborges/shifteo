import type { DocTask } from '@/workers/types'

interface DocTaskDescriptor {
  label: string
  defaultExtension: string
  summarize: (task: DocTask) => string
}

const DOC_TASKS: Record<DocTask['kind'], DocTaskDescriptor> = {
  docx_to_html: {
    label: 'DOCX to HTML',
    defaultExtension: 'html',
    summarize: () => 'DOCX → HTML export'
  },
  html_to_pdf: {
    label: 'HTML to PDF',
    defaultExtension: 'pdf',
    summarize: (task) => {
      const margin = task.kind === 'html_to_pdf' ? task.options?.margin ?? 20 : 20
      const paper = task.kind === 'html_to_pdf' ? task.options?.page ?? 'A4' : 'A4'
      return `HTML → PDF (${paper}, ${margin}mm margin)`
    }
  },
  pdf_to_images: {
    label: 'PDF to Images',
    defaultExtension: 'png',
    summarize: (task) => {
      const dpi = task.kind === 'pdf_to_images' ? task.dpi ?? 150 : 150
      const range = task.kind === 'pdf_to_images' ? task.pageRange : undefined
      if (range) {
        return `PDF → Images (${dpi}dpi, pages ${range.start}–${range.end})`
      }
      return `PDF → Images (${dpi}dpi, all pages)`
    }
  },
  pdf_merge: {
    label: 'Merge PDFs',
    defaultExtension: 'pdf',
    summarize: () => 'Merge PDF documents'
  },
  pdf_split: {
    label: 'Split PDF',
    defaultExtension: 'pdf',
    summarize: (task) => {
      const pages = task.kind === 'pdf_split' && Array.isArray(task.pages) && task.pages.length > 0
        ? task.pages.join(', ')
        : 'all pages'
      return `Split PDF (${pages})`
    }
  },
  pdf_compress: {
    label: 'Compress PDF',
    defaultExtension: 'pdf',
    summarize: (task) => {
      const preset = task.kind === 'pdf_compress' ? task.preset ?? 'balanced' : 'balanced'
      return `Compress PDF (${preset})`
    }
  },
  pdf_organize: {
    label: 'Organize PDF',
    defaultExtension: 'pdf',
    summarize: (task) => {
      const pageCount = task.kind === 'pdf_organize' && task.order ? task.order.length : 0
      return pageCount > 0 ? `Organize PDF (${pageCount} pages)` : 'Organize PDF'
    }
  }
}

export function describeDocTask(task: DocTask): string {
  return DOC_TASKS[task.kind].summarize(task)
}

export function docTaskLabel(task: DocTask): string {
  return DOC_TASKS[task.kind].label
}

export function docTaskDefaultExtension(task: DocTask): string {
  return DOC_TASKS[task.kind].defaultExtension
}

export function docTaskSummaryList(tasks: DocTask[]): string[] {
  return tasks.map(describeDocTask)
}
