<template>
  <div class="page-shell">
    <div class="page-grid gap-6">
      <UiPanel class="col-span-12">
        <template #header>
          <div class="flex items-center gap-2">
            <FileText :size="16" />
            <span>PDF Toolkit</span>
          </div>
          <span class="panel__meta">High-impact PDF workflows in progress</span>
        </template>
        <div class="space-y-4 body-text text-text-muted">
          <p>
            We are building Shifteo into a full-featured PDF swiss army knife—think a faster, privacy-first iLovePDF.
            Track progress in <code class="mono">docs/pdf-roadmap.md</code> inside this project and let us know which tools to prioritise.
          </p>
          <UiButton to="/licenses" variant="quiet" size="sm">View Dependencies</UiButton>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12">
        <template #header>
          <span class="body-text uppercase tracking-wider text-text-secondary">Core Workflows</span>
        </template>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="operation in operations"
            :key="operation.key"
            class="pdf-card"
          >
            <header class="pdf-card__header">
              <h3 class="pdf-card__title">{{ operation.title }}</h3>
              <span :class="['pdf-card__status', statusTone(operation.status)]">{{ operation.status }}</span>
            </header>
            <p class="pdf-card__description">{{ operation.description }}</p>
            <footer class="pdf-card__footer">
              <UiButton
                type="button"
                size="sm"
                :tone="operation.status === 'In progress' ? 'accent' : 'default'"
                :disabled="operation.disabled"
                @click="handleOperation(operation)"
              >
                {{ operation.disabled ? 'Coming Soon' : operation.cta }}
              </UiButton>
            </footer>
          </article>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12">
        <template #header>
          <div class="flex items-center gap-2">
            <Upload :size="16" />
            <span>Merge PDFs (beta)</span>
          </div>
          <span class="panel__meta">Combine multiple PDFs in any order</span>
        </template>

        <div class="space-y-6">
          <div class="flex flex-wrap gap-3">
            <UiButton type="button" size="sm" :disabled="isMerging" @click="triggerFileDialog">
              Add PDFs
            </UiButton>
            <UiButton
              type="button"
              size="sm"
              variant="quiet"
              tone="warning"
              :disabled="!hasFiles || isMerging"
              @click="resetQueue"
            >
              Clear Queue
            </UiButton>
            <span v-if="hasFiles" class="body-text text-text-muted">
              {{ mergeFiles.length }} file{{ mergeFiles.length === 1 ? '' : 's' }} · {{ formatFileSize(totalSize) }}
            </span>
            <span v-if="lastResultName" class="body-text text-text-secondary">Last output: {{ lastResultName }}</span>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept="application/pdf"
            class="hidden"
            @change="handleFileChange"
          />

          <div
            v-if="mergeFiles.length > 0"
            class="merge-list"
          >
            <p class="merge-list__hint">Drag to reorder. Items merge from top to bottom.</p>
            <div
              v-for="(item, index) in mergeFiles"
              :key="item.id"
              class="merge-item"
              :class="{
                'merge-item--over': dragOverId === item.id,
                'merge-item--dragging': dragSourceId === item.id
              }"
              :draggable="!isMerging"
              role="option"
              :aria-selected="false"
              :aria-grabbed="!isMerging && dragSourceId === item.id"
              @dragstart="handleDragStart($event, item.id)"
              @dragover="handleDragOver($event, item.id)"
              @dragenter="handleDragEnter($event, item.id)"
              @dragleave="handleDragLeave($event, item.id)"
              @drop="handleDrop($event, item.id)"
              @dragend="handleDragEnd"
            >
              <span class="merge-item__order" aria-hidden="true">{{ index + 1 }}</span>
              <div class="merge-item__thumb" aria-hidden="true">
                <img v-if="item.thumbnail" :src="item.thumbnail" alt="" />
                <div v-else class="merge-item__thumb merge-item__thumb--placeholder">
                  {{ item.loading ? 'Rendering…' : 'No preview' }}
                </div>
              </div>
              <div class="merge-item__meta">
                <div class="mono truncate">{{ item.file.name }}</div>
                <div class="text-xs text-text-muted">{{ formatFileSize(item.file.size) }}</div>
              </div>
              <div class="merge-item__actions">
                <UiButton
                  type="button"
                  variant="quiet"
                  size="sm"
                  icon-only
                  :disabled="index === 0 || isMerging"
                  @click="moveItem(item.id, 'up')"
                  title="Move up"
                >
                  <ArrowUp :size="16" />
                </UiButton>
                <UiButton
                  type="button"
                  variant="quiet"
                  size="sm"
                  icon-only
                  :disabled="index === mergeFiles.length - 1 || isMerging"
                  @click="moveItem(item.id, 'down')"
                  title="Move down"
                >
                  <ArrowDown :size="16" />
                </UiButton>
                <UiButton
                  type="button"
                  variant="destructive"
                  size="sm"
                  icon-only
                  :disabled="isMerging"
                  @click="removeItem(item.id)"
                  title="Remove"
                >
                  <Trash2 :size="16" />
                </UiButton>
              </div>
            </div>
          </div>

          <div v-else class="merge-empty">
            <p class="body-text text-text-muted">Add two or more PDFs to get started.</p>
          </div>

          <div v-if="isMerging" class="merge-progress">
            <div class="merge-progress__bar">
              <div class="merge-progress__fill" :style="{ width: `${Math.round(mergeProgress * 100)}%` }" />
            </div>
            <div class="merge-progress__label">
              {{ mergeStage || 'Merging...' }}
              <span v-if="mergeProgress > 0"> · {{ Math.round(mergeProgress * 100) }}%</span>
            </div>
          </div>

          <UiButton
            type="button"
            size="md"
            tone="accent"
            :disabled="!canMerge"
            @click="startMerge"
          >
            Merge & Download
          </UiButton>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12">
        <template #header>
          <div class="flex items-center gap-2">
            <Scissors :size="16" />
            <span>Split / Extract (beta)</span>
          </div>
          <span class="panel__meta">Extract selected pages into a new PDF</span>
        </template>

        <div class="space-y-6">
          <div class="flex flex-wrap gap-3">
            <UiButton type="button" size="sm" :disabled="isSplitting" @click="triggerSplitFileDialog">
              Choose PDF
            </UiButton>
            <UiButton
              type="button"
              size="sm"
              variant="quiet"
              tone="warning"
              :disabled="!splitFile || isSplitting"
              @click="resetSplitQueue"
            >
              Clear Selection
            </UiButton>
            <span v-if="splitFile" class="body-text text-text-muted">
              {{ splitFile.name }}<span v-if="splitPageCount"> • {{ splitPageCount }} pages</span>
            </span>
            <span v-if="splitFile && splitPageCount" class="body-text text-text-secondary">
              Selected {{ selectedSplitCount }} / {{ splitPageCount }}
            </span>
          </div>

          <input
            ref="splitInputRef"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="handleSplitFileChange"
          />

          <div class="split-preview" v-if="splitFile">
            <div v-if="splitThumbnail" class="split-preview__thumb">
              <img :src="splitThumbnail" alt="" />
            </div>
            <div v-else class="split-preview__thumb split-preview__thumb--placeholder">Preview</div>
            <div class="split-preview__form">
              <label class="body-text text-text-secondary uppercase tracking-wider block">Select pages</label>
              <p class="body-text text-text-muted text-sm">
                Click thumbnails to toggle which pages will be included in the exported PDF.
              </p>
              <div class="split-pages-actions">
                <UiButton type="button" size="sm" :disabled="isSplitting || !splitPages.length" @click="selectAllSplitPages">Select All</UiButton>
                <UiButton type="button" size="sm" variant="quiet" :disabled="isSplitting || !splitPages.length" @click="clearSplitSelection">Clear</UiButton>
                <UiButton type="button" size="sm" variant="quiet" :disabled="isSplitting || !splitPages.length" @click="invertSplitSelection">Invert</UiButton>
              </div>
            </div>
          </div>

          <div v-if="splitPages.length" class="split-pages-grid" ref="splitPagesContainer">
            <button
              v-for="page in splitPages"
              :key="page.index"
              type="button"
              class="split-page-card"
              :class="{
                'split-page-card--selected': page.selected,
                'split-page-card--loading': page.loading,
                'split-page-card--disabled': isSplitting
              }"
              :ref="el => registerSplitCard(el, page.index)"
              draggable="false"
              @pointerdown="handleSplitPointerDown($event, page.index)"
              @pointerenter="handleSplitPointerEnter(page.index)"
              @pointerup="handleSplitPointerUp"
              :disabled="isSplitting"
            >
              <div class="split-page-card__thumb">
                <img v-if="page.thumbnail" :src="page.thumbnail" alt="" />
                <div v-else class="split-page-card__thumb split-page-card__thumb--placeholder">
                  {{ page.loading ? '…' : page.index }}
                </div>
              </div>
              <div class="split-page-card__label">Page {{ page.index }}</div>
            </button>
          </div>

          <div v-if="isSplitting" class="merge-progress">
            <div class="merge-progress__bar">
              <div class="merge-progress__fill" :style="{ width: `${Math.round(splitProgress * 100)}%` }" />
            </div>
            <div class="merge-progress__label">
              {{ splitStage || 'Extracting...' }}
              <span v-if="splitProgress > 0"> · {{ Math.round(splitProgress * 100) }}%</span>
            </div>
          </div>

          <div class="split-actions">
            <UiButton
              type="button"
              size="md"
              tone="accent"
              :disabled="!canSplit"
              @click="startSplit('single')"
            >
              Export as single PDF
            </UiButton>
            <UiButton
              type="button"
              size="md"
              variant="quiet"
              :disabled="!canSplit"
              @click="startSplit('individual')"
            >
              Download selected pages (ZIP)
            </UiButton>
          </div>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12">
        <template #header>
          <div class="flex items-center gap-2">
            <Gauge :size="16" />
            <span>Compress PDF (alpha)</span>
          </div>
          <span class="panel__meta">Shrink PDFs with tuned presets</span>
        </template>

        <div class="space-y-6">
          <div class="flex flex-wrap items-center gap-3">
            <UiButton type="button" size="sm" :disabled="isCompressing" @click="triggerCompressFileDialog">
              Choose PDF
            </UiButton>
            <UiButton
              type="button"
              size="sm"
              variant="quiet"
              tone="warning"
              :disabled="!compressFile || isCompressing"
              @click="resetCompression"
            >
              Reset
            </UiButton>
            <span v-if="compressFile" class="body-text text-text-muted">
              {{ compressFile.name }} · {{ formatFileSize(compressFile.size) }}
            </span>
            <span v-if="compressSavings" class="body-text text-text-secondary">
              Saved {{ compressSavings.percent }} · {{ formatFileSize(compressSavings.savedBytes) }}
            </span>
            <span v-else-if="lastCompressedName" class="body-text text-text-secondary">
              Last output: {{ lastCompressedName }}
            </span>
          </div>

          <p class="body-text text-text-muted text-sm">
            All compression runs locally in your browser worker—drop in a PDF, select a preset, and download the optimised result.
          </p>
          <p class="text-xs text-text-secondary">
            Light and Balanced keep vector text intact by compressing embedded images; Smallest falls back to rasterising pages when necessary.
          </p>

          <input
            ref="compressInputRef"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="handleCompressFileChange"
          />

          <div v-if="compressFile" class="compress-presets">
            <button
              v-for="preset in compressPresets"
              :key="preset.key"
              type="button"
              class="compress-preset"
              :class="{ 'compress-preset--active': compressPreset === preset.key }"
              :disabled="isCompressing"
              @click="compressPreset = preset.key"
            >
              <span class="compress-preset__label">{{ preset.label }}</span>
              <span class="compress-preset__meta">{{ preset.helper }}</span>
            </button>
          </div>

          <div v-if="isCompressing" class="merge-progress">
            <div class="merge-progress__bar">
              <div class="merge-progress__fill" :style="{ width: `${Math.round(compressProgress * 100)}%` }" />
            </div>
            <div class="merge-progress__label">
              {{ compressStage || 'Compressing...' }}
              <span v-if="compressProgress > 0"> · {{ Math.round(compressProgress * 100) }}%</span>
            </div>
          </div>

          <UiButton
            type="button"
            size="md"
            tone="accent"
            :disabled="!canCompress"
            @click="startCompression(compressPreset)"
          >
            Compress & Download
          </UiButton>
        </div>
      </UiPanel>

      <UiPanel class="col-span-12 lg:col-span-6">
        <template #header>
          <span class="body-text uppercase tracking-wider text-text-secondary">Next Up</span>
        </template>
        <ul class="space-y-3 body-text text-text-secondary uppercase tracking-wide">
          <li>Enable keyboard + range shortcuts in split selection</li>
          <li>Persist thumbnail cache with storage guardrails</li>
          <li>Prototype PDF compression presets with real optimisation</li>
        </ul>
      </UiPanel>

      <UiPanel class="col-span-12 lg:col-span-6">
        <template #header>
          <span class="body-text uppercase tracking-wider text-text-secondary">Ideas Backlog</span>
        </template>
        <ul class="space-y-3 body-text text-text-muted">
          <li>Annotate, redact, and sign PDFs</li>
          <li>OCR pipelines for scanned documents</li>
          <li>Watermarks, passwords, and permissions</li>
        </ul>
      </UiPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiPanel from '@/components/ui/UiPanel.vue'
