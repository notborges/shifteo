<template>
  <div
    class="page-shell"
    @dragenter="handlePageDragEnter"
    @dragover.prevent="handlePageDragOver"
    @dragleave="handlePageDragLeave"
    @drop.prevent="handlePageDrop"
  >
    <Transition name="drag-overlay">
      <div v-if="isPageDragging" class="page-drag-overlay">
        <div class="page-drag-indicator">
          <Upload :size="64" :stroke-width="1.5" />
          <div class="page-drag-text">Drop PDFs to add them to the queue</div>
        </div>
      </div>
    </Transition>

    <div class="page-grid gap-6">
      <UiPanel class="col-span-12" :inset="true">
        <template #header>
          <div class="flex items-center gap-2">
            <FileText :size="16" />
            <span>PDF Toolkit</span>
          </div>
          <span class="panel__meta">Add PDFs to the queue, then route them to the right workflow</span>
        </template>
        <DropZone
          :multiple="true"
          accept="application/pdf"
          :formats="['PDF']"
          @files-selected="handleQueueFilesSelected"
          @drop-complete="clearPageDragState"
        />
      </UiPanel>

      <UiPanel class="col-span-12">
        <template #header>
          <span>Queue</span>
          <div class="panel__meta">
            {{ pdfQueue.length }} PDF{{ pdfQueue.length === 1 ? '' : 's' }}
          </div>
        </template>

        <div class="panel__body">
          <div v-if="pdfQueue.length === 0" class="empty-state">
            <ListX :size="48" :stroke-width="1" class="text-text-muted" />
            <div class="empty-state__title">Queue Empty</div>
            <div class="empty-state__meta">Drop PDFs above to start.</div>
          </div>
          <PdfQueueList
            v-else
            :items="pdfQueue"
            :locked="isQueueLocked"
            :draggable="true"
            :badges="queueAssignments"
            hint="Drag items onto a workflow panel or use the 'Choose from queue' controls below."
            @preview="previewQueueItem"
            @download="downloadQueueItem"
            @remove="removeQueueItem"
            @drag-start="handleQueueDragStart"
            @drag-end="handleQueueDragEnd"
          />
        </div>

        <div class="panel__footer" v-if="pdfQueue.length > 0">
          <div class="flex w-full items-center justify-between flex-wrap gap-2">
            <span>{{ pdfQueue.length }} PDF{{ pdfQueue.length > 1 ? 's' : '' }}</span>
            <UiButton
              type="button"
              size="sm"
              variant="quiet"
              tone="warning"
              :disabled="pdfQueue.length === 0 || isQueueLocked"
              @click="clearPdfQueue"
            >
              Clear Queue
            </UiButton>
          </div>
        </div>
      </UiPanel>

      <!-- Workflow Tabs -->
      <div class="col-span-12">
        <TabSelector
          v-model="activeWorkflow"
          :tabs="workflowTabs"
        />
      </div>

      <!-- Merge Workflow -->
      <WorkflowSection
        v-show="activeWorkflow === 'merge'"
        title="Merge PDFs"
        subtitle="Combine multiple PDFs in any order"
        :icon="Layers"
        colspan="12"
        :supports-drop="true"
        @drop="handleMergeDropZoneDrop"
      >
        <!-- Description & Meta -->
        <div class="flex flex-col gap-3">
          <p class="body-text text-text-muted text-sm">
            Drag PDFs from the queue above to build your merge order. Files merge from top to bottom.
          </p>
          <div v-if="hasFiles" class="flex flex-wrap items-center gap-3">
            <span class="mono text-text-secondary text-sm">
              {{ mergeFiles.length }} file{{ mergeFiles.length === 1 ? '' : 's' }} · {{ formatFileSize(totalSize) }}
            </span>
            <span v-if="lastResultName" class="body-text text-text-muted text-xs">
              Last output: {{ lastResultName }}
            </span>
          </div>
        </div>

        <!-- Quick Add Button -->
        <div v-if="pdfQueue.length > 0 && mergeFiles.length === 0" class="flex justify-start">
          <UiButton
            type="button"
            size="sm"
            variant="solid"
            :disabled="isMerging"
            @click="addAllToMerge"
          >
            Add All from Queue ({{ pdfQueue.length }})
          </UiButton>
        </div>

        <!-- Merge List with Drag & Drop -->
        <MergeList
          :items="mergeFiles"
          :disabled="isMerging"
          @move="moveItem"
          @remove="removeItem"
          @reorder="handleMergeReorder"
        />

        <!-- Clear Button -->
        <div v-if="hasFiles" class="flex justify-end">
          <UiButton
            type="button"
            size="sm"
            variant="quiet"
            tone="warning"
            :disabled="!hasFiles || isMerging"
            @click="resetQueue"
          >
            Clear Merge Order
          </UiButton>
        </div>

        <!-- Progress Bar -->
        <ProgressBar
          v-if="isMerging"
          :progress="mergeProgress"
          :label="mergeStage || 'Merging...'"
        />

        <!-- Action Button -->
        <UiButton
          type="button"
          size="lg"
          tone="accent"
          variant="solid"
          :disabled="!canMerge"
          @click="startMerge"
        >
          Merge & Download
        </UiButton>
      </WorkflowSection>

      <!-- Split Workflow -->
      <WorkflowSection
        v-show="activeWorkflow === 'split'"
        title="Split / Extract"
        subtitle="Extract selected pages into a new PDF"
        :icon="Scissors"
        colspan="12"
        :supports-drop="true"
        @drop="handleSplitDropZoneDrop"
      >
        <!-- Source PDF Selector -->
        <PdfSourceSelector
          :queue-items="pdfQueue"
          :selected-id="splitSourceId"
          :disabled="isSplitting"
          @select="handleSplitSelection"
          @clear="resetSplitQueue"
        />

        <!-- File Meta Info -->
        <div v-if="splitFile" class="flex flex-col gap-2">
          <span class="mono text-text-primary">
            {{ splitFile.name }}<span v-if="splitPageCount"> · {{ splitPageCount }} pages</span>
          </span>
          <span v-if="splitPageCount" class="body-text text-text-secondary text-sm">
            Selected {{ selectedSplitCount }} / {{ splitPageCount }}
          </span>
        </div>

        <!-- Instructions & Selection Controls -->
        <div v-if="splitFile" class="flex flex-col gap-3">
          <p class="body-text text-text-muted text-sm">
            Click thumbnails to toggle which pages will be included in the exported PDF.
          </p>
          <div class="flex flex-wrap gap-2">
            <UiButton type="button" size="sm" :disabled="isSplitting || !splitPages.length" @click="selectAllSplitPages">Select All</UiButton>
            <UiButton type="button" size="sm" variant="quiet" :disabled="isSplitting || !splitPages.length" @click="clearSplitSelection">Clear</UiButton>
            <UiButton type="button" size="sm" variant="quiet" :disabled="isSplitting || !splitPages.length" @click="invertSplitSelection">Invert</UiButton>
          </div>
        </div>

        <!-- Page Grid -->
        <div v-if="splitPages.length" ref="splitPagesContainer">
          <SplitPageGrid
            :pages="splitPages"
            :disabled="isSplitting"
            @toggle-page="toggleSplitPage"
            @select-range="selectSplitPageRange"
          />
        </div>

        <!-- Progress Bar -->
        <ProgressBar
          v-if="isSplitting"
          :progress="splitProgress"
          :label="splitStage || 'Extracting...'"
        />

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3">
          <UiButton
            type="button"
            size="lg"
            tone="accent"
            variant="solid"
            :disabled="!canSplit"
            @click="startSplit('single')"
          >
            Export as single PDF
          </UiButton>
          <UiButton
            type="button"
            size="lg"
            variant="quiet"
            :disabled="!canSplit"
            @click="startSplit('individual')"
          >
            Download selected pages (ZIP)
          </UiButton>
        </div>
      </WorkflowSection>

      <!-- Organize Workflow -->
      <WorkflowSection
        v-show="activeWorkflow === 'organize'"
        title="Organize Pages"
        subtitle="Reorder, rotate, or remove pages before exporting"
        :icon="Grid3x3"
        colspan="12"
        :supports-drop="true"
        @drop="handleOrganizeDropZoneDrop"
      >
        <!-- Source PDF Selector -->
        <PdfSourceSelector
          :queue-items="pdfQueue"
          :selected-id="organizeSourceId"
          :disabled="isOrganizing"
          @select="handleOrganizeSelection"
          @clear="resetOrganize"
        />

        <!-- File Meta Info -->
        <div v-if="organizeFile" class="flex flex-col gap-2">
          <span class="mono text-text-primary">
            {{ organizeFile.name }} · {{ formatFileSize(organizeFile.size) }}
          </span>
          <span v-if="organizeLastOutputName" class="body-text text-text-secondary text-sm">
            Last output: {{ organizeLastOutputName }}
          </span>
        </div>

        <!-- Instructions -->
        <p v-if="organizeFile" class="body-text text-text-muted text-sm">
          Drag thumbnails to reorder pages. Rotate or remove any page before exporting the new PDF.
        </p>

        <!-- Organize Grid -->
        <div v-if="organizePages.length > 0" ref="organizePagesContainer">
          <OrganizeGrid
            :pages="organizePages"
            :disabled="isOrganizing"
            @rotate="rotateOrganizePage"
            @toggle-remove="toggleOrganizePageRemoved"
            @reorder="handleOrganizeReorder"
          />
        </div>

        <!-- Progress Bar -->
        <ProgressBar
          v-if="isOrganizing"
          :progress="organizeProgress"
          :label="organizeStage || 'Preparing...'"
        />

        <!-- Action Button -->
        <UiButton
          type="button"
          size="lg"
          tone="accent"
          variant="solid"
          :disabled="!organizeCanExport"
          @click="startOrganize"
        >
          Export Organised PDF
        </UiButton>
      </WorkflowSection>

      <!-- Compress Workflow -->
      <WorkflowSection
        v-show="activeWorkflow === 'compress'"
        title="Compress PDF"
        subtitle="Shrink PDFs with tuned presets"
        :icon="Gauge"
        colspan="12"
        :supports-drop="true"
        @drop="handleCompressDropZoneDrop"
      >
        <!-- Source PDF Selector -->
        <PdfSourceSelector
          :queue-items="pdfQueue"
          :selected-id="compressSourceId"
          :disabled="isCompressing"
          @select="handleCompressSelection"
          @clear="resetCompression"
        />

        <!-- File Meta Info -->
        <div v-if="compressFile" class="flex flex-col gap-2">
          <span class="mono text-text-primary">
            {{ compressFile.name }} · {{ formatFileSize(compressFile.size) }}
          </span>
          <span v-if="compressSavings" class="body-text text-text-secondary text-sm">
            Saved {{ compressSavings.percent }} · {{ formatFileSize(compressSavings.savedBytes) }}
          </span>
          <span v-else-if="lastCompressedName" class="body-text text-text-secondary text-sm">
            Last output: {{ lastCompressedName }}
          </span>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-3">
          <p class="body-text text-text-muted text-sm">
            All compression runs locally in your browser worker—drop in a PDF, select a preset, and download the optimised result.
          </p>
          <p class="body-text text-text-secondary text-xs">
            Light and Balanced keep vector text intact by compressing embedded images; Smallest falls back to rasterising pages when necessary.
          </p>
        </div>

        <!-- Advanced Controls Toggle -->
        <div class="flex items-center justify-between gap-3">
          <UiButton
            type="button"
            size="sm"
            variant="quiet"
            @click="toggleCompressAdvanced"
          >
            {{ compressAdvancedOpen ? 'Hide advanced controls' : 'Advanced controls' }}
          </UiButton>
        </div>

        <!-- Advanced Controls -->
        <CompressAdvancedControls
          v-model="compressOptions"
          :is-open="compressAdvancedOpen"
          :is-dirty="compressAdvancedDirty"
          @reset="resetCompressAdvanced"
        />

        <!-- Presets (only show when file is selected) -->
        <div v-if="compressFile">
          <PdfPresetSelector
            v-model="compressPreset"
            :presets="compressPresetsFormatted"
            :disabled="isCompressing"
            :hint="compressPresetHints[compressPreset]"
          />
        </div>

        <!-- Progress Bar -->
        <ProgressBar
          v-if="isCompressing"
          :progress="compressProgress"
          :label="compressStage || 'Compressing...'"
        />

        <!-- Action Button -->
        <UiButton
          type="button"
          size="lg"
          tone="accent"
          variant="solid"
          :disabled="!canCompress"
          @click="startCompression(compressPreset)"
        >
          Compress & Download
        </UiButton>

        <!-- Compression Report -->
        <CompressReport :stats="compressReport" />
      </WorkflowSection>

    </div>
  </div>

  <ImagePreviewModal
    :job="compressPreviewJob"
    :isOpen="compressPreviewModalOpen"
    @close="closeCompressPreview"
    @download="handleCompressPreviewDownload"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiPanel from '@/components/ui/UiPanel.vue'
