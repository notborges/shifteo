<template>
  <Transition name="controls">
    <div v-if="phase === 'ready'" class="controls-area">
      <div class="formats">
        <button
          v-for="format in formats"
          :key="format"
          class="format"
          :class="{
            'format--selected': recipe.format === format,
            'format--dimmed': hoveredFormat && hoveredFormat !== format
          }"
          @mouseenter="setHoveredFormat(format)"
          @mouseleave="setHoveredFormat(null)"
          @click="selectFormat(format)"
        >
          {{ format }}
        </button>
      </div>

      <div class="capabilities">
        <div v-for="group in [capabilities.slice(0, 3), capabilities.slice(3)]" :key="group[0]?.id" class="capabilities-group">
          <button
            v-for="capability in group"
            :key="capability.id"
            class="capability"
            :class="{
              'capability--active': hasCapability(capability.id),
              'capability--expanded': expanded === capability.id
            }"
            @click="toggleCapability(capability.id)"
          >
            {{ capability.label }}
          </button>
        </div>
      </div>

      <div class="interface-container">
        <Transition name="interface" mode="out-in">
          <div v-if="expanded === 'reshape'" key="reshape" class="interface interface--reshape">
            <div class="reshape-presets">
              <button
                v-for="preset in [25, 50, 100, 150, 200]"
                :key="preset"
                class="option-chip"
                :class="{ 'option-chip--active': preset === 100 ? recipe.resize === null : recipe.resize === preset }"
                @click="setRecipe('resize', preset === 100 ? null : preset)"
              >
                {{ preset }}%
              </button>
            </div>
            <div class="reshape-slider">
              <input
                type="range"
                min="25"
                max="200"
                :value="recipe.resize || 100"
                class="slider"
                @input="setRecipe('resize', +($event.target as HTMLInputElement).value === 100 ? null : +($event.target as HTMLInputElement).value)"
              />
              <span class="slider-value">{{ recipe.resize || 100 }}%</span>
            </div>
          </div>

          <div v-else-if="expanded === 'crop'" key="crop" class="interface interface--crop">
            <button
              v-for="aspect in cropAspects"
              :key="aspect.id"
              class="option-chip"
              :class="{ 'option-chip--active': recipe.cropAspect === aspect.id }"
              @click="setRecipe('cropAspect', recipe.cropAspect === aspect.id ? null : aspect.id)"
            >
              {{ aspect.label }}
            </button>
          </div>

          <div v-else-if="expanded === 'adjust'" key="adjust" class="interface interface--adjust">
            <div class="adjust-column">
              <div class="adjust-row">
                <span class="adjust-label">bright</span>
                <input type="range" min="-100" max="100" :value="recipe.brightness" class="slider slider--small" @input="setNumber('brightness', $event)" />
                <span class="adjust-value">{{ recipe.brightness }}</span>
              </div>
              <div class="adjust-row">
                <span class="adjust-label">contrast</span>
                <input type="range" min="-100" max="100" :value="recipe.contrast" class="slider slider--small" @input="setNumber('contrast', $event)" />
                <span class="adjust-value">{{ recipe.contrast }}</span>
              </div>
            </div>
            <div class="adjust-column">
              <div class="adjust-row">
                <span class="adjust-label">saturate</span>
                <input type="range" min="-100" max="100" :value="recipe.saturation" class="slider slider--small" @input="setNumber('saturation', $event)" />
                <span class="adjust-value">{{ recipe.saturation }}</span>
              </div>
              <div class="adjust-row">
                <span class="adjust-label">sharpen</span>
                <input type="range" min="0" max="100" :value="recipe.sharpness" class="slider slider--small" @input="setNumber('sharpness', $event)" />
                <span class="adjust-value">{{ recipe.sharpness }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="expanded === 'filter'" key="filter" class="interface interface--filters">
            <button
              v-for="filter in filters"
              :key="filter"
              class="option-chip"
              :class="{ 'option-chip--active': recipe.filter === filter }"
              @click="setRecipe('filter', recipe.filter === filter ? null : filter)"
            >
              {{ filter }}
            </button>
          </div>

          <div v-else-if="expanded === 'transform'" key="transform" class="interface interface--transform">
            <div class="transform-group">
              <span class="transform-label">rotate</span>
              <div class="transform-buttons">
                <button
                  v-for="rotation in [90, 180, 270]"
                  :key="rotation"
                  class="option-chip"
                  :class="{ 'option-chip--active': recipe.rotate === rotation }"
                  @click="setRecipe('rotate', recipe.rotate === rotation ? null : rotation)"
                >
                  {{ rotation }}°
                </button>
              </div>
            </div>
            <div class="transform-group">
              <span class="transform-label">flip</span>
              <div class="transform-buttons">
                <button class="option-chip" :class="{ 'option-chip--active': recipe.flipH }" @click="setRecipe('flipH', !recipe.flipH)">
                  horizontal
                </button>
                <button class="option-chip" :class="{ 'option-chip--active': recipe.flipV }" @click="setRecipe('flipV', !recipe.flipV)">
                  vertical
                </button>
              </div>
            </div>
          </div>

        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Phase = 'ready' | 'shifting' | 'done'
type RecipeKey = 'format' | 'resize' | 'cropAspect' | 'brightness' | 'contrast' | 'saturation' | 'sharpness' | 'filter' | 'rotate' | 'flipH' | 'flipV'

interface Recipe {
  format: string | null
  resize: number | null
  cropAspect: string | null
  brightness: number
  contrast: number
  saturation: number
  sharpness: number
  filter: string | null
  rotate: number | null
  flipH: boolean
  flipV: boolean
}

interface Option {
  id: string
  label: string
}

const { phase, formats, filters, capabilities, cropAspects, recipe, expanded, hoveredFormat } = defineProps<{
  phase: Phase
  formats: string[]
  filters: string[]
  capabilities: Option[]
  cropAspects: Option[]
  recipe: Recipe
  expanded: string | null
  hoveredFormat: string | null
}>()

const emit = defineEmits<{
  (e: 'update-recipe', changes: Partial<Recipe>): void
  (e: 'toggle-capability', id: string): void
  (e: 'format-hover', format: string | null): void
}>()

const hasAdjustments = computed(() => (
  recipe.brightness !== 0 ||
  recipe.contrast !== 0 ||
  recipe.saturation !== 0 ||
  recipe.sharpness !== 0
))

function hasCapability(id: string): boolean {
  switch (id) {
    case 'reshape': return recipe.resize !== null
    case 'crop': return recipe.cropAspect !== null
    case 'adjust': return hasAdjustments.value
    case 'filter': return recipe.filter !== null
    case 'transform': return recipe.rotate !== null || recipe.flipH || recipe.flipV
    default: return false
  }
}

function setRecipe<K extends RecipeKey>(key: K, value: Recipe[K]) {
  emit('update-recipe', { [key]: value })
}

function setNumber(key: 'brightness' | 'contrast' | 'saturation' | 'sharpness', event: Event) {
  setRecipe(key, Number((event.target as HTMLInputElement).value))
}

function selectFormat(format: string) {
  setRecipe('format', recipe.format === format ? null : format)
}

function toggleCapability(id: string) {
  emit('toggle-capability', id)
}

function setHoveredFormat(format: string | null) {
  emit('format-hover', format)
}
</script>

<style scoped>
.controls-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-bottom: 80px;
}

