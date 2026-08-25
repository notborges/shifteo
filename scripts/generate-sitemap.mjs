const rootUrl = new URL('..', import.meta.url)
const sitemapUrl = new URL('public/sitemap.xml', rootUrl)
const seoDataUrl = new URL('src/app/seo-data.json', rootUrl)

const rawBaseUrl = Bun.env.SITEMAP_SITE_URL || Bun.env.VITE_SITE_URL || 'https://shifteo.app'
const BASE_URL = rawBaseUrl.replace(/\/+$/, '')

async function buildSitemap() {
  const entries = await Bun.file(seoDataUrl).json()

  const urls = entries
    .filter((entry) => !entry.noindex)
    .map((entry) => {
      const loc = `${BASE_URL}${entry.path}`
      const priority = typeof entry.priority === 'number' ? entry.priority.toFixed(1) : '0.5'
      const changefreq = entry.changefreq || 'monthly'
      return `    <url>\n      <loc>${loc}</loc>\n      <changefreq>${changefreq}</changefreq>\n      <priority>${priority}</priority>\n    </url>`
    })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`

  await Bun.write(sitemapUrl, xml)
  console.log(`[sitemap] Generated ${urls.length} entries at public/sitemap.xml using base ${BASE_URL}`)
}

buildSitemap().catch((error) => {
  console.error('[sitemap] Failed to generate sitemap', error)
  process.exitCode = 1
})