import DropZone from '@/components/DropZone.vue'
import WorkflowSection from '@/components/WorkflowSection.vue'
import TabSelector from '@/components/TabSelector.vue'
import PdfSourceSelector from '@/components/PdfSourceSelector.vue'
import PdfPresetSelector from '@/components/PdfPresetSelector.vue'
import PdfQueueList from '@/components/PdfQueueList.vue'
import MergeList from '@/components/MergeList.vue'
import SplitPageGrid from '@/components/SplitPageGrid.vue'
import OrganizeGrid from '@/components/OrganizeGrid.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import CompressAdvancedControls from '@/components/CompressAdvancedControls.vue'
import CompressReport from '@/components/CompressReport.vue'
import { useToastStore } from '@/app/stores/toast'
import { pdfWorkerPool } from '@/workers/pdfWorkerPool'
import { downloadAsZip, downloadFile, generateFileId } from '@/utils/file'
import { formatFileSize } from '@/utils/format'
import { FileText, Upload, Scissors, Gauge, Grid3x3, ListX, Layers } from 'lucide-vue-next'
import ImagePreviewModal from '@/components/ImagePreviewModal.vue'
import type { Job, PdfCompressionStats } from '@/workers/types'

interface MergeItem {
  id: string
  file: File
  thumbnail: string | null
  loading: boolean
  sourceId?: string
}