import { useToastStore } from '@/app/stores/toast'
import { pdfWorkerPool } from '@/workers/pdfWorkerPool'
import { downloadAsZip, downloadFile, generateFileId } from '@/utils/file'
import { formatFileSize } from '@/utils/format'
import { FileText, Upload, ArrowUp, ArrowDown, Trash2, Scissors, Gauge } from 'lucide-vue-next'

interface OperationCard {
  key: string
  title: string
  description: string
  status: 'In progress' | 'Planned'
  cta: string
  disabled: boolean
}

interface MergeItem {
  id: string
  file: File
  thumbnail: string | null
  loading: boolean
}

const compressPresets = [
  {
    key: 'light',
    label: 'Light',
    helper: 'Trim metadata and gently resample oversized images.'
  },
  {
    key: 'balanced',
    label: 'Balanced',
    helper: 'Smaller file, text intact, image downscale at ~150 dpi.'
  },
  {
    key: 'small',
    label: 'Smallest',
    helper: 'Best for uploads—resample images harder, keep vectors when possible.'
  }
] as const

type CompressPresetKey = typeof compressPresets[number]['key']

const toastStore = useToastStore()

const operations: OperationCard[] = [
  {
    key: 'merge',
    title: 'Merge PDFs',
    description: 'Combine multiple PDFs into a single document with custom ordering.',
    status: 'In progress',
    cta: 'Start Merge',
    disabled: false
  },
  {
    key: 'split',
    title: 'Split / Extract',
    description: 'Select ranges or individual pages to export into new documents.',
    status: 'In progress',
    cta: 'Start Split',
    disabled: false
  },
  {
    key: 'organize',
    title: 'Organize Pages',
    description: 'Drag to reorder, rotate, duplicate, or delete pages visually.',
    status: 'Planned',
    cta: 'Organize Pages',
    disabled: true
  },
  {
    key: 'compress',
    title: 'Compress',
    description: 'Balance quality and size with smart image recompression.',
    status: 'In progress',
    cta: 'Compress PDF',
    disabled: false
  },
  {
    key: 'export-images',
    title: 'PDF → Images',
    description: 'Export pages to PNG, JPEG, or WebP—ideal for sharing or web use.',
    status: 'Planned',
    cta: 'Export Pages',
    disabled: true
  },
  {
    key: 'images-to-pdf',
    title: 'Images → PDF',
    description: 'Batch convert images into a printable PDF with custom sizing.',
    status: 'Planned',
    cta: 'Create PDF',
    disabled: true
  }
]

