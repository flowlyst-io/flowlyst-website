// @vitest-environment node
// Links and Contact cards collections (#146): code/slug rules, https-only,
// locked fields, and that every admin login sees everything.
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { findActiveLink, recordScan } from '@/links/resolveLink'
import type { User } from '@/payload-types'

let payload: Payload
let admin: User
let editor: User
const stamp = Date.now()
const pw = 'test-password-123'
const CODE_RE = /^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/

const makeLink = (data: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'links',
    data: { name: 'Booth', destination: 'https://example.org/x', ...data },
  })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  admin = await payload.create({
    collection: 'users',
    data: {
      email: `lc-admin-${stamp}@flowlyst.test`,
      password: pw,
      name: 'LC Admin',
      role: 'admin',
    },
  })
  editor = await payload.create({
    collection: 'users',
    data: {
      email: `lc-editor-${stamp}@flowlyst.test`,
      password: pw,
      name: 'LC Editor',
      role: 'editor',
    },
  })
})

afterAll(async () => {
  await payload.delete({ collection: 'links', where: { id: { exists: true } } })
  await payload.delete({ collection: 'cards', where: { id: { exists: true } } })
  await payload.delete({ collection: 'users', where: { email: { contains: `lc-` } } })
})

describe('Links', () => {
  it('generates a 6-character code from the alphabet, different per link', async () => {
    const a = await makeLink()
    const b = await makeLink()
    expect(a.code).toMatch(CODE_RE)
    expect(b.code).toMatch(CODE_RE)
    expect(a.code).not.toBe(b.code)
  })

  it('accepts only https destinations', async () => {
    await expect(makeLink({ destination: 'http://example.org' })).rejects.toThrow()
    await expect(makeLink({ destination: 'javascript:alert(1)' })).rejects.toThrow()
    const ok = await makeLink({ destination: 'https://example.org/x' })
    expect(ok.destination).toBe('https://example.org/x')
  })

  it('formats slugs, rejects duplicates and slugs equal to another link code', async () => {
    const first = await makeLink({ slug: 'Booth 2026' })
    expect(first.slug).toBe('booth-2026')
    await expect(makeLink({ slug: 'booth-2026' })).rejects.toThrow()
    const other = await makeLink()
    await expect(makeLink({ slug: other.code })).rejects.toThrow()
  })

  it('keeps the code when an update tries to change it', async () => {
    const link = await makeLink()
    const updated = await payload.update({
      collection: 'links',
      id: link.id,
      data: { name: 'Renamed', code: 'zzzzzz' },
    })
    expect(updated.name).toBe('Renamed')
    expect(updated.code).toBe(link.code)
  })

  it('does not let a user write scanCount', async () => {
    const link = await makeLink()
    const updated = await payload.update({
      collection: 'links',
      id: link.id,
      data: { scanCount: 99 },
      user: admin,
      overrideAccess: false,
    })
    expect(updated.scanCount).toBe(0)
  })
})

describe('Cards', () => {
  it('builds <name>-<random> slugs, keeps them on rename, defaults the website', async () => {
    const card = await payload.create({ collection: 'cards', data: { name: 'Aziz Aghayev' } })
    expect(card.slug).toMatch(/^aziz-aghayev-[abcdefghjkmnpqrstuvwxyz23456789]{6}$/)
    expect(card.website).toBe('https://flowlyst.io')
    const renamed = await payload.update({
      collection: 'cards',
      id: card.id,
      data: { name: 'Someone Else' },
    })
    expect(renamed.slug).toBe(card.slug)
  })

  it('rejects a non-https LinkedIn URL', async () => {
    await expect(
      payload.create({ collection: 'cards', data: { name: 'X', linkedIn: 'http://x.com' } }),
    ).rejects.toThrow()
  })
})

describe('access', () => {
  it('denies anonymous reads of links and cards', async () => {
    await expect(payload.find({ collection: 'links', overrideAccess: false })).rejects.toThrow(
      /not allowed|forbidden/i,
    )
    await expect(payload.find({ collection: 'cards', overrideAccess: false })).rejects.toThrow(
      /not allowed|forbidden/i,
    )
  })

  it('lets an editor create, read and delete, and see what the admin created', async () => {
    const adminLink = await payload.create({
      collection: 'links',
      data: { name: 'Admin link', destination: 'https://example.org/a' },
      user: admin,
      overrideAccess: false,
    })
    const adminCard = await payload.create({
      collection: 'cards',
      data: { name: 'Admin Card' },
      user: admin,
      overrideAccess: false,
    })

    const links = await payload.find({
      collection: 'links',
      user: editor,
      overrideAccess: false,
      limit: 100,
    })
    expect(links.docs.map((d) => d.id)).toContain(adminLink.id)
    const cards = await payload.find({
      collection: 'cards',
      user: editor,
      overrideAccess: false,
      limit: 100,
    })
    expect(cards.docs.map((d) => d.id)).toContain(adminCard.id)

    const ownLink = await payload.create({
      collection: 'links',
      data: { name: 'Editor link', destination: 'https://example.org/e' },
      user: editor,
      overrideAccess: false,
    })
    const ownCard = await payload.create({
      collection: 'cards',
      data: { name: 'Editor Card' },
      user: editor,
      overrideAccess: false,
    })
    await payload.delete({
      collection: 'links',
      id: ownLink.id,
      user: editor,
      overrideAccess: false,
    })
    await payload.delete({
      collection: 'cards',
      id: ownCard.id,
      user: editor,
      overrideAccess: false,
    })
    const gone = await payload.count({ collection: 'links', where: { id: { equals: ownLink.id } } })
    expect(gone.totalDocs).toBe(0)
  })
})

describe('Link resolution', () => {
  it('finds an active link by code, by slug and by an uppercase key', async () => {
    const link = await makeLink({ slug: `res-${stamp}` })
    const byCode = await findActiveLink(payload, link.code as string)
    expect(byCode?.destination).toBe('https://example.org/x')
    expect((await findActiveLink(payload, `res-${stamp}`))?.id).toBe(link.id)
    expect((await findActiveLink(payload, `RES-${stamp}`))?.id).toBe(link.id)
  })

  it('returns null for an inactive link and for an unknown key', async () => {
    const off = await makeLink({ active: false, slug: `off-${stamp}` })
    expect(await findActiveLink(payload, off.code as string)).toBeNull()
    expect(await findActiveLink(payload, `off-${stamp}`)).toBeNull()
    expect(await findActiveLink(payload, `nope-${stamp}`)).toBeNull()
  })

  it('counts 5 concurrent scans exactly and stamps the last scan', async () => {
    const link = await makeLink()
    await Promise.all(Array.from({ length: 5 }, () => recordScan(payload, link.id)))
    const after = await payload.findByID({ collection: 'links', id: link.id })
    expect(after.scanCount).toBe(5)
    expect(Date.now() - new Date(after.lastScannedAt as string).getTime()).toBeLessThan(60_000)
  })
})
