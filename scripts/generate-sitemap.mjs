import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const sitemapPath = path.join(publicDir, 'sitemap.xml')
const seoDataPath = path.join(rootDir, 'src', 'app', 'seo-data.json')

const rawBaseUrl = process.env.SITEMAP_SITE_URL || process.env.VITE_SITE_URL || 'https://shifteo.akius.tools'
const BASE_URL = rawBaseUrl.replace(/\/$/, '')

async function buildSitemap() {
  const rawSeo = await fs.readFile(seoDataPath, 'utf8')
  const entries = JSON.parse(rawSeo)

  const urls = entries
    .filter((entry) => !entry.noindex)
    .map((entry) => {
      const loc = `${BASE_URL}${entry.path}`
      const priority = typeof entry.priority === 'number' ? entry.priority.toFixed(1) : '0.5'
      const changefreq = entry.changefreq || 'monthly'
      const lastmod = new Date().toISOString()
      return `    <url>\n      <loc>${loc}</loc>\n      <lastmod>${lastmod}</lastmod>\n      <changefreq>${changefreq}</changefreq>\n      <priority>${priority}</priority>\n    </url>`
    })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`

  await fs.mkdir(publicDir, { recursive: true })
  await fs.writeFile(sitemapPath, xml, 'utf8')
  console.log(`[sitemap] Generated ${urls.length} entries at public/sitemap.xml using base ${BASE_URL}`)
}

buildSitemap().catch((error) => {
  console.error('[sitemap] Failed to generate sitemap', error)
  process.exitCode = 1
})
