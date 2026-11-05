# Runbook — clean up photos uploaded before the media privacy change (#152)

**Audience:** Aziz (this touches production content — agent-prepared, human-run). No step uses Vercel or Neon directly: only public URLs and the `/admin` screen.
**What changed:** the public photo list is closed, and new uploads are stored without camera details (make, model, date, GPS). Photos uploaded **before** the deploy still carry their camera details and are still stored under their old names, so they need the steps below.

## Steps

### 1. Check the list is closed (after the deploy)

1. Run `curl -i https://flowlyst.io/api/media`. It must answer `403`, and the body must show no file names.
2. Run `curl -s -X POST https://flowlyst.io/api/graphql -H 'content-type: application/json' -d '{"query":"{ allMedia { docs { id } } }"}'`. It must return a "not allowed" error and no photo data.
3. Open a blog post and a contact card in the browser. Every photo must still show.

If step 3 fails (a photo is missing), stop and tell the lead before going on.

### 2. Replace each photo uploaded before the deploy

Do this for every JPEG or PNG uploaded earlier, at least the card headshots.

1. On your computer, rename the original file, for example `photo.jpg` to `photo-v2.jpg`. The new name must differ from the old one.
2. In `/admin` → **Media**, open the item and choose to replace the file with the renamed one. Save.
3. The item keeps its place: a card or post using it keeps showing it. Replacing deletes the old stored files because the names differ.
4. Check the old address no longer loads: open `https://flowlyst.io/api/media/file/<old file name>`. It must not show the photo.

### 3. Delete any photo you do not want public

1. In `/admin` → **Media**, find any photo you do not want public.
2. Delete it. If a card or post uses it, the admin names that item; remove the photo there first, then delete.

## Good to know

- Re-uploaded JPEGs are re-compressed and converted to the standard sRGB colours, so wide-colour photos can shift slightly. PNGs can grow in size.
- A deleted or replaced file can stay visible from a cache for a short time.
- HEIC photos are refused at upload; export them as JPEG first.
