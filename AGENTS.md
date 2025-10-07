# Repository Guidelines

## Project Structure & Module Organization
Shifteo is a Vite + Vue 3 app. Primary source sits in `src/`. `src/app/` holds the root app shell, global router, and Pinia stores. `src/components/` keeps reusable UI widgets (PascalCase single-file components) with subfolders `layout/` and `ui/` for structure primitives. Screens live in `src/pages/` and should stay domain-focused. Conversion logic belongs in `src/workers/` (Web Workers using Comlink); place shared helpers under `src/utils/`. Styles go in `src/styles/` using Tailwind 4 utilities; add module-scoped CSS only when utilities fall short. Static assets or manifest tweaks belong beside `vite.config.ts`.

## Build, Test, and Development Commands
Use `npm install` once, then `npm run dev` for the Vite dev server. `npm run build` performs a type-check (`vue-tsc --noEmit`) and produces the production bundle. `npm run preview` serves the built output. Run unit tests with `npm run test` or `npm run test:watch` for interactive feedback. Execute Playwright suites via `npm run e2e`. Lint with `npm run lint` before pushing.

## Coding Style & Naming Conventions
Follow the TypeScript strict defaults and keep Vue/TS files at two-space indentation. Name components in PascalCase (`ImageOptions.vue`) and composables/utility modules in kebab-case filenames exporting camelCase symbols. Prefer `<script setup lang="ts">` and strongly typed props/emit signatures. Tailwind utilities should cover most styling; document any custom classes inline. Run ESLint locally; fixers are safe to apply.

## Testing Guidelines
Vitest is the unit test runner; co-locate specs as `*.spec.ts` beside the code under test. Mock heavy WASM calls via `vi.mock` but exercise Web Worker boundaries where possible. Aim to cover conversion flows, queue management, and store mutations (>75% line coverage). Place Playwright scenarios in `tests/e2e/` and tag slow suites so CI can skip when needed. Update snapshots and fixtures whenever APIs change.

## Commit & Pull Request Guidelines
Existing history favors short, present-tense subjects (`add shifteo`, `remove primevue deps`). Keep commits focused with meaningful bodies when behavior changes. Pull requests should describe the user-facing impact, list commands executed (tests, lint, build), and link relevant issues. Include before/after screenshots or GIFs for UI updates and note any new environment variables or worker capabilities.
