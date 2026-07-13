import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Authors } from './collections/Authors'
import { BlogPosts } from './collections/BlogPosts'
import { CaseStudies } from './collections/CaseStudies'
import { Testimonials } from './collections/Testimonials'
import { TrainingPrograms } from './collections/TrainingPrograms'
import { DemoRequests } from './collections/DemoRequests'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { ContactMessages } from './collections/ContactMessages'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // The full PRD §9 content model. Order controls the admin nav order within
  // each `admin.group` (Content, Leads, Admin).
  collections: [
    // Content
    BlogPosts,
    CaseStudies,
    Testimonials,
    TrainingPrograms,
    Authors,
    Media,
    // Leads
    DemoRequests,
    ContactMessages,
    NewsletterSubscribers,
    // Admin
    Users,
  ],
  globals: [SiteSettings],
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
  // Jobs queue. Enabling `versions.drafts.schedulePublish` on blog posts and
  // case studies auto-registers the `schedulePublish` task and enables the
  // queue; we only need to secure the run endpoint. Due scheduled-publish jobs
  // are processed when something hits GET /api/payload-jobs/run — in production
  // a Vercel Cron (see vercel.json) authenticated with CRON_SECRET.
  jobs: {
    access: {
      run: ({ req }) => {
        if (req.user?.role === 'admin') return true
        const secret = process.env.CRON_SECRET
        if (!secret) return false
        return req.headers.get('authorization') === `Bearer ${secret}`
      },
    },
  },
  sharp,
  plugins: [
    // Media storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set (staging/prod),
    // local filesystem otherwise (dev). `alwaysInsertFields` keeps the media
    // schema identical whether or not Blob is enabled, so one committed migration
    // is valid in every environment.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      alwaysInsertFields: true,
    }),
  ],
})