const mergeFiles = ref<MergeItem[]>([])
const mergeStage = ref('')
const mergeProgress = ref(0)
const isMerging = ref(false)
const lastResultName = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const dragSourceId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

const compressFile = ref<File | null>(null)
const compressInputRef = ref<HTMLInputElement | null>(null)
const compressPreset = ref<CompressPresetKey>('light')
const isCompressing = ref(false)
const compressStage = ref('')
const compressProgress = ref(0)
const compressStats = ref<{ original: number; result: number } | null>(null)
const lastCompressedName = ref<string | null>(null)

const splitFile = ref<File | null>(null)
const splitThumbnail = ref<string | null>(null)
const splitPageCount = ref<number | null>(null)
const splitStage = ref('')
const splitProgress = ref(0)
const isSplitting = ref(false)
const splitInputRef = ref<HTMLInputElement | null>(null)
const splitPages = ref<Array<{ index: number; thumbnail: string | null; loading: boolean; selected: boolean }>>([])
const splitPagesContainer = ref<HTMLDivElement | null>(null)
const splitPdfDoc = shallowRef<any | null>(null)
const splitObserver = shallowRef<IntersectionObserver | null>(null)
const splitObservedElements = new Map<number, HTMLElement>()
const splitThumbnailPromises = new Map<number, Promise<void>>()
const splitDragActive = ref(false)
const splitDragMode = ref<'select' | 'deselect' | null>(null)
const splitLastHovered = ref<number | null>(null)
let splitObserverRoot: HTMLElement | null = null

