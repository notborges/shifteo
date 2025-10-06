<template>
  <label
    class="ui-checkbox"
    :class="[userClass, { 'ui-checkbox--disabled': disabled }]"
    v-bind="restAttrs"
  >
    <div class="checkbox">
      <input
        type="checkbox"
        :checked="model"
        :disabled="disabled"
        @change="onChange"
      />
      <span class="checkbox__mark" />
    </div>
    <span class="ui-checkbox__label" :class="labelClass">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
    labelClass?: string | Record<string, boolean> | string[]
  }>(),
  {
    label: '',
    disabled: false,
    labelClass: ''
  }
)

const emit = defineEmits<{
  (e: 'change', value: boolean): void
}>()

const attrs = useAttrs()
const userClass = computed(() => (attrs.class as string | string[] | Record<string, boolean> | undefined))
const restAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

function onChange(event: Event) {
  if (props.disabled) {
    ;(event.target as HTMLInputElement).checked = model.value
    event.preventDefault()
    return
  }
  const checked = (event.target as HTMLInputElement).checked
  model.value = checked
  emit('change', checked)
}
</script>

<style scoped>
.ui-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  cursor: pointer;
}

.ui-checkbox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-checkbox__label {
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  transition: color var(--motion-fast) ease;
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid var(--color-line-key);
  background: var(--color-bg-inset);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.checkbox input {
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
}

.checkbox__mark {
  pointer-events: none;
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--color-acc-error);
  opacity: 0;
  transition: opacity var(--motion-fast) ease;
}

.checkbox input:checked + .checkbox__mark {
  opacity: 1;
}
</style>
