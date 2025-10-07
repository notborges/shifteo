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
      const margin = task.options?.margin ?? 20
      const paper = task.options?.page ?? 'A4'
      return `HTML → PDF (${paper}, ${margin}mm margin)`
    }
  },
  pdf_to_images: {
    label: 'PDF to Images',
    defaultExtension: 'png',
    summarize: (task) => {
      const dpi = task.dpi ?? 150
      const range = task.pageRange
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
      const pages = Array.isArray(task.pages) && task.pages.length > 0
        ? task.pages.join(', ')
        : 'all pages'
      return `Split PDF (${pages})`
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