const hasFiles = computed(() => mergeFiles.value.length > 0)
const canMerge = computed(() => mergeFiles.value.length >= 2 && !isMerging.value)
const totalSize = computed(() => mergeFiles.value.reduce((sum, item) => sum + item.file.size, 0))
const canCompress = computed(() => compressFile.value !== null && !isCompressing.value)
const selectedSplitCount = computed(() => splitPages.value.filter(page => page.selected).length)
const canSplit = computed(() => splitFile.value !== null && !isSplitting.value && selectedSplitCount.value > 0)

const compressSavings = computed(() => {
  const stats = compressStats.value
  if (!stats || stats.original <= 0) {
    return null
  }

  const savedBytes = Math.max(0, stats.original - stats.result)
  if (savedBytes <= 0) {
    return {
      savedBytes: 0,
      percent: '0%'
    }
  }

  const percent = (savedBytes / stats.original) * 100
  const formatted = percent >= 99
    ? '99%'
    : percent >= 10
      ? `${Math.round(percent)}%`
      : `${percent.toFixed(1)}%`

  return {
    savedBytes,
    percent: formatted
  }
})

function handleOperation(operation: OperationCard) {
  if (operation.key === 'merge') {
    triggerFileDialog()
    return
  }
  if (operation.key === 'split') {
    triggerSplitFileDialog()
    return
  }
  if (operation.key === 'compress') {
    triggerCompressFileDialog()
    return
  }
  toastStore.info('Coming Soon', `${operation.title} is on the roadmap—follow docs/pdf-roadmap.md for updates.`)
}

function statusTone(status: OperationCard['status']) {
  return status === 'In progress' ? 'pdf-card__status--active' : 'pdf-card__status--idle'
}

function triggerFileDialog() {
  if (isMerging.value) return
  fileInputRef.value?.click()
}

function triggerSplitFileDialog() {
  if (isSplitting.value) return
  splitInputRef.value?.click()
}

function triggerCompressFileDialog() {
  if (isCompressing.value) return
  compressInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return

  const incoming = Array.from(input.files)
  const existingKeys = new Set(mergeFiles.value.map(item => `${item.file.name}-${item.file.size}`))
  let added = 0

  for (const file of incoming) {
    if (file.type !== 'application/pdf') {
      toastStore.warning('Skipped File', `${file.name} is not a PDF`)
      continue
    }

    const key = `${file.name}-${file.size}`
    if (existingKeys.has(key)) {
      toastStore.info('Already Added', `${file.name} is already queued`)
      continue
    }

    existingKeys.add(key)
    const newItem: MergeItem = { id: generateFileId(), file, thumbnail: null, loading: true }
    mergeFiles.value = [...mergeFiles.value, newItem]
    generatePdfThumbnail(file).then((url) => {
      const target = mergeFiles.value.find(item => item.id === newItem.id)
      if (target) {
        target.thumbnail = url
        target.loading = false
      }
    }).catch(() => {
      const target = mergeFiles.value.find(item => item.id === newItem.id)
      if (target) {
        target.thumbnail = null
        target.loading = false
      }
    })
    added++
  }

  if (added > 0) {
    toastStore.success('Files Added', `${added} PDF${added > 1 ? 's' : ''} ready to merge`)
  }

  input.value = ''
}

function handleCompressFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const fileList = input.files
  if (!fileList || fileList.length === 0) return

  const file = fileList.item(0)
  if (!file) return

  if (file.type !== 'application/pdf') {
    toastStore.error('Unsupported File', 'Please select a PDF document to compress')
    input.value = ''
    return
  }

  compressFile.value = file
  compressPreset.value = 'light'
  compressStats.value = null
  compressStage.value = ''
  compressProgress.value = 0
  lastCompressedName.value = null
  input.value = ''
}

