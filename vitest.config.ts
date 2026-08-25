import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': Bun.fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    exclude: ['tests/**/*', 'node_modules/**/*']
  }
})
