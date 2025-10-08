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
            <Grid3x3 :size="16" />
            <span>Organize Pages (beta)</span>
          </div>
          <span class="panel__meta">Reorder, rotate, or remove pages before exporting</span>
        </template>

        <div class="space-y-6">
          <div class="flex flex-wrap items-center gap-3">
            <UiButton type="button" size="sm" :disabled="isOrganizing" @click="triggerOrganizeFileDialog">
              Choose PDF
            </UiButton>
            <UiButton
              type="button"
              size="sm"
              variant="quiet"
              tone="warning"
              :disabled="!organizeFile || isOrganizing"
              @click="resetOrganize"
            >
              Reset
            </UiButton>
            <span v-if="organizeFile" class="body-text text-text-muted">
              {{ organizeFile.name }} · {{ formatFileSize(organizeFile.size) }}
            </span>
            <span v-if="organizeLastOutputName" class="body-text text-text-secondary">Last output: {{ organizeLastOutputName }}</span>
          </div>

          <p class="body-text text-text-muted text-sm">
            Drag thumbnails to reorder pages. Rotate or remove any page before exporting the new PDF.
          </p>

          <input
            ref="organizeInputRef"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="handleOrganizeFileChange"
          />

          <div
            v-if="organizePages.length > 0"
            ref="organizePagesContainer"
            class="organize-grid"
          >
            <article
              v-for="(page, index) in organizePages"
              :key="page.id"
              class="organize-card"
              :class="{
                'organize-card--removed': page.removed,
                'organize-card--dragging': organizeDragSourceId === page.id,
                'organize-card--over': organizeDragOverId === page.id
              }"
              :draggable="!page.loading && !isOrganizing"
              @dragstart="handleOrganizeDragStart($event, page.id)"
              @dragover="handleOrganizeDragOver($event, page.id)"
              @dragenter="handleOrganizeDragEnter($event, page.id)"
              @dragleave="handleOrganizeDragLeave($event, page.id)"
              @drop="handleOrganizeDrop($event, page.id)"
              @dragend="handleOrganizeDragEnd"
              :aria-grabbed="organizeDragSourceId === page.id"
              :aria-label="`Page ${index + 1}`"
              :ref="el => registerOrganizeCard(el, page.originalIndex)"
            >
              <header class="organize-card__header">
                <span class="organize-card__index">{{ index + 1 }}</span>
                <span class="organize-card__meta">Page {{ page.originalIndex }}</span>
              </header>
              <div class="organize-card__thumb" aria-hidden="true">
                <div v-if="page.loading" class="organize-card__thumb-placeholder">Loading…</div>
                <div v-else-if="page.thumbnail" class="organize-card__thumb-inner" :style="organizeRotationStyle(page)">
                  <img :src="page.thumbnail" alt="" />
                </div>
                <div v-else class="organize-card__thumb-placeholder">No preview</div>
                <div v-if="page.removed" class="organize-card__removed-banner">Removed</div>
              </div>
              <footer class="organize-card__actions">
                <UiButton
                  type="button"
                  size="sm"
                  variant="quiet"
                  icon-only
                  :disabled="page.loading || isOrganizing"
                  @click="rotateOrganizePage(page.id, 'left')"
                  title="Rotate counter-clockwise"
                >
                  <RotateCcw :size="16" />
                </UiButton>
                <UiButton
                  type="button"
                  size="sm"
                  variant="quiet"
                  icon-only
                  :disabled="page.loading || isOrganizing"
                  @click="rotateOrganizePage(page.id, 'right')"
                  title="Rotate clockwise"
                >
                  <RotateCw :size="16" />
                </UiButton>
                <UiButton
                  type="button"
                  size="sm"
                  variant="quiet"
                  icon-only
                  :tone="page.removed ? 'success' : 'warning'"
                  :disabled="isOrganizing"
                  @click="toggleOrganizePageRemoved(page.id)"
                  :title="page.removed ? 'Restore page' : 'Remove page'"
                >
                  <Undo2 v-if="page.removed" :size="16" />
                  <Trash2 v-else :size="16" />
                </UiButton>
              </footer>
              <div class="organize-card__rotation" v-if="page.rotation !== 0">
                Rotated {{ page.rotation }}°
              </div>
            </article>
          </div>

          <div v-else class="organize-empty">
            <p class="body-text text-text-muted">Choose a PDF to start organising its pages.</p>
          </div>

          <div v-if="isOrganizing" class="organize-progress">
            <div class="organize-progress__bar">
              <div class="organize-progress__fill" :style="{ width: `${Math.round(organizeProgress * 100)}%` }" />
            </div>
            <div class="organize-progress__label">
              {{ organizeStage || 'Preparing...' }}
              <span v-if="organizeProgress > 0"> · {{ Math.round(organizeProgress * 100) }}%</span>
            </div>
          </div>

          <UiButton
            type="button"
            size="md"
            tone="accent"
            :disabled="!organizeCanExport"
            @click="startOrganize"
          >
            Export Organised PDF
          </UiButton>
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

          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="body-text text-text-muted text-sm">
                All compression runs locally in your browser worker—drop in a PDF, select a preset, and download the optimised result.
              </p>
              <p class="text-xs text-text-secondary">
                Light and Balanced keep vector text intact by compressing embedded images; Smallest falls back to rasterising pages when necessary.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UiButton
                type="button"
                size="sm"
                variant="quiet"
                class="compress-advanced__toggle-btn"
                @click="toggleCompressAdvanced"
              >
                {{ compressAdvancedOpen ? 'Hide advanced controls' : 'Advanced controls' }}
              </UiButton>
              <UiButton
                v-if="false"
                type="button"
                size="sm"
                variant="quiet"
                class="compress-advanced__toggle-btn"
                :disabled="!canOpenPreview"
                @click="openCompressPreview"
              >
                <Eye :size="16" />
                <span>Compare preview</span>
              </UiButton>
            </div>
          </div>

          <input
            ref="compressInputRef"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="handleCompressFileChange"
          />

          <div v-if="compressAdvancedOpen" class="compress-advanced">
            <div class="compress-advanced__row">
              <div class="compress-advanced__label">
                <span class="body-text text-text-secondary uppercase tracking-wider">Image Quality</span>
                <span class="mono">{{ Math.round(compressOptions.imageQuality * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.01"
                v-model.number="compressOptions.imageQuality"
                @input="markCompressAdvancedDirty"
                class="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line-hair)]
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-bg-canvas)]
                       [&::-webkit-slider-thumb]:bg-[var(--color-acc-error)] [&::-webkit-slider-thumb]:transition-shadow
                       [&::-webkit-slider-thumb]:hover:shadow-glow
                       [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-acc-error)]"
                title="Adjust JPEG recompression quality"
              />
            </div>

            <div class="compress-advanced__row">
              <div class="compress-advanced__label">
                <span class="body-text text-text-secondary uppercase tracking-wider">Max Image Dimension</span>
                <span class="mono">{{ Math.round(compressOptions.maxImageDimension) }} px</span>
              </div>
              <input
                type="range"
                min="800"
                max="3200"
                step="10"
                v-model.number="compressOptions.maxImageDimension"
                @input="markCompressAdvancedDirty"
                class="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line-hair)]
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-bg-canvas)]
                       [&::-webkit-slider-thumb]:bg-[var(--color-acc-error)] [&::-webkit-slider-thumb]:transition-shadow
                       [&::-webkit-slider-thumb]:hover:shadow-glow
                       [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-acc-error)]"
                title="Clamp embedded image dimensions to control resolution"
              />
            </div>

            <div class="compress-advanced__row">
              <div class="compress-advanced__label">
                <span class="body-text text-text-secondary uppercase tracking-wider">Coordinate Precision</span>
                <span class="mono">{{ compressOptions.coordinatePrecision }} decimals</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                v-model.number="compressOptions.coordinatePrecision"
                @input="markCompressAdvancedDirty"
                class="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line-hair)]
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-bg-canvas)]
                       [&::-webkit-slider-thumb]:bg-[var(--color-acc-error)] [&::-webkit-slider-thumb]:transition-shadow
                       [&::-webkit-slider-thumb]:hover:shadow-glow
                       [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--color-acc-error)]"
                title="Trim vector coordinate decimals to shrink streams"
              />
            </div>

            <div class="compress-advanced__toggles">
              <label class="compress-advanced__checkbox">
                <span class="checkbox">
                  <input
                    type="checkbox"
                    v-model="compressOptions.pruneFonts"
                    @change="markCompressAdvancedDirty"
                    title="Remove unused font definitions to trim file size"
                  />
                  <span class="checkbox__mark" />
                </span>
                Prune unused fonts
              </label>
              <label class="compress-advanced__checkbox">
                <span class="checkbox">
                  <input
                    type="checkbox"
                    v-model="compressOptions.recompressStreams"
                    @change="markCompressAdvancedDirty"
                    title="Recompress text drawing commands for leaner streams"
                  />
                  <span class="checkbox__mark" />
                </span>
                Recompress text streams
              </label>
            </div>

            <div class="compress-advanced__foot">
              <span class="text-xs text-text-muted">Tweaks apply on top of the selected preset.</span>
              <UiButton
                type="button"
                size="sm"
                variant="quiet"
                class="compress-advanced__toggle-btn"
                :disabled="!compressAdvancedDirty"
                @click="resetCompressAdvanced"
              >Reset to preset defaults</UiButton>
            </div>
          </div>

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

          <div v-if="compressReport" class="compress-report">
            <div class="compress-report__header">
              <div>
                <span class="compress-report__label">Original</span>
                <span class="compress-report__value">{{ formatFileSize(compressReport.originalBytes) }}</span>
              </div>
              <div>
                <span class="compress-report__label">Output</span>
                <span class="compress-report__value">{{ formatFileSize(compressReport.compressedBytes) }}</span>
              </div>
              <div>
                <span class="compress-report__label">Saved</span>
                <span class="compress-report__value">
                  {{ compressSavings ? formatFileSize(compressSavings.savedBytes) : '0 B' }}
                  <span v-if="compressSavings" class="text-text-secondary">({{ compressSavings.percent }})</span>
                </span>
              </div>
            </div>
            <div class="compress-report__grid">
              <span><strong>{{ compressReport.fontsRemoved }}</strong> fonts removed</span>
              <span><strong>{{ compressReport.imagesDownscaled }}</strong> images downscaled</span>
              <span
                class="compress-report__badge"
                :class="{ 'compress-report__badge--warning': compressReport.rasterFallbackUsed }"
              >
                {{ compressReport.rasterFallbackUsed ? 'Raster fallback used' : 'Vectors preserved' }}
              </span>
            </div>
            <div class="compress-report__options">
              <span class="compress-report__option">Quality {{ Math.round(compressReport.options.imageQuality * 100) }}%</span>
              <span class="compress-report__option">Max image {{ compressReport.options.maxImageDimension }}px</span>
              <span class="compress-report__option">Precision {{ compressReport.options.coordinatePrecision }} dec.</span>
              <span class="compress-report__option">{{ compressReport.options.pruneFonts ? 'Fonts pruned' : 'Fonts preserved' }}</span>
            </div>
            <div v-if="hasCompressionDetails" class="compress-report__details">
              <section v-if="compressMetadataRemoved.length" class="compress-report__group">
                <h4 class="compress-report__group-title">Metadata removed</h4>
                <ul>
                  <li v-for="(item, index) in compressMetadataRemoved" :key="`${item}-${index}`">{{ item }}</li>
                </ul>
              </section>
              <section v-if="compressFontsRemovedList.length" class="compress-report__group">
                <h4 class="compress-report__group-title">Fonts removed</h4>
                <ul>
                  <li v-for="(item, index) in compressFontsRemovedList" :key="`${item}-${index}`">{{ item }}</li>
                </ul>
              </section>
              <section v-if="compressImageHighlights.length" class="compress-report__group">
                <header class="compress-report__group-meta">
                  <h4 class="compress-report__group-title">Images optimised</h4>
                  <span class="compress-report__group-saved">Saved {{ compressImageBytesSavedLabel }}</span>
                </header>
                <ul>
                  <li
                    v-for="(change, index) in compressImageHighlights"
                    :key="`${change.name ?? 'image'}-${index}`"
                  >
                    <span class="compress-report__detail-name">{{ change.name ?? `Image ${index + 1}` }}</span>
                    <span class="compress-report__detail-meta">
                      {{ change.before.width }}×{{ change.before.height }} → {{ change.after.width }}×{{ change.after.height }}
                    </span>
                    <span class="compress-report__detail-saved">Saved {{ formatFileSize(change.savedBytes) }}</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
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

  <ImagePreviewModal
    :job="compressPreviewJob"
    :isOpen="compressPreviewModalOpen"
    @close="closeCompressPreview"
    @download="handleCompressPreviewDownload"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiPanel from '@/components/ui/UiPanel.vue'
