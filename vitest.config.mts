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
    // Integration tests share one Postgres database. In local dev the schema is
    // auto-synced on Payload boot (`push`); running test files in parallel would
    // let two workers race to CREATE the same types/tables. Serialize files so
    // the first boot syncs the schema and later boots are no-ops. (In CI push is
    // off and the schema comes from migrations, so this is a local-dev safeguard.)
    fileParallelism: false,
  },
})