function removeItem(id: string) {
  if (isMerging.value) return
  mergeFiles.value = mergeFiles.value.filter(item => item.id !== id)
}

function moveItem(id: string, direction: 'up' | 'down') {
  if (isMerging.value) return
  const index = mergeFiles.value.findIndex(item => item.id === id)
  if (index === -1) return

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= mergeFiles.value.length) return

  const items = [...mergeFiles.value]
  const moved = items.splice(index, 1)[0]
  if (!moved) return
  items.splice(targetIndex, 0, moved)
  mergeFiles.value = items
}

function handleDragStart(event: DragEvent, id: string) {
  if (isMerging.value) return
  dragSourceId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleDragOver(event: DragEvent, id: string) {
  if (isMerging.value) return
  event.preventDefault()
  dragOverId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragEnter(event: DragEvent, id: string) {
  if (isMerging.value) return
  event.preventDefault()
  const current = dragOverId.value
  if (current !== id) {
    dragOverId.value = id
  }
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDrop(event: DragEvent, id: string) {
  if (isMerging.value) return
  event.preventDefault()
  const sourceId = dragSourceId.value
  dragSourceId.value = null
  dragOverId.value = null
  if (!sourceId || sourceId === id) return

  const items = [...mergeFiles.value]
  const sourceIndex = items.findIndex(item => item.id === sourceId)
  const targetIndex = items.findIndex(item => item.id === id)
  if (sourceIndex === -1 || targetIndex === -1) return
  const moved = items.splice(sourceIndex, 1)[0]
  if (!moved) return
  items.splice(targetIndex, 0, moved)
  mergeFiles.value = items
}

function handleDragEnd() {
  dragSourceId.value = null
  dragOverId.value = null
}

function handleDragLeave(event: DragEvent, id: string) {
  if (isMerging.value) return
  const related = event.relatedTarget as Node | null
  const currentTarget = event.currentTarget as HTMLElement | null
  if (currentTarget && related && currentTarget.contains(related)) {
    return
  }
  if (dragOverId.value === id) {
    dragOverId.value = null
  }
}

async function startMerge() {
  if (!canMerge.value) return

  isMerging.value = true
  mergeProgress.value = 0
  mergeStage.value = 'Preparing files'
  lastResultName.value = null

  try {
    const files = mergeFiles.value.map(item => item.file)
    const result = await pdfWorkerPool.run(files, { kind: 'pdf_merge' }, {
      onProgress: (progress) => {
        mergeProgress.value = progress
      },
      onStage: (stage) => {
        mergeStage.value = stage
      }
    })

    const blob = result.blob as Blob
    const filename = result.filename ?? `shifteo-merged-${Date.now()}.pdf`
    await downloadFile(blob, filename)

    lastResultName.value = filename
    toastStore.success('PDF Merged', `${filename} (${formatFileSize(blob.size)}) downloaded`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to merge PDFs'
    toastStore.error('Merge Failed', message)
  } finally {
    isMerging.value = false
    mergeStage.value = ''
    mergeProgress.value = 0
  }
}

function resetQueue() {
  if (isMerging.value) return
  mergeFiles.value = []
  lastResultName.value = null
}

function resetCompression() {
  if (isCompressing.value) return
  compressFile.value = null
  compressPreset.value = 'light'
  compressStats.value = null
  compressStage.value = ''
  compressProgress.value = 0
  lastCompressedName.value = null
}

function resetSplitQueue() {
  if (isSplitting.value) return
  disposeSplitObserver()
  destroySplitPdfDoc()
  handleSplitPointerUp()
  splitFile.value = null
  splitThumbnail.value = null
  splitPageCount.value = null
  splitPages.value = []
  splitProgress.value = 0
  splitStage.value = ''
}

function destroySplitPdfDoc() {
  if (splitPdfDoc.value) {
    try {
      splitPdfDoc.value.destroy?.()
    } catch (error) {
      console.warn('Failed to destroy PDF document', error)
    }
    splitPdfDoc.value = null
  }
  splitThumbnailPromises.clear()
}

function disposeSplitObserver() {
  if (splitObserver.value) {
    splitObserver.value.disconnect()
    splitObserver.value = null
  }
  splitObserverRoot = null
  splitObservedElements.clear()
}

function ensureSplitObserver(root: HTMLElement | null) {
  if (typeof IntersectionObserver === 'undefined') return
  const nextRoot = root ?? null
  if (splitObserver.value && splitObserverRoot === nextRoot) return

  if (splitObserver.value) {
    splitObserver.value.disconnect()
  }

  splitObserverRoot = nextRoot
  splitObserver.value = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const el = entry.target as HTMLElement
      const indexAttr = el.dataset.pageIndex
      const pageIndex = indexAttr ? Number.parseInt(indexAttr, 10) : NaN
      if (!Number.isNaN(pageIndex)) {
        loadSplitPageThumbnail(pageIndex)
      }
    }
  }, {
    root: nextRoot,
    rootMargin: '160px',
    threshold: 0.1
  })

  for (const element of splitObservedElements.values()) {
    splitObserver.value.observe(element)
  }
}

function registerSplitCard(el: HTMLElement | null, pageIndex: number) {
  const index = Math.max(1, Math.floor(pageIndex))
  if (el) {
    ensureSplitObserver(splitPagesContainer.value)
    el.dataset.pageIndex = String(index)
    const previous = splitObservedElements.get(index)
    if (previous && previous !== el) {
      splitObserver.value?.unobserve(previous)
    }
    splitObservedElements.set(index, el)
    splitObserver.value?.observe(el)
    if (index <= 4) {
      loadSplitPageThumbnail(index)
    }
  } else {
    const existing = splitObservedElements.get(index)
    if (existing) {
      splitObserver.value?.unobserve(existing)
      splitObservedElements.delete(index)
    }
  }
}

function loadSplitPageThumbnail(pageIndex: number) {
  const page = splitPages.value.find(item => item.index === pageIndex)
  if (!page || page.thumbnail || page.loading) return
  const pdf = splitPdfDoc.value
  if (!pdf) return
  if (splitThumbnailPromises.has(pageIndex)) return

  page.loading = true

  const promise = renderPdfPageThumbnail(pdf, pageIndex)
    .then((thumb) => {
      page.thumbnail = thumb
      if (pageIndex === 1 && thumb) {
        splitThumbnail.value = thumb
      }
    })
    .catch((error) => {
      console.warn('Failed to load page thumbnail', error)
      page.thumbnail = null
    })
    .finally(() => {
      page.loading = false
      splitThumbnailPromises.delete(pageIndex)
    })

  splitThumbnailPromises.set(pageIndex, promise)
}

let pdfjsLibPromise: Promise<any> | null = null

async function loadPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      const pdfjsModule = await import('pdfjs-dist/build/pdf')
      const pdfjs = (pdfjsModule as any).default ?? pdfjsModule
      const workerModule = await import('pdfjs-dist/build/pdf.worker?url')
      const workerSrc: string = (workerModule as { default?: string }).default ?? (workerModule as unknown as string)
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
      return pdfjs
    })()
  }
  return pdfjsLibPromise
}