import { useToastStore } from '@/app/stores/toast'
import { pdfWorkerPool } from '@/workers/pdfWorkerPool'
import { downloadAsZip, downloadFile, generateFileId } from '@/utils/file'
import { formatFileSize } from '@/utils/format'
import { FileText, Upload, ArrowUp, ArrowDown, Trash2, Scissors, Gauge, Eye, Grid3x3, RotateCcw, RotateCw, Undo2 } from 'lucide-vue-next'
import ImagePreviewModal from '@/components/ImagePreviewModal.vue'
import type { Job, PdfCompressionStats } from '@/workers/types'

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

interface OrganizePage {
  id: number
  originalIndex: number
  rotation: number
  removed: boolean
  thumbnail: string | null
  loading: boolean
}

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
const organizeInputRef = ref<HTMLInputElement | null>(null)
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
const compressOriginalBytes = computed(() => {
  if (compressReport.value) return compressReport.value.originalBytes
  const file = compressFile.value
  return file ? file.size : 0
})
const compressCompressedBytes = computed(() => {
  if (compressReport.value) return compressReport.value.compressedBytes
  const stats = compressStats.value
  return stats ? stats.result : 0
})
const compressOriginalSizeLabel = computed(() => {
  const value = compressOriginalBytes.value
  return value > 0 ? formatFileSize(value) : '—'
})
const compressCompressedSizeLabel = computed(() => {
  const value = compressCompressedBytes.value
  return value > 0 ? formatFileSize(value) : '—'
})
const canOpenPreview = computed(() => Boolean(
  compressPreviewOriginalBlob.value &&
  compressPreviewCompressedBlob.value &&
  !compressPreviewLoadingOriginal.value &&
  !compressPreviewLoadingCompressed.value &&
  !isCompressing.value
))
const compressMetadataRemoved = computed(() => compressReport.value?.details.metadataKeysRemoved ?? [])
const compressFontsRemovedList = computed(() => compressReport.value?.details.fontsRemoved ?? [])
const compressImageHighlights = computed(() => {
  const items = compressReport.value?.details.imageChanges ?? []
  return items.slice(0, 4)
})
const compressImageBytesSavedLabel = computed(() => {
  const value = compressReport.value?.details.imageBytesSaved ?? 0
  return value > 0 ? formatFileSize(value) : '—'
})
const hasCompressionDetails = computed(() =>
  compressMetadataRemoved.value.length > 0
  || compressFontsRemovedList.value.length > 0
  || compressImageHighlights.value.length > 0
)
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