interface OrganizePage {
  id: number
  originalIndex: number
  rotation: number
  removed: boolean
  thumbnail: string | null
  loading: boolean
}

interface PdfQueueItem {
  id: string
  file: File
  thumbnail?: string | null
  loading?: boolean
}

type MergeQueueEntry = File | { file: File; sourceId?: string }

const compressPresets = [
  {
    key: 'light',
    label: 'Light',
    helper: 'Keep text sharp while trimming metadata and gently resampling images.'
  },
  {
    key: 'balanced',
    label: 'Balanced',
    helper: 'Downscale images to ~150 dpi and preserve vectors for viewing and print.'
  },
  {
    key: 'small',
    label: 'Smallest',
    helper: 'Aggressive image crunching with raster fallback when stubborn pages resist.'
  }
] as const

type CompressPresetKey = typeof compressPresets[number]['key']

const compressPresetDefaults: Record<CompressPresetKey, { imageQuality: number; maxImageDimension: number; coordinatePrecision: number }> = {
  light: { imageQuality: 0.94, maxImageDimension: 2600, coordinatePrecision: 3 },
  balanced: { imageQuality: 0.9, maxImageDimension: 2100, coordinatePrecision: 3 },
  small: { imageQuality: 0.75, maxImageDimension: 1400, coordinatePrecision: 2 }
}

const toastStore = useToastStore()
const QUEUE_DRAG_MIME = 'application/x-shifteo-queue-id'

const pdfQueue = ref<PdfQueueItem[]>([])

const mergeFiles = ref<MergeItem[]>([])
const mergeStage = ref('')
const mergeProgress = ref(0)
const isMerging = ref(false)
const lastResultName = ref<string | null>(null)
const compressFile = ref<File | null>(null)
const compressSourceId = ref<string | null>(null)
const compressPreset = ref<CompressPresetKey>('light')
const isCompressing = ref(false)
const compressStage = ref('')
const compressProgress = ref(0)
const compressStats = ref<{ original: number; result: number } | null>(null)
const lastCompressedName = ref<string | null>(null)
const compressAdvancedOpen = ref(false)
const compressAdvancedDirty = ref(false)
const compressOptions = reactive({
  imageQuality: compressPresetDefaults.light.imageQuality,
  maxImageDimension: compressPresetDefaults.light.maxImageDimension,
  coordinatePrecision: compressPresetDefaults.light.coordinatePrecision,
  pruneFonts: true,
  recompressStreams: true
})
const compressReport = ref<PdfCompressionStats | null>(null)
const compressPreviewOriginalBlob = ref<Blob | null>(null)
const compressPreviewCompressedBlob = ref<Blob | null>(null)
const compressPreviewLoadingOriginal = ref(false)
const compressPreviewLoadingCompressed = ref(false)
const compressPreviewModalOpen = ref(false)
let compressPreviewOriginalRequest = 0
let compressPreviewCompressedRequest = 0
const compressResultBlob = ref<Blob | null>(null)

const organizeFile = ref<File | null>(null)
const organizeSourceId = ref<string | null>(null)
const organizeStage = ref('')
const organizeProgress = ref(0)
const isOrganizing = ref(false)
const organizePages = ref<OrganizePage[]>([])
const organizeLastOutputName = ref<string | null>(null)
const organizePagesContainer = ref<HTMLDivElement | null>(null)
const organizePdfDoc = shallowRef<any | null>(null)
const organizeObserver = shallowRef<IntersectionObserver | null>(null)
const organizeObservedElements = new Map<number, HTMLElement>()
const organizeThumbnailPromises = new Map<number, Promise<void>>()
const organizeDragSourceId = ref<number | null>(null)
const organizeDragOverId = ref<number | null>(null)
let organizeLoadToken = 0

const isPageDragging = ref(false)
const activeWorkflow = ref<'merge' | 'split' | 'organize' | 'compress'>('compress')

const workflowTabs = [
  { id: 'merge', label: 'Merge', icon: Layers },
  { id: 'split', label: 'Split', icon: Scissors },
  { id: 'organize', label: 'Organize', icon: Grid3x3 },
  { id: 'compress', label: 'Compress', icon: Gauge }
] as const

interface StoredCompressAdvancedOptions {
  imageQuality: number
  maxImageDimension: number
  coordinatePrecision: number
  pruneFonts: boolean
  recompressStreams: boolean
}

const COMPRESS_ADVANCED_STORAGE_KEY = 'shifteo:compress-advanced-v1'
let storedAdvancedOptions: Partial<Record<CompressPresetKey, StoredCompressAdvancedOptions>> = {}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeStoredAdvancedOptions(value: unknown): StoredCompressAdvancedOptions | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const quality = typeof record.imageQuality === 'number' ? clampNumber(record.imageQuality, 0.5, 1) : null
  const dimension = typeof record.maxImageDimension === 'number' ? clampNumber(record.maxImageDimension, 800, 4000) : null
  const precision = typeof record.coordinatePrecision === 'number' ? clampNumber(Math.round(record.coordinatePrecision), 0, 4) : null
  const pruneFonts = typeof record.pruneFonts === 'boolean' ? record.pruneFonts : null
  const recompressStreams = typeof record.recompressStreams === 'boolean' ? record.recompressStreams : null

  if (quality === null || dimension === null || precision === null || pruneFonts === null || recompressStreams === null) {
    return null
  }

  return {
    imageQuality: quality,
    maxImageDimension: dimension,
    coordinatePrecision: precision,
    pruneFonts,
    recompressStreams
  }
}

function writeStoredAdvancedOptions() {
  if (typeof window === 'undefined') return
  try {
    const payload = JSON.stringify(storedAdvancedOptions)
    window.localStorage.setItem(COMPRESS_ADVANCED_STORAGE_KEY, payload)
  } catch (error) {
    console.warn('Failed to persist advanced controls', error)
  }
}

