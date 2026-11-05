# Runbook — clean up photos uploaded before the media privacy change (#152)

**Audience:** Aziz (this touches production content — agent-prepared, human-run). No step uses Vercel or Neon directly: only public URLs and the `/admin` screen.
**What changed:** the public photo list is closed, and new uploads are stored without camera details (make, model, date, GPS). Photos uploaded **before** the deploy still carry their camera details and are still stored under their old names, so they need the steps below.

## Steps

### 1. Check the list is closed (after the deploy)

1. Open `https://flowlyst.io/api/media/file/<a file name from /admin → Media>`. The photo must show. If it does not, tell the lead at once.
2. Open a card page or About, which show a photo through `next/image`. The photo must show.
3. Run `curl -i https://flowlyst.io/api/media`. It must answer `403`, and the body must show no file names.
4. Run `curl -s -X POST https://flowlyst.io/api/graphql -H 'content-type: application/json' -d '{"query":"{ allMedia { docs { id } } }"}'`. It must return a "not allowed" error and no photo data.
5. Open a blog post and a contact card in the browser. Every photo must still show.

If step 5 fails (a photo is missing), stop and tell the lead before going on.

### 2. Replace each photo uploaded before the deploy

Do this for every JPEG or PNG uploaded earlier, at least the card headshots.

1. On your computer, rename the original file, for example `photo.jpg` to `photo-v2.jpg`. The new name must differ from the old one.
2. In `/admin` → **Media**, open the item and choose to replace the file with the renamed one. Save.
3. The item keeps its place: a card or post using it keeps showing it. Replacing deletes the old stored files because the names differ.
4. Check the old address no longer loads: open `https://flowlyst.io/api/media/file/<old file name>`. It must not show the photo.

### 3. Delete any photo you do not want public

1. In `/admin` → **Media**, find any photo you do not want public.
2. Before deleting, check where the photo is used. If a contact card uses it, the admin blocks the delete and names the card; remove the photo from that card first, then delete.
3. The admin does **not** warn you for anything else. A photo used as a blog post's featured image or Open Graph image, a case study's Open Graph image, a testimonial photo, an author photo, a case-study hero, or an image placed inside a blog post's or case study's text is deleted without a word, and that page loses its image. Check those yourself: open the photo in **Media** and compare it with what the posts, testimonials, authors and case studies show, or look through those collections in the admin for the photo. Also open each blog post body and each case study's intro, challenge, solution and results text in the admin and look for the photo there.
4. Once nothing else uses it, delete it.

## Good to know

- Re-uploaded JPEGs are re-compressed and converted to the standard sRGB colours, so wide-colour photos can shift slightly. PNGs can grow in size.
- A deleted or replaced file can stay visible from a cache for a short time.
- HEIC photos are refused at upload; export them as JPEG first.
