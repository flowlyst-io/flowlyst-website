import type { Access, FieldAccess } from 'payload'

/**
 * Shared access-control helpers.
 *
 * PRD §9 hard requirement: two roles, *enforced*. Admin can do everything;
 * Editor manages content only (never users or site settings). These predicates
 * are the single source of truth for who can do what across the CMS.
 */

/** Full access — reserved for Admins (users, settings, destructive ops). */
export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

/** Content access — Admins and Editors. */
export const isAdminOrEditor: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

/** Field-level variant of {@link isAdmin} (e.g. locking the `role` field). */
export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

/** Public — anyone, authenticated or not. */
export const anyone: Access = () => true

/**
 * Read access for public content collections/globals.
 *
 * Staff (Admin/Editor) see everything, including drafts. The public sees only
 * documents whose status field equals `published`, returned as a Payload
 * `where` constraint so drafts never leak through the REST/GraphQL API.
 *
 * @param statusField `_status` for collections using Payload drafts, or a plain
 *   `status` select for the simpler collections (testimonials, training).
 */
export const publishedOrStaff =
  (statusField = '_status'): Access =>
  ({ req: { user } }) => {
    if (user?.role === 'admin' || user?.role === 'editor') return true
    return { [statusField]: { equals: 'published' } }
  }

/**
 * Users may read/update their own record; Admins may read/update anyone.
 * (The `role` field itself is separately locked to Admins, so self-update can
 * never be used to self-escalate — see the Users collection.)
 */
export const adminOrSelf: Access = ({ req: { user }, id }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  if (id) return user.id === id
  return { id: { equals: user.id } }
}