function loadStoredAdvancedOptions() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(COMPRESS_ADVANCED_STORAGE_KEY)
    if (!raw) {
      storedAdvancedOptions = {}
      return
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const next: Partial<Record<CompressPresetKey, StoredCompressAdvancedOptions>> = {}
    for (const preset of compressPresets.map(item => item.key) as CompressPresetKey[]) {
      const candidate = normalizeStoredAdvancedOptions(parsed[preset])
      if (candidate) {
        next[preset] = candidate
      }
    }
    storedAdvancedOptions = next
  } catch (error) {
    console.warn('Failed to load advanced controls', error)
    storedAdvancedOptions = {}
  }
}

function persistAdvancedOptions() {
  if (typeof window === 'undefined') return
  const preset = compressPreset.value
  const stored: StoredCompressAdvancedOptions = {
    imageQuality: clampNumber(Number.parseFloat(compressOptions.imageQuality.toFixed(3)), 0.5, 1),
    maxImageDimension: clampNumber(Math.round(compressOptions.maxImageDimension), 800, 4000),
    coordinatePrecision: clampNumber(Math.round(compressOptions.coordinatePrecision), 0, 4),
    pruneFonts: Boolean(compressOptions.pruneFonts),
    recompressStreams: Boolean(compressOptions.recompressStreams)
  }
  storedAdvancedOptions = {
    ...storedAdvancedOptions,
    [preset]: stored
  }
  writeStoredAdvancedOptions()
}

function removeAdvancedOptionsForPreset(preset: CompressPresetKey) {
  if (!(preset in storedAdvancedOptions)) return
  const next = { ...storedAdvancedOptions }
  delete next[preset]
  storedAdvancedOptions = next
  writeStoredAdvancedOptions()
}

onMounted(() => {
  loadStoredAdvancedOptions()
  const appliedStored = applyPresetDefaults(compressPreset.value)
  if (appliedStored) {
    compressAdvancedDirty.value = true
    persistAdvancedOptions()
  }
})

const splitFile = ref<File | null>(null)
const splitSourceId = ref<string | null>(null)
const splitThumbnail = ref<string | null>(null)
const splitPageCount = ref<number | null>(null)
const splitStage = ref('')
const splitProgress = ref(0)
const isSplitting = ref(false)
const splitPages = ref<Array<{ index: number; thumbnail: string | null; loading: boolean; selected: boolean }>>([])
const splitPagesContainer = ref<HTMLDivElement | null>(null)
const splitPdfDoc = shallowRef<any | null>(null)
const splitObserver = shallowRef<IntersectionObserver | null>(null)
const splitObservedElements = new Map<number, HTMLElement>()
const splitThumbnailPromises = new Map<number, Promise<void>>()
let splitObserverRoot: HTMLElement | null = null
let splitLoadToken = 0

const hasFiles = computed(() => mergeFiles.value.length > 0)
const canMerge = computed(() => mergeFiles.value.length >= 2 && !isMerging.value)
const totalSize = computed(() => mergeFiles.value.reduce((sum, item) => sum + item.file.size, 0))
const canCompress = computed(() => compressFile.value !== null && !isCompressing.value)
const compressPreviewJob = computed<Job | null>(() => {
  const originalBlob = compressPreviewOriginalBlob.value
  const compressedBlob = compressPreviewCompressedBlob.value
  const file = compressFile.value
  if (!originalBlob || !compressedBlob || !file) return null

  const baseName = file.name.replace(/\.pdf$/i, '')
  const beforeFile = new File([originalBlob], `${baseName}-before.png`, { type: 'image/png' })
  const afterFile = new File([compressedBlob], `${baseName}-after.png`, { type: 'image/png' })
  const now = Date.now()

  return {
    id: `compress-preview-${baseName}`,
    file: beforeFile,
    kind: 'document',
    status: 'completed',
    progress: 1,
    stage: 'Preview',
    result: afterFile,
    outputFormat: 'png',
    createdAt: now,
    completedAt: now,
    sourcePage: 0
  }
})
const organizeActivePages = computed(() => organizePages.value.filter(page => !page.removed))
const organizeCanExport = computed(() => organizeFile.value !== null && !isOrganizing.value && organizeActivePages.value.length > 0)

const selectedSplitCount = computed(() => splitPages.value.filter(page => page.selected).length)
const canSplit = computed(() => splitFile.value !== null && !isSplitting.value && selectedSplitCount.value > 0)
const mergeSourceIds = computed(() => {
  const sources = mergeFiles.value
    .map(item => item.sourceId)
    .filter((value): value is string => Boolean(value))
  return new Set(sources)
})
const queueAssignments = computed(() => {
  const map = new Map<string, string[]>()
  for (const item of pdfQueue.value) {
    map.set(item.id, [])
  }

  for (const item of mergeFiles.value) {
    if (!item.sourceId) continue
    map.get(item.sourceId)?.push('Merge')
  }

  if (splitSourceId.value) {
    map.get(splitSourceId.value)?.push('Extract')
  }

  if (organizeSourceId.value) {
    map.get(organizeSourceId.value)?.push('Organise')
  }

  if (compressSourceId.value) {
    map.get(compressSourceId.value)?.push('Compress')
  }

  return map
})
const isQueueLocked = computed(() => isMerging.value || isSplitting.value || isOrganizing.value || isCompressing.value)
const queueDragItemId = ref<string | null>(null)
const mergeDropActive = ref(false)
const splitDropActive = ref(false)
const organizeDropActive = ref(false)
const compressDropActive = ref(false)
// organizePickerOpen is now managed internally by PdfSourceSelector

watch(compressPreset, (preset) => {
  const appliedStored = applyPresetDefaults(preset)
  compressAdvancedDirty.value = appliedStored
  if (appliedStored) {
    persistAdvancedOptions()
  }
})

watch(compressOptions, () => {
  compressAdvancedDirty.value = true
  persistAdvancedOptions()
}, { deep: true })

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

const compressPresetsFormatted = computed(() => {
  return compressPresets.map(p => ({
    key: p.key,
    label: p.label.toUpperCase(),
    desc: p.key === 'light' ? 'GENTLE' : p.key === 'balanced' ? 'OPTIMIZED' : 'AGGRESSIVE'
  }))
})

const compressPresetHints: Record<string, string> = {
  light: 'Keep text sharp while trimming metadata and gently resampling images.',
  balanced: 'Downscale images to ~150 dpi and preserve vectors for viewing and print.',
  small: 'Aggressive image crunching with raster fallback when stubborn pages resist.'
}

function toggleCompressAdvanced() {
  compressAdvancedOpen.value = !compressAdvancedOpen.value
}

function resetCompressAdvanced() {
  const preset = compressPreset.value
  removeAdvancedOptionsForPreset(preset)
  applyPresetDefaults(preset, false)
  compressAdvancedDirty.value = false
}

function closeCompressPreview() {
  compressPreviewModalOpen.value = false
}

function handleCompressPreviewDownload(_job: Job) {
  const blob = compressResultBlob.value
  const file = compressFile.value
  if (!blob || !file) return
  const baseName = file.name.replace(/\.pdf$/i, '')
  const filename = lastCompressedName.value ?? `${baseName}-compressed.pdf`
  void downloadFile(blob, filename)
}