async function renderPdfPageThumbnail(pdf: any, pageNumber: number, targetWidth = 140): Promise<string | null> {
  try {
    const safeNumber = Math.max(1, Math.min(pageNumber, pdf.getPageCount?.() ?? pdf.numPages ?? pageNumber))
    const page = await pdf.getPage(safeNumber)
    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(targetWidth / viewport.width, 1)
    const scaledViewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      page.cleanup()
      return null
    }

    canvas.width = Math.ceil(scaledViewport.width)
    canvas.height = Math.ceil(scaledViewport.height)

    await page.render({ canvasContext: context, viewport: scaledViewport }).promise
    const dataUrl = canvas.toDataURL('image/png', 0.9)
    page.cleanup()
    return dataUrl
  } catch (error) {
    console.warn('Failed to render PDF page thumbnail', error)
    return null
  }
}

async function generatePdfThumbnail(file: File, pageNumber = 1): Promise<string | null> {
  try {
    const pdfjs = await loadPdfJs()
    const data = await file.arrayBuffer()
    const loadingTask = pdfjs.getDocument({ data })
    const pdf = await loadingTask.promise
    const result = await renderPdfPageThumbnail(pdf, pageNumber)
    pdf.destroy?.()
    return result
  } catch (error) {
    console.warn('Failed to generate PDF thumbnail', error)
    return null
  }
}

async function handleSplitFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const fileList = input.files
  if (!fileList || fileList.length === 0) return

  const file = fileList.item(0)
  if (!file) return
  if (file.type !== 'application/pdf') {
    toastStore.error('Unsupported File', 'Please select a PDF document to split')
    input.value = ''
    return
  }

  disposeSplitObserver()
  destroySplitPdfDoc()
  splitPages.value = []
  splitThumbnail.value = null
  splitPageCount.value = null
  splitFile.value = file
  splitStage.value = 'Analysing document'
  splitProgress.value = 0

  try {
    const pdfjs = await loadPdfJs()
    const data = await file.arrayBuffer()
    const loadingTask = pdfjs.getDocument({ data })
    const pdf = await loadingTask.promise
    splitPdfDoc.value = pdf
    const total = (pdf as { numPages?: number; getPageCount?: () => number }).numPages ?? pdf.getPageCount?.() ?? 0
    splitPageCount.value = total

    splitPages.value = Array.from({ length: total }, (_, index) => ({
      index: index + 1,
      thumbnail: null,
      loading: false,
      selected: true
    }))

    queueMicrotask(() => {
      loadSplitPageThumbnail(1)
      for (let i = 2; i <= Math.min(total, 8); i++) {
        loadSplitPageThumbnail(i)
      }
    })
  } catch (error) {
    console.warn('Failed to analyse PDF for split', error)
    splitPageCount.value = null
    splitThumbnail.value = null
    destroySplitPdfDoc()
    splitPages.value = []
  }

  splitStage.value = ''
  splitProgress.value = 0
  input.value = ''
}

