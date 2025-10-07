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
    :class="[rootClasses, userClass]"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { RouterLink } from 'vue-router'

defineOptions({ inheritAttrs: false })

type ButtonVariant = 'solid' | 'quiet' | 'destructive'
type ButtonTone = 'default' | 'info' | 'success' | 'warning' | 'accent'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    tone?: ButtonTone
    size?: ButtonSize
    iconOnly?: boolean
    brackets?: boolean
    to?: string
    href?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'solid',
    tone: 'default',
    size: 'md',
    iconOnly: false,
    brackets: false,
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
  const { class: _class, type: _type, disabled: _disabled, to: _to, tabindex: _tabindex, href: _href, icononly: _iconOnly, ...rest } = attrs
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
  'rounded-[var(--radius-button)] border border-solid',
  'transition-all duration-[var(--motion-normal)] ease-out',
  'focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_0_0_1px_rgba(11,12,14,0.9),0_0_0_3px_rgba(67,198,224,0.35)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'cursor-pointer',
  'active:scale-[0.98]'
]

const solidToneClasses: Record<ButtonTone, string[]> = {
  default: [
    'border-[var(--color-line-key)] bg-[var(--color-bg-inset)] text-[var(--color-text-secondary)]',
    'hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
  ],
  info: [
    'border-[var(--color-acc-info)] bg-[var(--color-acc-info)] text-[#070909]',
    'hover:brightness-[1.1]'
  ],
  success: [
    'border-[var(--color-acc-success)] bg-[var(--color-acc-success)] text-[#070909]',
    'hover:brightness-[1.1]'
  ],
  warning: [
    'border-[var(--color-acc-error)] bg-[var(--color-acc-error)] text-[#070909]',
    'hover:brightness-[1.1]'
  ],
  accent: [
    'border-[var(--color-acc-error)] bg-[var(--color-acc-error)] text-[#070909]',
    'hover:brightness-[1.1] hover:shadow-[var(--shadow-glow-error-md)]'
  ]
}

const quietToneClasses: Record<ButtonTone, string[]> = {
  default: [
    'border-transparent bg-transparent text-[var(--color-text-muted)]',
    'hover:text-[var(--color-text-primary)]'
  ],
  info: ['border-transparent bg-transparent text-[var(--color-acc-info)]', 'hover:text-[var(--color-acc-info)]'],
  success: ['border-transparent bg-transparent text-[var(--color-acc-success)]', 'hover:text-[var(--color-acc-success)]'],
  warning: ['border-transparent bg-transparent text-[var(--color-acc-warning)]', 'hover:text-[var(--color-acc-warning)]'],
  accent: ['border-transparent bg-transparent text-[var(--color-acc-error)]', 'hover:text-[var(--color-acc-error)]']
}

const destructiveClasses = [
  'border-[var(--color-acc-error)] bg-transparent text-[var(--color-acc-error)]',
  'hover:bg-[rgba(255,92,92,0.12)] hover:text-[var(--color-acc-error)]'
]

const sizeClassMap: Record<ButtonSize, string[]> = {
  sm: ['h-8 px-3', 'gap-[var(--space-8)]'],
  md: ['h-9 px-4', 'gap-[var(--space-8)]'],
  lg: ['h-11 px-6', 'gap-[var(--space-12)]']
}

const iconFrameMap: Record<ButtonSize, string[]> = {
  sm: ['w-8 h-8'],
  md: ['w-9 h-9'],
  lg: ['w-11 h-11']
}

function getVariantClasses(): string[] {
  switch (props.variant) {
    case 'quiet': {
      const classes = [...quietToneClasses[props.tone]]
      if (!props.iconOnly) {
        classes.push('underline-offset-4 hover:underline')
      }
      return classes
    }
    case 'destructive':
      return [...destructiveClasses]
    default:
      return [...solidToneClasses[props.tone]]
  }
}

const rootClasses = computed(() => {
  const classes = [...baseClasses, ...getVariantClasses(), ...sizeClassMap[props.size]]

  if (props.iconOnly) {
    classes.push('px-0! gap-0', ...iconFrameMap[props.size], 'leading-none', 'text-[var(--color-text-primary)]')
    if (props.variant !== 'quiet') {
      classes.push('bg-[var(--color-bg-panel)] border-[var(--color-line-key)] hover:border-[var(--color-text-muted)]')
    }
  } else {
    classes.push('uppercase tracking-[0.22em] text-[12px]')
  }

  // Add corner brackets when explicitly requested
  if (props.brackets) {
    classes.push('bracket-corners')
  }

  classes.push(`data-variant-${props.variant}`, `data-tone-${props.tone}`)

  return classes.join(' ')
})

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
