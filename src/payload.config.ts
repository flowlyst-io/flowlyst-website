import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Only the auth-enabled Users collection is defined here — the minimum Payload
  // needs to boot and enforce admin access. Content collections (blog, testimonials,
  // case studies, etc.) arrive in issue #4; media/uploads land with the storage
  // adapter in issue #5.
  collections: [Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Auto-sync schema for fast local iteration only. In CI and production the
    // schema comes exclusively from the committed migrations (deterministic and
    // reviewable), so push is disabled there. GitHub Actions sets CI=true.
    push: process.env.NODE_ENV !== 'production' && !process.env.CI,
  }),
  sharp,
  plugins: [],
})
