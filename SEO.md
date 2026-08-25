# SEO

Search metadata is defined in `src/app/seo-data.json` and applied by `src/app/seo.ts`.

Set `VITE_SITE_URL` in `.env` when building for a domain other than the default. The same value is used by the sitemap generator, or override it for that script with `SITEMAP_SITE_URL`.

```sh
bun run sitemap
bun run build
```

The build regenerates `public/sitemap.xml`. Keep `public/robots.txt` and the sitemap available at the deployed site root.

The Licenses page is intentionally marked `noindex` in the SEO data.
