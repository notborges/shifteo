<template>
  <component
    :is="componentTag"
    v-bind="restAttrs"
    :to="props.to"
    :href="props.href"
    :type="!isLink ? props.type : undefined"
    :disabled="!isLink ? props.disabled : undefined"
    :aria-disabled="isLink && props.disabled ? 'true' : undefined"
    :tabindex="computedTabIndex"
    :class="[buttonClasses, userClass]"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { RouterLink } from 'vue-router'

defineOptions({ inheritAttrs: false })

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'subtle' | 'toolbar'
type ButtonSize = 'md' | 'icon' | 'icon-lg'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    to?: string
    href?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'default',
    size: 'md',
    type: 'button',
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const attrs = useAttrs()

const userClass = computed(() => attrs.class)
const restAttrs = computed(() => {
  const { class: _class, type: _type, disabled: _disabled, to: _to, tabindex: _tabindex, href: _href, ...rest } = attrs
  return rest
})

const userTabIndex = computed(() => (attrs as Record<string, unknown>).tabindex as string | number | undefined)

const isLink = computed(() => Boolean(props.to || props.href))

const componentTag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return 'button'
})

const baseClasses = [
  'inline-flex items-center justify-center whitespace-nowrap',
  'rounded-[var(--radius-button)] border',
  'transition-colors duration-[var(--motion-fast)] ease-out',
  'focus-visible:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'cursor-pointer select-none',
]

const variantClassMap: Record<ButtonVariant, string[]> = {
  default: [
    'border-[var(--color-line-key)]',
    'bg-[var(--color-bg-inset)]',
    'text-[var(--color-text-secondary)]',
    'hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
  ],
  primary: [
    'border-[var(--color-acc-error)] bg-[var(--color-acc-error)]',
    'text-[#030303]',
    'hover:border-[#ff7b7b] hover:bg-[#ff7b7b]'
  ],
  ghost: [
    'border-[var(--color-line-key)] bg-transparent',
    'text-[var(--color-text-secondary)]',
    'hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
  ],
  subtle: [
    'border-[var(--color-line-hair)] bg-transparent',
    'text-[var(--color-text-muted)]',
    'hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
  ],
  toolbar: [
    'border-[var(--color-line-key)]',
    'bg-[var(--color-bg-panel)]',
    'text-[var(--color-text-secondary)]',
    'hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
  ]
}

const sizeClassMap: Record<ButtonSize, string[]> = {
  md: [
    'px-[1.25rem] py-[0.65rem]',
    'gap-[var(--space-8)]',
    'text-[12px] uppercase tracking-[0.22em]'
  ],
  icon: [
    'w-8 h-8',
    'p-0 gap-0',
    'rounded-[var(--radius-chip)]'
  ],
  'icon-lg': [
    'w-9 h-9',
    'p-0 gap-0'
  ]
}

const buttonClasses = computed(() =>
  [...baseClasses, ...variantClassMap[props.variant], ...sizeClassMap[props.size]].join(' ')
)

const computedTabIndex = computed(() => {
  if (isLink.value && props.disabled) return -1
  return userTabIndex.value as string | number | undefined
})

function handleClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>