function applyPresetDefaults(preset: CompressPresetKey, includeStored = true): boolean {
  const defaults = compressPresetDefaults[preset]
  compressOptions.imageQuality = defaults.imageQuality
  compressOptions.maxImageDimension = defaults.maxImageDimension
  compressOptions.coordinatePrecision = defaults.coordinatePrecision
  compressOptions.pruneFonts = true
  compressOptions.recompressStreams = true

  if (!includeStored) {
    return false
  }

  const stored = storedAdvancedOptions[preset]
  if (stored) {
    compressOptions.imageQuality = clampNumber(stored.imageQuality, 0.5, 1)
    compressOptions.maxImageDimension = clampNumber(stored.maxImageDimension, 800, 4000)
    compressOptions.coordinatePrecision = clampNumber(Math.round(stored.coordinatePrecision), 0, 4)
    compressOptions.pruneFonts = stored.pruneFonts
    compressOptions.recompressStreams = stored.recompressStreams
    return true
  }

  return false
}

async function generateOriginalCompressionPreview(file: File) {
  const requestId = ++compressPreviewOriginalRequest
  compressPreviewLoadingOriginal.value = true
  compressPreviewOriginalBlob.value = null

  try {
    const preview = await generatePdfThumbnail(file, 1, 640)
    if (compressPreviewOriginalRequest === requestId && compressFile.value === file && preview) {
      const blob = await dataUrlToBlob(preview)
      if (compressPreviewOriginalRequest === requestId && compressFile.value === file) {
        compressPreviewOriginalBlob.value = blob
      }
    }
  } catch (error) {
    console.warn('Failed to render original preview', error)
  } finally {
    if (compressPreviewOriginalRequest === requestId) {
      compressPreviewLoadingOriginal.value = false
    }
  }
}

async function generateCompressedPreview(blob: Blob) {
  const requestId = ++compressPreviewCompressedRequest
  compressPreviewLoadingCompressed.value = true
  compressPreviewCompressedBlob.value = null

  try {
    const preview = await generatePdfThumbnail(blob, 1, 640)
    if (compressPreviewCompressedRequest === requestId && preview) {
      const imageBlob = await dataUrlToBlob(preview)
      if (compressPreviewCompressedRequest === requestId) {
        compressPreviewCompressedBlob.value = imageBlob
      }
    }
  } catch (error) {
    console.warn('Failed to render compressed preview', error)
  } finally {
    if (compressPreviewCompressedRequest === requestId) {
      compressPreviewLoadingCompressed.value = false
    }
  }
}

