/**
 * Launch-day content fixes (Refs #70). Dry-run by default; `--apply` writes.
 *
 *     pnpm content:fix            # report only
 *     pnpm content:fix --apply    # write
 *
 * 1. Blog bodies: literal `**x**` in text nodes becomes real bold (see convertBoldMarkers).
 * 2. Author `aziz-aghayev`: title "Founder & CEO", and the headshot if none is set.
 *
 * Idempotent: a re-run after `--apply` reports 0 changes. Writes pass
 * `context: { disableRevalidate: true }` because the collection hooks call Next's
 * revalidatePath, which throws outside a request scope; the next production deploy
 * refreshes the cached pages instead.
 */
import 'dotenv/config'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import type { BlogPost } from '@/payload-types'
import { convertBoldMarkers } from '@/utilities/lexicalBold'

const AUTHOR_SLUG = 'aziz-aghayev'
const AUTHOR_TITLE = 'Founder & CEO'
const PHOTO_PATH = 'public/images/aziz-aghayev.jpg'
const PHOTO_ALT = 'Aziz Aghayev, founder of flowlyst'

const apply = process.argv.includes('--apply')
// Local proof only: lets --apply run without Vercel Blob, writing media to ./media.
const allowLocalMedia = process.argv.includes('--local-media')

async function fixPosts(payload: Payload): Promise<{ changed: number; unmatched: number }> {
  const posts = await payload.find({
    collection: 'blog-posts',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })

  let changed = 0
  let unmatched = 0
  for (const post of posts.docs) {
    const result = convertBoldMarkers(post.body)
    console.log(
      `  ${post.slug}: ${result.converted} bold pair(s) ${apply ? 'converted' : 'to convert'}, ${result.unmatched.length} unmatched`,
    )
    for (const snippet of result.unmatched) console.log(`      unmatched ** in "${snippet}"`)
    unmatched += result.unmatched.length
    if (result.converted === 0) continue

    changed += 1
    if (apply) {
      await payload.update({
        collection: 'blog-posts',
        id: post.id,
        data: { body: result.body as BlogPost['body'] },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    }
  }
  return { changed, unmatched }
}

async function fixAuthor(payload: Payload): Promise<number> {
  const found = await payload.find({
    collection: 'authors',
    where: { slug: { equals: AUTHOR_SLUG } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const author = found.docs[0]
  if (!author) {
    console.log(`  author "${AUTHOR_SLUG}" not found — nothing to fix`)
    return 0
  }

  const data: { title?: string; photo?: number } = {}
  if (author.title !== AUTHOR_TITLE) data.title = AUTHOR_TITLE

  const needsPhoto = !author.photo
  if (needsPhoto) {
    if (apply && !process.env.BLOB_READ_WRITE_TOKEN && !allowLocalMedia) {
      throw new Error(
        'BLOB_READ_WRITE_TOKEN is not set: the headshot would land on local disk, where the deployed site cannot see it.',
      )
    }
    if (apply) {
      const buffer = await readFile(path.resolve(PHOTO_PATH))
      const media = await payload.create({
        collection: 'media',
        data: { alt: PHOTO_ALT },
        file: {
          data: buffer,
          name: path.basename(PHOTO_PATH),
          mimetype: 'image/jpeg',
          size: buffer.length,
        },
        overrideAccess: true,
      })
      data.photo = media.id as number
    }
  }

  const changes = [...Object.keys(data), ...(needsPhoto && !apply ? ['photo'] : [])]
  console.log(
    `  ${AUTHOR_SLUG}: ${changes.length ? `${apply ? 'set' : 'would set'} ${changes.join(', ')}` : 'already correct'}`,
  )
  if (apply && Object.keys(data).length) {
    await payload.update({
      collection: 'authors',
      id: author.id,
      data,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  }
  return changes.length
}

async function main(): Promise<void> {
  console.log(apply ? 'APPLY mode — writing changes' : 'DRY RUN — no changes written (use --apply)')
  const payload = await getPayload({ config })

  // Author first: its missing-token failure must abort before any post is written.
  console.log('\nAuthor:')
  const author = await fixAuthor(payload)
  console.log('\nBlog posts:')
  const posts = await fixPosts(payload)

  console.log(
    `\nSummary: ${posts.changed} post(s) ${apply ? 'changed' : 'to change'}, ${author} author change(s), ${posts.unmatched} unmatched ** to review by hand.`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('\nContent fix FAILED:', err)
  process.exit(1)
})
