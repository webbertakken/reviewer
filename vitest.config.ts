import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'miniflare',
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov', 'clover'],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
})