function enqueueMergeFiles(entries: MergeQueueEntry[]) {
  if (!entries.length) return

  const dedupeKeys = new Set<string>()
  mergeFiles.value.forEach((item) => {
    const key = item.sourceId ?? `${item.file.name}-${item.file.size}`
    dedupeKeys.add(key)
  })

  let added = 0
  let duplicateCount = 0
  let skippedCount = 0

  for (const entry of entries) {
    const file = entry instanceof File ? entry : entry.file
    const sourceId = entry instanceof File ? undefined : entry.sourceId

    if (file.type !== 'application/pdf') {
      skippedCount++
      continue
    }

    const key = sourceId ?? `${file.name}-${file.size}`
    if (dedupeKeys.has(key)) {
      duplicateCount++
      continue
    }

    dedupeKeys.add(key)
    const newItem: MergeItem = { id: generateFileId(), file, thumbnail: null, loading: true, sourceId }
    mergeFiles.value = [...mergeFiles.value, newItem]

    generatePdfThumbnail(file)
      .then((url) => {
        const target = mergeFiles.value.find(item => item.id === newItem.id)
        if (target) {
          target.thumbnail = url
          target.loading = false
        }
      })
      .catch(() => {
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
  if (duplicateCount > 0) {
    toastStore.info('Already Queued', `${duplicateCount} PDF${duplicateCount > 1 ? 's were' : ' was'} already in the merge order`)
  }
  if (skippedCount > 0) {
    toastStore.warning('Skipped File', `${skippedCount} item${skippedCount > 1 ? 's were' : ' was'} skipped because they are not PDFs`)
  }
}

function clearPageDragState() {
  isPageDragging.value = false
}

function handleQueueFilesSelected(files: File[]) {
  addFilesToQueue(files)
}

function hasFilePayload(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function handlePageDragEnter(event: DragEvent) {
  if (!hasFilePayload(event)) return
  isPageDragging.value = true
}

function handlePageDragOver(event: DragEvent) {
  if (!hasFilePayload(event)) return
  event.preventDefault()
}

function handlePageDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement | null
  const related = event.relatedTarget as Node | null
  if (current && related && current.contains(related)) {
    return
  }
  isPageDragging.value = false
}

function handlePageDrop(event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files ?? [])
  isPageDragging.value = false
  if (!files.length) return
  handleQueueFilesSelected(files)
}

function addFilesToQueue(files: File[]) {
  if (!files.length) return

  const existingKeys = new Set(pdfQueue.value.map(item => `${item.file.name}-${item.file.size}`))
  let added = 0
  let duplicateCount = 0

  for (const file of files) {
    if (file.type !== 'application/pdf') {
      toastStore.warning('Skipped File', `${file.name} is not a PDF`)
      continue
    }

    const key = `${file.name}-${file.size}`
    if (existingKeys.has(key)) {
      duplicateCount++
      continue
    }

    existingKeys.add(key)
    const item: PdfQueueItem = { id: generateFileId(), file, thumbnail: null, loading: true }
    pdfQueue.value = [...pdfQueue.value, item]

    generatePdfThumbnail(file)
      .then((url) => {
        const target = pdfQueue.value.find(entry => entry.id === item.id)
        if (target) {
          target.thumbnail = url
          target.loading = false
        }
      })
      .catch(() => {
        const target = pdfQueue.value.find(entry => entry.id === item.id)
        if (target) {
          target.thumbnail = null
          target.loading = false
        }
      })

    added++
  }

  if (added > 0) {
    toastStore.success('PDFs Added', `${added} PDF${added > 1 ? 's' : ''} added to queue`)
  }
  if (duplicateCount > 0) {
    toastStore.info('Already Queued', `${duplicateCount} PDF${duplicateCount > 1 ? 's were' : ' was'} already in the queue`)
  }
}

function findQueueItem(id: string) {
  return pdfQueue.value.find(item => item.id === id) ?? null
}

function assignQueueItemToMerge(id: string) {
  if (isMerging.value) {
    toastStore.info('Merge Running', 'Wait for the current merge to finish before adding more PDFs.')
    return
  }
  if (mergeSourceIds.value.has(id)) {
    return
  }
  const item = findQueueItem(id)
  if (!item) {
    toastStore.info('Not Available', 'Selected queue item is no longer available')
    return
  }
  enqueueMergeFiles([{ file: item.file, sourceId: id }])
}

function addAllToMerge() {
  if (isMerging.value) return
  const items = pdfQueue.value.map(item => ({ file: item.file, sourceId: item.id }))
  enqueueMergeFiles(items)
}

function handleSplitSelection(id: string) {
  if (isSplitting.value) {
    toastStore.info('Split Running', 'Wait for extraction to finish before switching PDFs.')
    return
  }
  if (!id) {
    resetSplitQueue()
    return
  }
  if (splitSourceId.value === id) {
    return
  }
  const item = findQueueItem(id)
  if (!item) {
    toastStore.info('Not Available', 'Selected queue item is no longer available')
    resetSplitQueue()
    return
  }
  void loadSplitFile(item.file, id)
}

function handleOrganizeSelection(id: string) {
  if (isOrganizing.value) {
    toastStore.info('Organising', 'Please wait for the current export to finish.')
    return
  }
  if (!id) {
    resetOrganize()
    return
  }
  if (organizeSourceId.value === id) {
    return
  }
  const item = findQueueItem(id)
  if (!item) {
    toastStore.info('Not Available', 'Selected queue item is no longer available')
    resetOrganize()
    return
  }
  void loadOrganizeFile(item.file, id)
}

function handleCompressSelection(id: string) {
  if (isCompressing.value) {
    toastStore.info('Compression Running', 'Wait for the current job to finish before switching PDFs.')
    return
  }
  if (!id) {
    resetCompression()
    return
  }
  if (compressSourceId.value === id) {
    return
  }
  const item = findQueueItem(id)
  if (!item) {
    toastStore.info('Not Available', 'Selected queue item is no longer available')
    resetCompression()
    return
  }
  loadCompressFile(item.file, id)
}

function isQueueDrag(event: DragEvent): boolean {
  const types = Array.from(event.dataTransfer?.types ?? [])
  return types.includes(QUEUE_DRAG_MIME) || types.includes('text/plain') && !!queueDragItemId.value
}

function readQueueDragId(event: DragEvent): string | null {
  const dataTransfer = event.dataTransfer
  if (!dataTransfer) return queueDragItemId.value
  const id = dataTransfer.getData(QUEUE_DRAG_MIME) || dataTransfer.getData('text/plain')
  return id || queueDragItemId.value
}

function handleQueueDragStart(event: DragEvent, id: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData(QUEUE_DRAG_MIME, id)
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'copy'
  }
  queueDragItemId.value = id
}

function handleQueueDragEnd() {
  queueDragItemId.value = null
  mergeDropActive.value = false
  splitDropActive.value = false
  organizeDropActive.value = false
  compressDropActive.value = false
}

// All picker state is now managed internally by PdfSourceSelector components

// Merge drop zone drag handlers removed (now handled by WorkflowSection)

function handleMergeDropZoneDrop(event: DragEvent) {
  if (!isQueueDrag(event)) return
  event.preventDefault()
  mergeDropActive.value = false
  const id = readQueueDragId(event)
  if (!id) return
  assignQueueItemToMerge(id)
}

// Split drop zone drag handlers removed (now handled by WorkflowSection)

function handleSplitDropZoneDrop(event: DragEvent) {
  if (!isQueueDrag(event)) return
  event.preventDefault()
  splitDropActive.value = false
  const id = readQueueDragId(event)
  if (!id) return
  handleSplitSelection(id)
}

// Organize drop zone drag handlers removed (now handled by WorkflowSection)

function handleOrganizeDropZoneDrop(event: DragEvent) {
  if (!isQueueDrag(event)) return
  event.preventDefault()
  organizeDropActive.value = false
  const id = readQueueDragId(event)
  if (!id) return
  handleOrganizeSelection(id)
}

// Compress drop zone drag handlers removed (now handled by WorkflowSection)

function handleCompressDropZoneDrop(event: DragEvent) {
  if (!isQueueDrag(event)) return
  event.preventDefault()
  compressDropActive.value = false
  const id = readQueueDragId(event)
  if (!id) return
  handleCompressSelection(id)
}

function previewQueueItem(item: PdfQueueItem) {
  if (typeof window === 'undefined') return
  const url = URL.createObjectURL(item.file)
  const opened = window.open(url, '_blank', 'noopener')
  if (!opened) {
    toastStore.info('Preview blocked', 'Allow popups to preview PDFs in a new tab.')
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function downloadQueueItem(item: PdfQueueItem) {
  void downloadFile(item.file, item.file.name)
}

function removeQueueItem(id: string) {
  if (isQueueLocked.value) return

  const item = findQueueItem(id)
  if (!item) return

  if (mergeSourceIds.value.has(id)) {
    mergeFiles.value = mergeFiles.value.filter(entry => entry.sourceId !== id)
  }

  if (splitSourceId.value === id && !isSplitting.value) {
    resetSplitQueue()
  }

  if (organizeSourceId.value === id && !isOrganizing.value) {
    resetOrganize()
  }

  if (compressSourceId.value === id && !isCompressing.value) {
    resetCompression()
  }

  pdfQueue.value = pdfQueue.value.filter(entry => entry.id !== id)
  toastStore.info('Removed from Queue', `${item.file.name} removed`)
}

function clearPdfQueue() {
  if (isQueueLocked.value) return

  pdfQueue.value = []

  if (!isMerging.value) {
    resetQueue()
  }

  if (!isSplitting.value) {
    resetSplitQueue()
  }

  if (!isOrganizing.value) {
    resetOrganize()
  }

  if (!isCompressing.value) {
    resetCompression()
  }

  toastStore.info('Queue Cleared', 'All queued PDFs removed')
}

function loadCompressFile(file: File, sourceId?: string) {
  compressFile.value = file
  compressSourceId.value = sourceId ?? null
  compressPreset.value = 'light'
  compressAdvancedOpen.value = false
  const appliedStored = applyPresetDefaults(compressPreset.value)
  compressAdvancedDirty.value = appliedStored
  if (appliedStored) {
    persistAdvancedOptions()
  }
  compressStats.value = null
  compressReport.value = null
  compressStage.value = ''
  compressProgress.value = 0
  lastCompressedName.value = null
  compressPreviewModalOpen.value = false
  compressPreviewOriginalBlob.value = null
  compressPreviewCompressedBlob.value = null
  compressResultBlob.value = null
  compressPreviewOriginalRequest++
  compressPreviewCompressedRequest++
  compressPreviewLoadingOriginal.value = false
  compressPreviewLoadingCompressed.value = false
  void generateOriginalCompressionPreview(file)
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

function handleMergeReorder(sourceId: string, targetId: string) {
  if (!sourceId || sourceId === targetId) return

  const items = [...mergeFiles.value]
  const sourceIndex = items.findIndex(item => item.id === sourceId)
  const targetIndex = items.findIndex(item => item.id === targetId)
  if (sourceIndex === -1 || targetIndex === -1) return
  const moved = items.splice(sourceIndex, 1)[0]
  if (!moved) return
  items.splice(targetIndex, 0, moved)
  mergeFiles.value = items
}

// Merge drag handlers removed (now handled by MergeList component)

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
  compressSourceId.value = null
  compressFile.value = null
  compressAdvancedOpen.value = false
  compressAdvancedDirty.value = false
  compressPreset.value = 'light'
  const preset = compressPreset.value
  removeAdvancedOptionsForPreset(preset)
  applyPresetDefaults(preset, false)
  compressStats.value = null
  compressReport.value = null
  compressStage.value = ''
  compressProgress.value = 0
  lastCompressedName.value = null
  compressPreviewModalOpen.value = false
  compressPreviewOriginalBlob.value = null
  compressPreviewCompressedBlob.value = null
  compressResultBlob.value = null
  compressPreviewOriginalRequest++
  compressPreviewCompressedRequest++
  compressPreviewLoadingOriginal.value = false
  compressPreviewLoadingCompressed.value = false
}

function resetSplitQueue() {
  if (isSplitting.value) return
  splitLoadToken++
  disposeSplitObserver()
  destroySplitPdfDoc()
  splitSourceId.value = null
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

// Lazy-loading observer registration functions removed (handled in components)

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

async function generatePdfThumbnail(source: Blob, pageNumber = 1, targetWidth = 140): Promise<string | null> {
  try {
    const pdfjs = await loadPdfJs()
    const data = await source.arrayBuffer()
    const loadingTask = pdfjs.getDocument({ data })
    const pdf = await loadingTask.promise
    const result = await renderPdfPageThumbnail(pdf, pageNumber, targetWidth)
    pdf.destroy?.()
    return result
  } catch (error) {
    console.warn('Failed to generate PDF thumbnail', error)
    return null
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  if (!response.ok) {
    throw new Error(`Failed to convert data URL to blob: ${response.status}`)
  }
  return await response.blob()
}

async function loadSplitFile(file: File, sourceId?: string) {
  const requestId = ++splitLoadToken
  disposeSplitObserver()
  destroySplitPdfDoc()
  splitPages.value = []
  splitThumbnail.value = null
  splitPageCount.value = null
  splitFile.value = file
  splitSourceId.value = sourceId ?? null
  splitStage.value = 'Analysing document'
  splitProgress.value = 0

  try {
    const pdfjs = await loadPdfJs()
    if (requestId !== splitLoadToken) {
      return
    }

    const data = await file.arrayBuffer()
    if (requestId !== splitLoadToken) {
      return
    }

    const loadingTask = pdfjs.getDocument({ data })
    const pdf = await loadingTask.promise
    if (requestId !== splitLoadToken) {
      pdf.destroy?.()
      return
    }

    splitPdfDoc.value = pdf
    const total = (pdf as { numPages?: number; getPageCount?: () => number }).numPages ?? pdf.getPageCount?.() ?? 0
    splitPageCount.value = total

    if (requestId !== splitLoadToken) {
      return
    }

    splitPages.value = Array.from({ length: total }, (_, index) => ({
      index: index + 1,
      thumbnail: null,
      loading: false,
      selected: true
    }))

    queueMicrotask(() => {
      if (requestId !== splitLoadToken) return
      loadSplitPageThumbnail(1)
      for (let i = 2; i <= Math.min(total, 8); i++) {
        loadSplitPageThumbnail(i)
      }
    })
  } catch (error) {
    if (requestId !== splitLoadToken) {
      return
    }
    console.warn('Failed to analyse PDF for split', error)
    splitPageCount.value = null
    splitThumbnail.value = null
    destroySplitPdfDoc()
    splitPages.value = []
  }

  if (requestId !== splitLoadToken) {
    return
  }

  splitStage.value = ''
  splitProgress.value = 0
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
  compressReport.value = null
  compressPreviewModalOpen.value = false
  compressPreviewCompressedRequest++
  compressPreviewCompressedBlob.value = null
  compressResultBlob.value = null
  compressPreviewLoadingCompressed.value = false

  try {
    const taskOptions = {
      imageQuality: Number.parseFloat(compressOptions.imageQuality.toFixed(3)),
      maxImageDimension: Math.round(compressOptions.maxImageDimension),
      coordinatePrecision: Math.round(compressOptions.coordinatePrecision),
      pruneFonts: compressOptions.pruneFonts,
      recompressStreams: compressOptions.recompressStreams
    }

    const result = await pdfWorkerPool.run(file, {
      kind: 'pdf_compress',
      preset: targetPreset,
      options: taskOptions
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
    compressResultBlob.value = blob
    if (result.stats) {
      const stats = result.stats as PdfCompressionStats
      compressStats.value = {
        original: stats.originalBytes,
        result: stats.compressedBytes
      }
      compressReport.value = stats
    } else {
      compressReport.value = null
      compressStats.value = { original: file.size, result: blob.size }
    }

    const statsSnapshot = compressStats.value
    const originalSize = statsSnapshot ? statsSnapshot.original : file.size
    const compressedSize = statsSnapshot ? statsSnapshot.result : blob.size

    const savedBytes = Math.max(0, originalSize - compressedSize)
    const savedPercent = originalSize > 0 ? (savedBytes / originalSize) * 100 : 0
    const percentLabel = savedPercent <= 0
      ? '0%'
      : savedPercent >= 10
        ? `${Math.round(savedPercent)}%`
        : `${savedPercent.toFixed(1)}%`

    const baseName = file.name.replace(/\.pdf$/i, '')
    const filename = result.filename ?? `${baseName}-${targetPreset}.pdf`
    void generateCompressedPreview(blob)
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

function resetOrganize() {
  if (isOrganizing.value) return
  organizeLoadToken++
  disposeOrganizeObserver()
  destroyOrganizePdfDoc()
  organizePages.value = []
  organizeFile.value = null
  organizeSourceId.value = null
  organizeStage.value = ''
  organizeProgress.value = 0
  organizeLastOutputName.value = null
}

function destroyOrganizePdfDoc() {
  if (organizePdfDoc.value) {
    try {
      organizePdfDoc.value.destroy?.()
    } catch (error) {
      console.warn('Failed to destroy PDF document', error)
    }
    organizePdfDoc.value = null
  }
  organizeThumbnailPromises.clear()
}

function disposeOrganizeObserver() {
  if (organizeObserver.value) {
    organizeObserver.value.disconnect()
    organizeObserver.value = null
  }
  organizeObservedElements.clear()
}

function ensureOrganizeObserver(root: HTMLElement | null) {
  if (typeof IntersectionObserver === 'undefined') return
  const nextRoot = root ?? null
  if (organizeObserver.value && organizeObserver.value.root === nextRoot) return

  if (organizeObserver.value) {
    organizeObserver.value.disconnect()
  }

  organizeObserver.value = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const el = entry.target as HTMLElement
      const pageAttr = el.dataset.pageIndex
      const pageIndex = pageAttr ? Number.parseInt(pageAttr, 10) : NaN
      if (!Number.isNaN(pageIndex)) {
        loadOrganizePageThumbnail(pageIndex)
      }
    }
  }, {
    root: nextRoot,
    rootMargin: '160px',
    threshold: 0.1
  })

  for (const element of organizeObservedElements.values()) {
    organizeObserver.value.observe(element)
  }
}

// registerOrganizeCard removed (lazy-loading now handled internally)

function loadOrganizePageThumbnail(pageNumber: number) {
  const page = organizePages.value.find(item => item.originalIndex === pageNumber)
  if (!page || page.thumbnail || page.loading) return
  const pdf = organizePdfDoc.value
  if (!pdf) return
  if (organizeThumbnailPromises.has(pageNumber)) return

  page.loading = true
  const promise = renderPdfPageThumbnail(pdf, pageNumber)
    .then((thumb) => {
      page.thumbnail = thumb
    })
    .catch((error) => {
      console.warn('Failed to render organize thumbnail', error)
      page.thumbnail = null
    })
    .finally(() => {
      page.loading = false
      organizeThumbnailPromises.delete(pageNumber)
    })

  organizeThumbnailPromises.set(pageNumber, promise)
}

function handleOrganizeReorder(sourceId: number, targetId: number) {
  if (!sourceId || sourceId === targetId) return

  const pages = [...organizePages.value]
  const fromIndex = pages.findIndex(page => page.id === sourceId)
  const toIndex = pages.findIndex(page => page.id === targetId)
  if (fromIndex === -1 || toIndex === -1) return
  const [moved] = pages.splice(fromIndex, 1)
  if (!moved) return
  pages.splice(toIndex, 0, moved)
  organizePages.value = pages
}

// Organize drag handlers removed (now handled by OrganizeGrid component)

function rotateOrganizePage(pageId: number, direction: 'left' | 'right') {
  const page = organizePages.value.find(item => item.id === pageId)
  if (!page || isOrganizing.value) return
  const delta = direction === 'left' ? -90 : 90
  const rotated = ((page.rotation + delta) % 360 + 360) % 360
  page.rotation = rotated
}

function toggleOrganizePageRemoved(pageId: number) {
  const page = organizePages.value.find(item => item.id === pageId)
  if (!page || isOrganizing.value) return
  page.removed = !page.removed
}

// organizeRotationStyle removed (now handled in OrganizeGrid component)

async function loadOrganizeFile(file: File, sourceId?: string) {
  resetOrganize()
  const requestId = ++organizeLoadToken
  organizeFile.value = file
  organizeSourceId.value = sourceId ?? null
  organizeStage.value = 'Analysing document'
  organizeProgress.value = 0

  try {
    const pdfjs = await loadPdfJs()
    if (requestId !== organizeLoadToken) {
      return
    }
    const data = await file.arrayBuffer()
    if (requestId !== organizeLoadToken) {
      return
    }
    const loadingTask = pdfjs.getDocument({ data })
    const pdf = await loadingTask.promise
    if (requestId !== organizeLoadToken) {
      pdf.destroy?.()
      return
    }
    organizePdfDoc.value = pdf
    const total = (pdf as { numPages?: number; getPageCount?: () => number }).numPages ?? pdf.getPageCount?.() ?? 0

    organizePages.value = Array.from({ length: total }, (_, index) => ({
      id: index + 1,
      originalIndex: index + 1,
      rotation: 0,
      removed: false,
      thumbnail: null,
      loading: false
    }))

    queueMicrotask(() => {
      if (requestId !== organizeLoadToken) return
      for (let i = 1; i <= Math.min(total, 8); i++) {
        loadOrganizePageThumbnail(i)
      }
    })
  } catch (error) {
    if (requestId !== organizeLoadToken) {
      return
    }
    console.warn('Failed to analyse PDF for organize', error)
    toastStore.error('Failed to load PDF', 'Could not prepare pages for organisation')
    resetOrganize()
    return
  }

  if (requestId !== organizeLoadToken) {
    return
  }

  organizeStage.value = ''
  organizeProgress.value = 0
  organizeDragSourceId.value = null
  organizeDragOverId.value = null
}

async function startOrganize() {
  const file = organizeFile.value
  if (!file || !organizeCanExport.value) {
    toastStore.info('Nothing to organise', 'Select a PDF and keep at least one page to export.')
    return
  }

  const order = organizePages.value.filter(page => !page.removed).map(page => page.originalIndex)
  if (!order.length) {
    toastStore.error('No Pages Selected', 'Keep at least one page to export')
    return
  }

  const rotations: Record<number, number> = {}
  organizePages.value.forEach((page) => {
    if (page.rotation % 360 !== 0) {
      rotations[page.originalIndex] = page.rotation
    }
  })

  isOrganizing.value = true
  organizeStage.value = 'Rebuilding document'
  organizeProgress.value = 0

  try {
    const result = await pdfWorkerPool.run(file, {
      kind: 'pdf_organize',
      order,
      rotations
    }, {
      onProgress: (progress) => {
        organizeProgress.value = progress
      },
      onStage: (stage) => {
        organizeStage.value = stage
      }
    })

    if (!(result.blob instanceof Blob)) {
      toastStore.warning('No Output', 'Organize operation returned no data')
      return
    }

    const blob = result.blob as Blob
    const baseName = file.name.replace(/\.pdf$/i, '')
    const filename = result.filename ?? `${baseName}-organised.pdf`
    await downloadFile(blob, filename)
    organizeLastOutputName.value = filename
    toastStore.success('Pages Organised', `${filename} downloaded`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to organise PDF'
    toastStore.error('Organise Failed', message)
  } finally {
    isOrganizing.value = false
    organizeStage.value = ''
    organizeProgress.value = 0
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

function toggleSplitPage(index: number) {
  const page = splitPages.value.find(item => item.index === index)
  if (!page || page.loading) return
  page.selected = !page.selected
}

function selectSplitPageRange(start: number, end: number) {
  splitPages.value = splitPages.value.map(page => {
    if (page.index >= start && page.index <= end) {
      return { ...page, selected: true }
    }
    return page
  })
}

// Legacy pointer handlers removed (now handled by SplitPageGrid component)

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

watch(organizePagesContainer, (root) => {
  if (root) {
    ensureOrganizeObserver(root)
  }
})

// Picker state is now managed internally by PdfSourceSelector components

onBeforeUnmount(() => {
  disposeSplitObserver()
  destroySplitPdfDoc()
  disposeOrganizeObserver()
  destroyOrganizePdfDoc()
})

</script>

