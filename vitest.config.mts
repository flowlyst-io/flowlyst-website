import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts', 'tests/unit/**/*.unit.spec.{ts,tsx}'],
    // CSS is not processed in tests (imports resolve to no-ops), so components
    // that pull in global stylesheets can be rendered without a PostCSS pipeline.
    css: false,
  },
})
