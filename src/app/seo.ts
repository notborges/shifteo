import type { RouteLocationNormalized } from 'vue-router'
import seoConfig from '@/app/seo-data.json'

interface SeoEntry {
  name: string
  path: string
  title: string
  description: string
  priority?: number
  changefreq?: string
  noindex?: boolean
  structuredData?: unknown[]
}

const SEO_ENTRIES: SeoEntry[] = seoConfig as SeoEntry[]
const ENTRY_BY_NAME = new Map(SEO_ENTRIES.map((entry) => [entry.name, entry]))
const ENTRY_BY_PATH = new Map(SEO_ENTRIES.map((entry) => [entry.path, entry]))

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/?$/, '') || 'https://shifteo.akius.tools'
const DEFAULT_TITLE = 'Shifteo — Shift files locally in your browser'
const DEFAULT_DESCRIPTION = 'Shift images and documents locally in your browser. Zero uploads. Zero tracking.'
const DEFAULT_IMAGE = `${SITE_URL}/icon-512.png`

function ensureMetaTag(key: 'name' | 'property', value: string) {
  let tag = document.head.querySelector(`meta[${key}="${value}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(key, value)
    document.head.appendChild(tag)
  }
  return tag as HTMLMetaElement
}

function setMetaContent(key: 'name' | 'property', id: string, content: string) {
  const tag = ensureMetaTag(key, id)
  tag.setAttribute('content', content)
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function clearStructuredData() {
  const tags = document.head.querySelectorAll('script[data-shifteo-structured]')
  tags.forEach(tag => tag.remove())
}

function applyStructuredData(entries: unknown[] | undefined, pageUrl: string) {
  clearStructuredData()
  if (!entries || entries.length === 0) return
  entries.forEach((entry) => {
    const hydrated = hydrateStructuredData(entry, pageUrl)
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-shifteo-structured', '')
    script.textContent = JSON.stringify(hydrated)
    document.head.appendChild(script)
  })
}

function hydrateStructuredData(entry: unknown, pageUrl: string): unknown {
  if (Array.isArray(entry)) {
    return entry.map(item => hydrateStructuredData(item, pageUrl))
  }
  if (entry && typeof entry === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(entry)) {
      result[key] = hydrateStructuredData(value, pageUrl)
    }
    return result
  }
  if (typeof entry === 'string') {
    return entry
      .replace(/\{\{siteUrl\}\}/g, SITE_URL)
      .replace(/\{\{pageUrl\}\}/g, pageUrl)
  }
  return entry
}

function resolveSeoEntry(route: RouteLocationNormalized): SeoEntry | undefined {
  const seoKey = route.meta?.seoKey as string | undefined
  if (seoKey && ENTRY_BY_NAME.has(seoKey)) return ENTRY_BY_NAME.get(seoKey)
  if (route.name && ENTRY_BY_NAME.has(String(route.name))) {
    return ENTRY_BY_NAME.get(String(route.name))
  }
  const pathEntry = ENTRY_BY_PATH.get(route.path)
  if (pathEntry) return pathEntry
  return undefined
}

export function applyRouteSeo(route: RouteLocationNormalized) {
  const entry = resolveSeoEntry(route)

  const title = entry?.title ?? DEFAULT_TITLE
  const description = entry?.description ?? DEFAULT_DESCRIPTION
  const pageUrl = `${SITE_URL}${entry?.path ?? route.fullPath}`
  const shouldNoIndex = entry?.noindex ?? false

  document.title = title

  setMetaContent('name', 'description', description)
  setMetaContent('property', 'og:title', title)
  setMetaContent('property', 'og:description', description)
  setMetaContent('property', 'og:url', pageUrl)
  setMetaContent('property', 'og:type', 'website')
  setMetaContent('property', 'og:site_name', 'Shifteo')
  setMetaContent('property', 'og:image', DEFAULT_IMAGE)
  setMetaContent('name', 'twitter:card', 'summary_large_image')
  setMetaContent('name', 'twitter:title', title)
  setMetaContent('name', 'twitter:description', description)
  setMetaContent('name', 'twitter:image', DEFAULT_IMAGE)
  setMetaContent('name', 'robots', shouldNoIndex ? 'noindex, follow' : 'index, follow')

  setCanonical(pageUrl)
  applyStructuredData(entry?.structuredData, pageUrl)
}

export function getSeoEntries(): SeoEntry[] {
  return SEO_ENTRIES
}

export { SITE_URL }