watch(compressPreset, (preset) => {
  const appliedStored = applyPresetDefaults(preset)
  compressAdvancedDirty.value = appliedStored
  if (appliedStored) {
    persistAdvancedOptions()
  }
})

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

function toggleCompressAdvanced() {
  compressAdvancedOpen.value = !compressAdvancedOpen.value
}

function markCompressAdvancedDirty() {
  compressAdvancedDirty.value = true
  persistAdvancedOptions()
}

function resetCompressAdvanced() {
  const preset = compressPreset.value
  removeAdvancedOptionsForPreset(preset)
  applyPresetDefaults(preset, false)
  compressAdvancedDirty.value = false
}

function openCompressPreview() {
  if (!compressPreviewJob.value) {
    toastStore.info('Preview Unavailable', 'Run a compression to generate comparison imagery first.')
    return
  }
  compressPreviewModalOpen.value = true
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

function handleOperation(operation: OperationCard) {
  if (operation.key === 'merge') {
    triggerFileDialog()
    return
  }
  if (operation.key === 'split') {
    triggerSplitFileDialog()
    return
  }
  if (operation.key === 'organize') {
    triggerOrganizeFileDialog()
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

function resolveHTMLElement(el: HTMLElement | Element | ComponentPublicInstance | null): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  const component = el as ComponentPublicInstance
  const possible = component?.$el
  return possible instanceof HTMLElement ? possible : null
}

function registerSplitCard(el: HTMLElement | Element | ComponentPublicInstance | null, pageIndex: number) {
  const element = resolveHTMLElement(el)
  const index = Math.max(1, Math.floor(pageIndex))
  if (element) {
    ensureSplitObserver(splitPagesContainer.value)
    element.dataset.pageIndex = String(index)
    const previous = splitObservedElements.get(index)
    if (previous && previous !== element) {
      splitObserver.value?.unobserve(previous)
    }
    splitObservedElements.set(index, element)
    splitObserver.value?.observe(element)
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

function triggerOrganizeFileDialog() {
  if (isOrganizing.value) return
  organizeInputRef.value?.click()
}

function resetOrganize() {
  if (isOrganizing.value) return
  disposeOrganizeObserver()
  destroyOrganizePdfDoc()
  organizePages.value = []
  organizeFile.value = null
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

function registerOrganizeCard(el: Element | ComponentPublicInstance | null, pageIndex: number) {
  const element = resolveHTMLElement(el as any)
  const index = Math.max(1, Math.floor(pageIndex))
  if (element) {
    ensureOrganizeObserver(organizePagesContainer.value)
    element.dataset.pageIndex = String(index)
    const previous = organizeObservedElements.get(index)
    if (previous && previous !== element) {
      organizeObserver.value?.unobserve(previous)
    }
    organizeObservedElements.set(index, element)
    organizeObserver.value?.observe(element)
    if (index <= 6) {
      loadOrganizePageThumbnail(index)
    }
  } else {
    const existing = organizeObservedElements.get(index)
    if (existing) {
      organizeObserver.value?.unobserve(existing)
      organizeObservedElements.delete(index)
    }
  }
}

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

function handleOrganizeDragStart(event: DragEvent, pageId: number) {
  if (isOrganizing.value) return
  organizeDragSourceId.value = pageId
  event.dataTransfer?.setData('text/plain', String(pageId))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleOrganizeDragOver(event: DragEvent, pageId: number) {
  if (isOrganizing.value) return
  event.preventDefault()
  organizeDragOverId.value = pageId
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleOrganizeDragEnter(event: DragEvent, pageId: number) {
  if (isOrganizing.value) return
  event.preventDefault()
  if (organizeDragOverId.value !== pageId) {
    organizeDragOverId.value = pageId
  }
}

function handleOrganizeDragLeave(event: DragEvent, pageId: number) {
  if (isOrganizing.value) return
  const related = event.relatedTarget as Node | null
  const currentTarget = event.currentTarget as HTMLElement | null
  if (currentTarget && related && currentTarget.contains(related)) {
    return
  }
  if (organizeDragOverId.value === pageId) {
    organizeDragOverId.value = null
  }
}

function handleOrganizeDrop(event: DragEvent, pageId: number) {
  if (isOrganizing.value) return
  event.preventDefault()
  const sourceId = organizeDragSourceId.value
  organizeDragSourceId.value = null
  organizeDragOverId.value = null
  if (!sourceId || sourceId === pageId) return

  const pages = [...organizePages.value]
  const fromIndex = pages.findIndex(page => page.id === sourceId)
  const toIndex = pages.findIndex(page => page.id === pageId)
  if (fromIndex === -1 || toIndex === -1) return
  const [moved] = pages.splice(fromIndex, 1)
  pages.splice(toIndex, 0, moved)
  organizePages.value = pages
}

function handleOrganizeDragEnd() {
  organizeDragSourceId.value = null
  organizeDragOverId.value = null
}

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

function organizeRotationStyle(page: OrganizePage) {
  if (!page || page.rotation === 0) return undefined
  return {
    transform: `rotate(${page.rotation}deg)`
  }
}

async function handleOrganizeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const fileList = input.files
  if (!fileList || fileList.length === 0) return

  const file = fileList.item(0)
  if (!file) return

  if (file.type !== 'application/pdf') {
    toastStore.error('Unsupported File', 'Please select a PDF document to organise')
    input.value = ''
    return
  }

  resetOrganize()
  organizeFile.value = file
  organizeStage.value = 'Analysing document'
  organizeProgress.value = 0

  try {
    const pdfjs = await loadPdfJs()
    const data = await file.arrayBuffer()
    const loadingTask = pdfjs.getDocument({ data })
    const pdf = await loadingTask.promise
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
      for (let i = 1; i <= Math.min(total, 8); i++) {
        loadOrganizePageThumbnail(i)
      }
    })
  } catch (error) {
    console.warn('Failed to analyse PDF for organize', error)
    toastStore.error('Failed to load PDF', 'Could not prepare pages for organisation')
    resetOrganize()
  }

  organizeStage.value = ''
  organizeProgress.value = 0
  organizeDragSourceId.value = null
  organizeDragOverId.value = null
  input.value = ''
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

watch(organizePagesContainer, (root) => {
  if (root) {
    ensureOrganizeObserver(root)
  }
})

onBeforeUnmount(() => {
  disposeSplitObserver()
  destroySplitPdfDoc()
  window.removeEventListener('pointerup', handleSplitPointerUp)
  disposeOrganizeObserver()
  destroyOrganizePdfDoc()
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

.compress-advanced {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-12);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel-inner);
  background: var(--color-bg-inset-2);
}

.compress-advanced__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.compress-advanced__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.compress-advanced__toggles {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-top: var(--space-4);
}

.compress-advanced__checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-secondary);
}

.compress-advanced__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-line-hair);
}

.compress-advanced__toggle-btn {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding-inline: var(--space-6);
  height: 1.8rem;
}

.compress-report {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-12);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel-inner);
  background: var(--color-bg-panel);
}