.formats {
  display: flex;
  gap: 36px;
  margin-top: 24px;
}

.format {
  padding: 12px 16px;
  border: 0;
  background: none;
  color: var(--immersive-text);
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.35s var(--ease-immersive);
}

.format:hover {
  color: var(--ink-primary);
  transform: translateY(-8px) scale(1.15);
  text-shadow: 0 0 30px var(--immersive-accent-border-hover);
}

.format--selected { color: var(--immersive-accent); text-shadow: 0 0 20px var(--immersive-accent-border); }
.format--dimmed { opacity: 0.25; transform: scale(0.95); }

.capabilities {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-top: 16px;
}

.capabilities-group { display: flex; gap: 20px; }

.capability {
  padding: 10px 14px;
  border: 0;
  background: none;
  color: var(--immersive-text-muted);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.35s var(--ease-immersive);
}

.capability:hover { color: var(--immersive-text-bright); transform: translateY(-4px) scale(1.08); }
.capability--active { color: var(--immersive-accent); text-shadow: 0 0 15px var(--immersive-accent-border); }
.capability--expanded { color: var(--ink-primary); transform: translateY(-4px) scale(1.1); text-shadow: 0 0 20px var(--immersive-ember-bright); }

.interface-container {
  height: 150px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
}

.interface {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.slider {
  width: 200px;
  height: 2px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--immersive-border);
  border-radius: 2px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--immersive-accent);
  cursor: pointer;
  transition: transform 0.2s;
}

.slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.slider--small { width: 120px; }

.slider-value {
  min-width: 45px;
  color: var(--immersive-text-secondary);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
}

.interface--reshape { flex-direction: column; gap: 16px; }
.reshape-presets { display: flex; gap: 8px; }

.option-chip {
  padding: 10px 16px;
  border: 1px solid var(--immersive-border);
  border-radius: 20px;
  background: var(--immersive-surface);
  color: var(--immersive-text-quiet);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
}

.option-chip:hover {
  border-color: var(--immersive-border-hover);
  color: var(--immersive-text-hover);
  background: var(--immersive-ember-surface);
}

.option-chip--active {
  border-color: var(--immersive-accent);
  color: var(--immersive-accent);
  background: var(--immersive-accent-soft);
}

.reshape-slider { display: flex; align-items: center; gap: 16px; }
.interface--adjust { flex-direction: row; gap: 40px; }
.adjust-column { display: flex; flex-direction: column; gap: 14px; }
.adjust-row { display: flex; align-items: center; gap: 14px; }

.adjust-label,
.transform-label {
  width: 60px;
  color: var(--immersive-text);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  text-align: right;
}

.adjust-value {
  width: 35px;
  color: var(--immersive-text-soft);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
}

.interface--filters { flex-wrap: wrap; justify-content: center; gap: 10px; max-width: 420px; }
.interface--crop { gap: 10px; }
.interface--transform { flex-direction: column; gap: 16px; }
.transform-group { display: flex; align-items: center; gap: 16px; }
.transform-label { width: 50px; color: var(--immersive-text-dim); }
.transform-buttons { display: flex; gap: 8px; }

.interface-enter-active { transition: all 0.4s var(--ease-immersive); }
.interface-leave-active { transition: all 0.25s var(--ease-immersive); }
.interface-enter-from { opacity: 0; transform: translateY(12px); }
.interface-leave-to { opacity: 0; transform: translateY(-8px); }

.controls-enter-active { transition: all 0.4s var(--ease-immersive); }
.controls-leave-active {
  overflow: hidden;
  max-height: 400px;
  transition: opacity 0.3s var(--ease-immersive),
    transform 0.3s var(--ease-immersive),
    max-height 0.3s var(--ease-immersive),
    padding 0.3s var(--ease-immersive);
}

.controls-enter-from { opacity: 0; transform: translateY(20px); }
.controls-leave-to { opacity: 0; transform: translateY(-15px); max-height: 0; padding-bottom: 0; }

@media (max-width: 640px) {
  .formats { gap: 16px; margin-top: 16px; }
  .format { font-size: 12px; padding: 8px 10px; }
  .capabilities { gap: 24px; margin-top: 12px; }
  .capabilities-group { gap: 12px; }
  .capability { font-size: 11px; padding: 6px 8px; }
  .interface-container { height: 140px; }
  .interface--filters { max-width: 280px; }
  .controls-area { padding-bottom: 70px; }
}

@media (max-height: 700px) {
  .formats { margin-top: 12px; gap: 20px; }
  .capabilities { margin-top: 10px; gap: 32px; }
  .capabilities-group { gap: 14px; }
  .interface { margin-top: 10px; }
  .interface-container { height: 130px; }
  .controls-area { padding-bottom: 70px; }
}

@media (max-height: 600px) {
  .interface-container { height: 120px; }
}
</style>
