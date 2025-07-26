import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['server/stablecoin/tests/**/*'],
    testTimeout: 30000,
    hookTimeout: 30000
  }
})