async function startCompression(preset?: CompressPresetKey) {
  const file = compressFile.value
  if (!file || isCompressing.value) return

  const targetPreset = preset ?? compressPreset.value
  compressPreset.value = targetPreset

  isCompressing.value = true
  compressStage.value = 'Analysing document'
  compressProgress.value = 0
  compressStats.value = null

  try {
    const result = await pdfWorkerPool.run(file, {
      kind: 'pdf_compress',
      preset: targetPreset
    }, {
      onProgress: (progress) => {
        compressProgress.value = progress
      },
      onStage: (stage) => {
        compressStage.value = stage
      }
    })

    if (!(result.blob instanceof Blob)) {
      toastStore.warning('No Output', 'Compress operation returned no data')
      return
    }

    const blob = result.blob as Blob
    const originalSize = file.size
    const compressedSize = blob.size
    compressStats.value = { original: originalSize, result: compressedSize }

    const savedBytes = Math.max(0, originalSize - compressedSize)
    const savedPercent = originalSize > 0 ? (savedBytes / originalSize) * 100 : 0
    const percentLabel = savedPercent <= 0
      ? '0%'
      : savedPercent >= 10
        ? `${Math.round(savedPercent)}%`
        : `${savedPercent.toFixed(1)}%`

    const baseName = file.name.replace(/\.pdf$/i, '')
    const filename = result.filename ?? `${baseName}-${targetPreset}.pdf`
    await downloadFile(blob, filename)
    lastCompressedName.value = filename

    if (savedBytes > 0 && savedPercent >= 1) {
      toastStore.success('PDF Compressed', `Saved ${formatFileSize(savedBytes)} (${percentLabel})`)
    } else if (savedBytes > 0) {
      toastStore.info('PDF Lightly Trimmed', `Removed ${formatFileSize(savedBytes)} of metadata; PDF downloaded as ${filename}`)
    } else {
      toastStore.info('PDF Saved', `${filename} downloaded (${formatFileSize(compressedSize)})`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compress PDF'
    toastStore.error('Compression Failed', message)
  } finally {
    isCompressing.value = false
    compressStage.value = ''
    compressProgress.value = 0
  }
}

async function startSplit(mode: 'single' | 'individual' = 'single') {
  const file = splitFile.value
  if (!file || !canSplit.value) return

  const pages = splitPages.value
    .filter(page => page.selected)
    .map(page => page.index)
    .filter(page => Number.isInteger(page) && page > 0)

  if (pages.length === 0) {
    toastStore.error('No Pages Selected', 'Choose at least one page to extract')
    return
  }

  const isZip = mode === 'individual'

  isSplitting.value = true
  splitProgress.value = 0
  splitStage.value = isZip ? 'Preparing ZIP' : 'Preparing pages'

  try {
    const result = await pdfWorkerPool.run(file, {
      kind: 'pdf_split',
      pages,
      mode
    }, {
      onProgress: (progress) => {
        splitProgress.value = progress
      },
      onStage: (stage) => {
        splitStage.value = stage
      }
    })

    const baseName = file.name.replace(/\.pdf$/i, '')

    if (isZip) {
      if (result.files && result.files.length > 0) {
        await downloadAsZip(result.files, `${baseName}-pages.zip`)
        toastStore.success('Pages Extracted', `${result.files.length} PDF${result.files.length === 1 ? '' : 's'} downloaded as ZIP`)
        return
      }

      if (Array.isArray(result.blob) && result.blob.length > 0) {
        const files = result.blob.map((item, index) => ({
          blob: item as Blob,
          filename: `${baseName}-part-${index + 1}.pdf`
        }))
        await downloadAsZip(files, `${baseName}-pages.zip`)
        toastStore.success('Pages Extracted', `${files.length} PDF${files.length === 1 ? '' : 's'} downloaded as ZIP`)
        return
      }

      if (result.blob instanceof Blob) {
        const filename = result.filename ?? `${baseName}-pages.zip`
        await downloadFile(result.blob, filename)
        toastStore.success('Pages Extracted', `${filename} downloaded (${formatFileSize(result.blob.size)})`)
        return
      }
    } else {
      if (result.blob instanceof Blob) {
        const filename = result.filename ?? `${baseName}-extracted.pdf`
        await downloadFile(result.blob, filename)
        toastStore.success('Pages Extracted', `${filename} downloaded (${formatFileSize(result.blob.size)})`)
        return
      }

      if (Array.isArray(result.blob) && result.blob.length > 0) {
        const combined = result.blob[0] as Blob
        const filename = result.filename ?? `${baseName}-extracted.pdf`
        await downloadFile(combined, filename)
        toastStore.success('Pages Extracted', `${filename} downloaded (${formatFileSize(combined.size)})`)
        return
      }

      if (result.files && result.files.length > 0) {
        await downloadAsZip(result.files, `${baseName}-pages.zip`)
        toastStore.success('Pages Extracted', `${result.files.length} PDF${result.files.length === 1 ? '' : 's'} downloaded as ZIP`)
        return
      }
    }

    toastStore.warning('No Output', 'Split operation returned no data')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to split PDF'
    toastStore.error('Split Failed', message)
  } finally {
    isSplitting.value = false
    splitStage.value = ''
    splitProgress.value = 0
  }
}

function handleSplitPointerDown(event: PointerEvent, index: number) {
  if (isSplitting.value) return
  event.preventDefault()
  const page = splitPages.value.find(item => item.index === index)
  if (!page || page.loading) return
  const mode: 'select' | 'deselect' = page.selected ? 'deselect' : 'select'
  splitDragActive.value = true
  splitDragMode.value = mode
  splitLastHovered.value = index
  page.selected = mode === 'select'
  window.addEventListener('pointerup', handleSplitPointerUp)
}

function handleSplitPointerEnter(index: number) {
  if (!splitDragActive.value || !splitDragMode.value) return
  if (splitLastHovered.value === index) return
  const page = splitPages.value.find(item => item.index === index)
  if (!page || page.loading) return
  page.selected = splitDragMode.value === 'select'
  splitLastHovered.value = index
}

function handleSplitPointerUp() {
  if (!splitDragActive.value) return
  splitDragActive.value = false
  splitDragMode.value = null
  splitLastHovered.value = null
  window.removeEventListener('pointerup', handleSplitPointerUp)
}

function selectAllSplitPages() {
  if (isSplitting.value) return
  splitPages.value = splitPages.value.map(page => ({ ...page, selected: true }))
}

function clearSplitSelection() {
  if (isSplitting.value) return
  splitPages.value = splitPages.value.map(page => ({ ...page, selected: false }))
}

function invertSplitSelection() {
  if (isSplitting.value) return
  splitPages.value = splitPages.value.map(page => ({ ...page, selected: !page.selected }))
}

watch(splitPagesContainer, (root) => {
  if (root) {
    ensureSplitObserver(root)
  }
})

onBeforeUnmount(() => {
  disposeSplitObserver()
  destroySplitPdfDoc()
  window.removeEventListener('pointerup', handleSplitPointerUp)
})

</script>

<style scoped>
.pdf-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding: var(--space-16);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel);
  background: var(--color-bg-inset);
  min-height: 190px;
}

