import { postgresAdapter } from '@payloadcms/db-postgres'
import { importExportPlugin } from '@payloadcms/plugin-import-export'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig, type Endpoint, type PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { isAdmin } from './access'
import { Users } from './collections/Users'

/**
 * Wrap a collection's custom endpoints with an Admin-only guard.
 *
 * The import-export plugin's `exports` collection exposes `/download` and
 * `/export-preview` custom endpoints that are NOT gated by collection access.
 * Left open, a non-Admin authenticated user hitting `/download` for an
 * Admin-only target collection causes the export stream to hang (no data leaks —
 * the target read is denied — but the request never resolves). This guard
 * returns a clean 403 before the plugin handler runs, making "export = Admins
 * only" a direct guarantee and removing the hang.
 */
const adminOnlyEndpoints = (endpoints: Endpoint[] | false | undefined): Endpoint[] =>
  (endpoints || []).map((endpoint) => ({
    ...endpoint,
    handler: (req: PayloadRequest) => {
      if (req.user?.role !== 'admin') {
        return Response.json({ errors: [{ message: 'Forbidden — admins only.' }] }, { status: 403 })
      }
      return endpoint.handler(req)
    },
  }))
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
    // CSV export for the lead inboxes (PRD §9). Export-only (`import: false`),
    // synchronous + download-only (`disableJobsQueue`/`disableSave`) so nothing
    // depends on the cron and no lead PII is persisted to disk. The plugin still
    // registers `exports`/`imports` upload collections and two jobs tasks
    // regardless; both collections are locked to Admins (imports fully hidden —
    // it's inert here). Export reads respect the target collection's access
    // (overrideAccess:false + user), so the Admin-only inboxes are the real gate.
    importExportPlugin({
      collections: [
        {
          slug: 'demo-requests',
          import: false,
          export: { disableJobsQueue: true, disableSave: true },
        },
        {
          slug: 'newsletter-subscribers',
          import: false,
          export: { disableJobsQueue: true, disableSave: true },
        },
      ],
      overrideExportCollection: ({ collection }) => ({
        ...collection,
        access: { ...collection.access, create: isAdmin, read: isAdmin, delete: isAdmin },
        admin: {
          ...collection.admin,
          group: 'Admin',
          hidden: ({ user }) => user?.role !== 'admin',
        },
        endpoints: adminOnlyEndpoints(collection.endpoints),
      }),
      overrideImportCollection: ({ collection }) => ({
        ...collection,
        access: { ...collection.access, create: isAdmin, read: isAdmin, delete: isAdmin },
        admin: { ...collection.admin, group: 'Admin', hidden: true },
        endpoints: adminOnlyEndpoints(collection.endpoints),
      }),
    }),
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
