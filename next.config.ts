import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    // Vercel Blob is the production media store (see the vercelBlobStorage plugin in
    // src/payload.config.ts), where uploaded media resolves to a public Blob URL. The
    // blog/case-study featured + hero images render through next/image (#69), so the
    // optimizer must be allowed to fetch those Blob-hosted originals. Blob public URLs
    // are https://<store-id>.public.blob.vercel-storage.com/…
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  async redirects() {
    return [
      // Legacy footer path insurance (issue #20 inventory / #21). The legacy site's
      // footer linked `/resources/case-studies`, which 404s today; the rewrite serves
      // the trust page at `/case-studies`, so preserve any stray inbound link with a
      // 301. `statusCode: 301` is deliberate — Next's `permanent: true` emits a 308,
      // and PRD §11 specifies 301 for changed paths. (`statusCode` and `permanent` are
      // mutually exclusive.)
      //
      // NOT redirected here: `/ai-chat` (parked as a Tural decision on #20 — the page
      // was removed from the inventory, no destination chosen yet) and the www→bare
      // host canonical redirect (Vercel domain-level, a #11 cutover runbook item, not
      // an app redirect).
      {
        source: '/resources/case-studies',
        destination: '/case-studies',
        statusCode: 301,
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
