# SEO Playbook

This repo keeps all search metadata in code so we can ship a privacy-first site without touching the visible UI copy.

## Site URL
- Set `VITE_SITE_URL` in `.env` (e.g., `https://shifteo.tools`).
- `src/app/seo.ts` falls back to `https://shifteo.app`; update once a domain is chosen.
- `scripts/generate-sitemap.mjs` also respects `SITEMAP_SITE_URL` / `VITE_SITE_URL` when building `public/sitemap.xml`.

## Route Metadata
- Per-page SEO definitions live in `src/app/seo-data.json`.
  - `title`, `description`, and `path` feed `<title>`, meta tags, and canonical URLs.
  - `noindex: true` keeps placeholder/control screens (Documents, Settings, Licenses) out of search.
  - `structuredData` holds JSON-LD snippets. Use `{{siteUrl}}` and `{{pageUrl}}` tokens for auto-filled URLs.
- The router references entries via `meta.seoKey`. Keep route names/paths in sync when adding new pages.

## Structured Data
- Existing entries provide Organization + FAQ (home) and HowTo (images) schema.
- Additional schema can be appended to the corresponding `structuredData` array using plain JSON.

## Build Automation
- `npm run sitemap` regenerates `public/sitemap.xml` from `seo-data.json`.
- `npm run licenses` refreshes OSS attributions; both scripts run automatically before `npm run build`.
- `public/robots.txt` advertises crawl permissions and the sitemap; update the URL if the domain changes.

## Auditing
- Use `npm run audit:seo` after running `npm run preview` to execute Lighthouse (SEO + Performance categories). Requires Chrome installed.
- Check that Open Graph/Twitter cards resolve (default image: `/icon-512.png`). Replace with a custom OG asset when available.

## Accessibility Hygiene
- Decorative Lucide icons already sit in buttons with accessible labels; keep that pattern for new icons.
- Real images should ship with descriptive `alt` text so Lighthouse doesn’t flag them.

## Deploy Checklist
1. Set `VITE_SITE_URL` (and optionally `SITEMAP_SITE_URL` for CI scripts).
2. Run `npm run build` to ensure prebuild scripts output fresh licenses and sitemap.
3. Deploy `public/robots.txt`, `public/sitemap.xml`, and `public/licenses/` alongside the app bundle.