.compress-report__header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-6);
}

.compress-report__label {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.compress-report__value {
  font-family: var(--font-ui-mono, var(--font-ui-sans));
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.compress-report__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-4);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.compress-report__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-acc-success);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.compress-report__badge--warning {
  background: rgba(255, 93, 99, 0.15);
  color: var(--color-acc-error);
}

.compress-report__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.compress-report__option {
  font-family: var(--font-ui-mono, var(--font-ui-sans));
  background: var(--color-bg-inset-2);
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
}

.compress-report__details {
  display: grid;
  gap: var(--space-12);
  padding-top: var(--space-10);
  border-top: 1px solid var(--color-line-hair);
}

.compress-report__group {
  display: grid;
  gap: var(--space-6);
}

.compress-report__group-title {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.compress-report__group-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}

.compress-report__group-saved {
  font-family: var(--font-ui-mono, var(--font-ui-sans));
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.compress-report__group ul {
  display: grid;
  gap: var(--space-4);
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.compress-report__detail-name {
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
}

.compress-report__detail-meta {
  font-family: var(--font-ui-mono, var(--font-ui-sans));
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.compress-report__detail-saved {
  font-family: var(--font-ui-mono, var(--font-ui-sans));
  font-size: 0.72rem;
  color: var(--color-acc-success);
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

.organize-grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

@media (min-width: 1280px) {
  .organize-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.organize-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border: 1px solid var(--color-line-key);
  border-radius: var(--radius-panel-inner);
  background: var(--color-bg-panel);
  transition: border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
}

.organize-card--dragging {
  opacity: 0.6;
  border-color: var(--color-line-key);
}

.organize-card--over {
  border-color: var(--color-acc-error);
  box-shadow: 0 0 0 1px rgba(255, 93, 99, 0.2);
}

.organize-card--removed {
  opacity: 0.55;
}

.organize-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-text-secondary);
}

.organize-card__index {
  font-weight: 600;
  color: var(--color-text-primary);
}

.organize-card__thumb {
  position: relative;
  border-radius: var(--radius-panel-inner);
  overflow: hidden;
  background: var(--color-bg-inset-2);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}

.organize-card__thumb img {
  max-width: 100%;
  height: auto;
  display: block;
}

.organize-card__thumb-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 160ms ease;
}

.organize-card__thumb-placeholder {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: var(--space-4);
  text-align: center;
}

.organize-card__removed-banner {
  position: absolute;
  inset: auto 0 0 0;
  padding: 0.35rem;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  text-align: center;
}

.organize-card__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.organize-card__rotation {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.organize-empty {
  padding: var(--space-12);
  border: 1px dashed var(--color-line-key);
  border-radius: var(--radius-panel-inner);
  text-align: center;
}

.organize-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.organize-progress__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--color-line-hair);
  overflow: hidden;
}

.organize-progress__fill {
  height: 100%;
  background: var(--color-acc-error);
  transition: width 160ms ease-out;
}

.organize-progress__label {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-secondary);
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