.pdf-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-12);
}

.pdf-card__title {
  font-family: var(--font-ui-sans);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.pdf-card__status {
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pdf-card__status--active {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-acc-success);
}

.pdf-card__status--idle {
  background: rgba(148, 163, 184, 0.12);
  color: var(--color-text-muted);
}

.pdf-card__description {
  flex: 1;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.pdf-card__footer {
  display: flex;
  justify-content: flex-start;
}

.merge-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel-inner);
  padding: var(--space-12);
  background: var(--color-bg-inset-2);
  max-height: 280px;
  overflow-y: auto;
}

.merge-list__hint {
  margin: 0;
  padding: 0 var(--space-4);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-muted);
}

.merge-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-12);
  padding: 0.35rem 0.25rem;
  border: 1px solid transparent;
  border-radius: var(--radius-panel-inner);
  transition: border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
}

.merge-item--dragging {
  opacity: 0.6;
  border-color: var(--color-line-key);
}

.merge-item--over {
  border-color: var(--color-acc-error);
  background: rgba(255, 93, 99, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 93, 99, 0.16);
}

.merge-item__order {
  width: 1.75rem;
  flex: 0 0 auto;
  text-align: center;
  font-family: var(--font-ui-mono, var(--font-ui-sans));
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.merge-item--dragging .merge-item__order,
.merge-item--over .merge-item__order {
  color: var(--color-acc-error);
}

.merge-item__meta {
  min-width: 0;
  flex: 1 1 auto;
}

.merge-item__thumb {
  width: 60px;
  height: 80px;
  border-radius: var(--radius-panel-inner);
  overflow: hidden;
  background: var(--color-bg-panel);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.merge-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.merge-item__thumb--placeholder {
  width: 100%;
  height: 100%;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.merge-item__actions {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.merge-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.merge-progress__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--color-line-hair);
  overflow: hidden;
}

.merge-progress__fill {
  height: 100%;
  background: var(--color-acc-error);
  transition: width 160ms ease-out;
}

.merge-progress__label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.merge-empty {
  padding: var(--space-16);
  border: 1px dashed var(--color-line-key);
  border-radius: var(--radius-panel-inner);
  text-align: center;
}

.split-preview {
  display: flex;
  gap: var(--space-16);
  align-items: flex-start;
}

.split-preview__thumb {
  width: 120px;
  height: 160px;
  border-radius: var(--radius-panel-inner);
  overflow: hidden;
  background: var(--color-bg-panel);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.split-preview__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.split-preview__thumb--placeholder {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.split-preview__form {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.split-pages-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.split-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
}

.compress-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-12);
}

.compress-preset {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-12);
  border-radius: var(--radius-panel-inner);
  border: 1px solid var(--color-line-key);
  background: var(--color-bg-panel);
  text-align: left;
  transition: border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease, transform 120ms ease;
  cursor: pointer;
  appearance: none;
}

.compress-preset:hover {
  border-color: var(--color-acc-error);
}

.compress-preset--active {
  border-color: var(--color-acc-error);
  box-shadow: 0 0 0 1px rgba(255, 93, 99, 0.2);
}

.compress-preset:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.compress-preset__label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.compress-preset__meta {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.split-pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: var(--space-12);
  max-height: 320px;
  overflow-y: auto;
  padding: var(--space-12);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel-inner);
  background: var(--color-bg-inset-2);
}

.split-page-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8);
  border-radius: var(--radius-panel-inner);
  border: 1px solid transparent;
  background: var(--color-bg-panel);
  transition: border-color 120ms ease, transform 120ms ease;
}

.split-page-card--selected {
  border-color: var(--color-acc-error);
  box-shadow: 0 0 0 1px rgba(255, 93, 99, 0.3);
}

.split-page-card--loading .split-page-card__thumb {
  opacity: 0.6;
}

.split-page-card--disabled {
  opacity: 0.6;
}

.split-page-card__thumb {
  width: 70px;
  height: 96px;
  border-radius: var(--radius-panel-inner);
  overflow: hidden;
  background: var(--color-bg-inset);
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-page-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.split-page-card__thumb--placeholder {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.split-page-card__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-secondary);
}
</style>
