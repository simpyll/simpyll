# Automatic article images

## Architecture and inventory before this change

The existing MDX registry maps Markdown images and publisher JSX to ArticleImage;
Figure wraps it with a caption. Previously it forced lazy loading, with no
responsive markup or inferred dimensions. Vite copies public/ into dist/ and
prerenders the same React components as the client. Notion already downloads
hosted images with a restricted host allowlist, size limit, ownership manifest,
and a plan-before-write synchronization policy. It used SHA-256 public names.
There is no runtime image service, imported-image convention or hero image field.

Current media: two raster PNGs (16,356 and 1,563,530 bytes), architecture SVG,
SVG icons and favicon. Originals and existing URLs remain in public/ unchanged.
Content validation checks references before transformations. Existing opaque
Notion paths map to descriptive optimized URLs without editing owned articles.

## Add an image once

Put an original in public/images/ and use ordinary Markdown:

```md
![Build steps from source to GitHub Pages](/images/deployment-pipeline.png)
```

Or use the existing component:

```mdx
<Figure src="/images/deployment-pipeline.png"
  alt="Build steps from source to GitHub Pages"
  caption="The deployment pipeline." />
```

Optional Figure imageName supplies a public naming hint without becoming alt text.
Name precedence is imageName, caption, alt, meaningful original basename, then
article-slug-image-NN. Names are ASCII normalized, limited to 72 characters, and
suffixed with a short content/configuration fingerprint to avoid collisions.
The fallback describes article context, never guessed image contents. Empty alt
stays empty. Use captions in Notion for naming and the publisher's existing alt
behavior. Do not hand-edit publisher-owned articles or manifest files.

npm run dev and npm run build generate images before compilation. Manual
regeneration: npm run generate:images. Originals are committed; generated files
in public/images/optimized and src/generated/images.json are ignored.
A clean checkout regenerates everything without network access.

## Processing and delivery

Sharp validates raster types with a 40-million-pixel and 20-MiB input limit,
corrects EXIF orientation, strips metadata, and never upscales. Widths default
to 320, 480, 768, 1200, 1600 with the original width included below the cap.
Aspect ratio and alpha are preserved. PNG fallback and lossless WebP favor
technical screenshot legibility. AVIF quality 80 is retained only if at least
10% smaller than the corresponding WebP. AVIF remains lossy: review fine details
before using these settings for clinical figures. No crops are performed.

The typed renderer emits picture/source/img, MIME types, srcset, intrinsic
width/height and sizes matching the 768px article column. Narrow screens use
viewport minus 32px. Figure accepts loading and fetchPriority; reserve high priority for a genuine
above-the-fold LCP candidate. Article images default to eager/async so offscreen
figures are available to native printing without a scroll or JavaScript. Explicit
loading overrides remain supported. There are currently no article/card hero image fields to migrate.

SVGs remain trusted repository assets served externally, never injected as HTML;
Notion downloads reject SVG. Animated images remain original to avoid dropping
frames. These and external images are not transformed; supply dimensions when
using them. Remote URLs are never fetched during a production build. Root-relative
public URLs are the supported automatic convention; imported images, relative
URLs and dynamically computed JSX sources require explicit handling.

The source-keyed manifest records dimensions, fingerprints, names and variants
with MIME/dimensions/bytes. Cache sidecars include Sharp/libvips versions and
processing settings. Missing outputs invalidate a cache hit. Change the config
version when changing encoders. Delete public/images/optimized to force a clean
rebuild. Deploy restores this directory with Actions cache; no cache is required
for correctness. Old cache outputs may accumulate: clean it periodically to
limit artifact size. Build diagnostics show processed/cached/preserved assets
and original/largest WebP sizes, without remote signed URLs.

## Notion lifecycle and migration

New Notion source files use caption or article-context names plus a content suffix.
The page directory separates articles. The publisher stores block identity,
revision and unsigned URL identity; unchanged blocks with a stored revision
reuse validated local bytes. Missing revision or changed blocks download again.
Actual downloaded type is checked independently of the HTTP Content-Type.
Signed queries are never persisted. Hosted-image failures abort synchronization.
Ordinary external HTTPS images keep the existing external fallback.

All formerly published source URLs are retained, including removed/unpublished
article images. This deliberately trades disk space for compatibility, including
references outside the publisher. There is no automatic destructive media GC.
Review all cross-article/public references before a future cleanup. Source filenames
are never blindly renamed. Existing article canonical URLs remain unchanged.

## Validation and limitations

Run npm run test:images, npm run test:notion, npm run test:notion:build,
npm run build, npm run lint, and npm run test:e2e:built. Images browser tests
cover desktop/mobile format selection, dimensions, overflow, hydration errors,
and no-JS visibility. Browser screenshots are test-result artifacts.

Measured original → largest lossless WebP bytes on checked-in media:

| Source | Original | WebP | Reduction |
| --- | ---: | ---: | ---: |
| Notion publishing test | 16,356 | 8,822 | 46.1% |
| Architecture raster | 1,563,530 | 994,230 | 36.4% |

These are encoded file sizes, not measured production LCP/CLS or full-page
network savings. Actual transfer depends on browser choice and display density.
Real-device visual review, production LCP/CLS comparison and live Notion
acceptance remain necessary. No performance score or clinical fidelity is claimed.
Lightbox/gallery remains #59.

Missing local references fail content validation; malformed/oversized raster
assets fail image generation with a source path. For a missing generated URL,
remove the cache directory and rebuild, then verify dist/images/optimized and
prerendered picture markup. Check a failed Notion job before retrying; the
last deployed version stays available. Never log a signed source URL to debug.

### Unpublished article media

The URL-safety removal policy takes precedence over compatibility retention for
unpublished Notion pages: their source media can remain in Git, but it is omitted
from the public image manifest and deployment artifact. Stale transformation
cache files are also removed from the artifact. See [slug history](REDIRECTS.md).
