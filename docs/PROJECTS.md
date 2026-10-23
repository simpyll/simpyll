# Project content

Edit **content/projects.json** to add or update projects; presentation components do
not contain records. JSON is deliberately simple, requires no new dependency, and
is validated by the shared TypeScript schema in `src/projects/schema.ts` using
Node 24's native type stripping. Do not import the authoring file into application
code. It is outside Vite's source/public trees and may contain unpublished records
(but Git is not a secret store: never commit credentials or confidential material).

Run `npm run validate:projects` before committing. It reports practical errors
across all records and exits nonzero. `npm run dev`, `build`, `build:client` and
`build:server` regenerate the ignored `src/generated/projects.json`; PR and deploy
CI also run `npm run test:projects`. A failed generation removes the stale manifest.
Only public records are written. No validation depends on external availability.

## Add a record

This is an **illustrative example**, not an actual portfolio entry:

```json
{
  "id": "example-reading-notes",
  "slug": "example-reading-notes",
  "title": "Reading notes experiment",
  "summary": "An illustrative local tool for organizing reading notes.",
  "status": "in-progress",
  "visibility": "draft",
  "technologies": ["react", "typescript"],
  "tags": ["Learning"],
  "links": [
    { "kind": "repository", "label": "Read the example source", "url": "https://github.com/example/reading-notes" }
  ],
  "featured": { "enabled": false, "order": 10 },
  "order": 10,
  "startDate": "2026-10-01",
  "role": "Developer",
  "caseStudy": { "contentKey": "example-reading-notes-story" }
}
```

All fields shown before `startDate` are required, except `tags`. Arrays may be
empty, including technologies/links. Never guess a stack, public URL, metric or
completion date. The existing bedside entry is an exploration, not a shipped
application; Healthcare/Software/AI remain topic tags, not invented technologies.
The Simpyll entry preserves the existing documented React/TypeScript/MDX tags.

Keep `id` stable when changing the public slug. IDs and slugs are unique across
**all** visibility states, 1–100 lowercase alphanumeric characters in single
hyphen-separated words. Reserved slugs are `new`, `edit`, `index`, `about`, `blog`,
`explore`, `projects`, and `404`. Future published slug changes need #27's explicit
route migration/redirect plan; this pipeline never creates routes or redirects.

Set `visibility` to `public` only for owner-approved content; `draft` and `private`
are excluded even if featured. Public UI lookup functions never find hidden
records. Public `getAllProjects()` operates on the public manifest, not the
unpublished authoring collection. Build tooling may use the validated full
collection, but must explicitly apply publication filtering before output.

## Status and order

Status is development state, independent of visibility. The shared
`projectStatuses` object supplies human labels; #34 owns future badge styling.

| Status | Meaning |
| --- | --- |
| exploration | Questions or ideas being explored; no implemented software implied |
| planned | Intended work, not yet started |
| in-progress | Currently being developed |
| active | In use and evolving |
| maintained | Primarily upkeep rather than new development |
| completed | Intended scope finished |
| paused | Work temporarily stopped |
| archived | Retained for history; no ongoing upkeep implied |

Use nonnegative integer `order` for archive ranking. Set `featured.enabled` and
`featured.order` for homepage selection. The homepage keeps its two-card limit.
Ties use general order then stable ID with code-point comparison. Empty selection
renders an empty grid without errors. Screenshot order ties use source path in
future consumers; array order alone should not decide gallery order.

## Technologies, links and optional fields

Technology IDs come from the small `technologies` registry in
`src/projects/schema.ts`; add a new canonical ID/label there when necessary.
Duplicates and unregistered IDs fail. Technology array order is display order.
Topic tags are separate, unique case-insensitively, and preserve author order.

Links use `kind` (`live`, `repository`, `documentation`, `demo`, `article`, or
`resource`), a descriptive `label`, and `url`. Empty links are valid. The validator
normalizes absolute HTTP(S) URLs, distinguishes root-relative internal routes,
rejects unsafe schemes/controls/credentials/traversal, and rejects duplicate
normalized destinations. Consumers should use native same-tab anchors or the
existing internal Router link patterns; explicit new-tab links need
`noopener noreferrer` and accessible context. There is no implicit new tab.
Availability/internal-route existence is not promised by structural validation:
authors must link only to implemented destinations. Case-study association does
not create a card URL. There are currently no project links to migrate.

Optional text fields: `subtitle`, `description`, `category`, `role`,
`seoDescription`. Optional arrays: `tags`, `relatedArticles` (article slugs).
Dates `startDate`, `completionDate`, `updatedDate` are real YYYY-MM-DD calendar
dates; completion/update cannot precede start, and update cannot precede completion.
Unknown properties fail to catch authoring typos. Related-article existence is
not automatically checked.

## Images

Optional `cover` and `screenshots` use the same image shape:

```json
{
  "src": "/images/example-screen.png",
  "alt": "Reading notes grouped by topic",
  "caption": "An illustrative screen.",
  "width": 1200,
  "height": 800,
  "order": 0,
  "focalPoint": { "x": 0.5, "y": 0.5 }
}
```

Put originals in `public/images/` **only when ready to publish**, then reference
an existing path. Images of unpublished records are rejected because public/
files are copied to deployment independently of metadata. Keep unpublished media
outside public/ until publication. Removing an already published image/record is
not automatic historical media deletion; review references before removal.
Paths are checked against actual files and realpath containment, including
symlinks. Duplicate source references within a record fail. Informative images
need nonempty alt; decorative images require `decorative: true` and `alt: ""`.
Dimensions are optional but must be a positive pair when supplied. Focal
coordinates are optional numbers from 0 to 1. No screenshots are downloaded.

The existing #42 pipeline already processes public raster originals. Future
archive/case-study rendering must use the existing ArticleImage/Figure components
and source-keyed image manifest for responsive sources, intrinsic sizing and lazy
loading (see [IMAGES.md](IMAGES.md)); do not build another processor. No project
images exist today, so this issue adds metadata, not gallery UI.

## Consumer contract and scope

Import from `src/projects`:

- `getPublicProjects()` / `getAllProjects()` — ordered public records in the app.
- `getFeaturedProjects(limit = 2)` — public featured records, explicitly ordered.
- `getProjectBySlug(slug)` / `getProjectById(id)` — public record or `undefined`.
- `Project`, `ProjectImage`, `ProjectLink`, `ProjectStatus`, `Technology` types.
- `projectStatuses` and `technologies` for canonical display labels.

The schema also exports `ProjectInput` for typed tooling before link normalization.
No network fetching or runtime validation is needed in the homepage. Client and
SSR share the same generated public manifest, preventing hydration drift.

#53 will build the archive from `getPublicProjects()`; no archive exists yet.
#27 can associate an MDX narrative by stable project ID and optional
`caseStudy.contentKey`, deriving title/summary/status/SEO from this metadata rather
than repeating it in frontmatter. That association asserts available content, not
an implemented route: its renderer must validate content existence and public
visibility before creating routes/canonicals/structured data/sitemap entries.
No project detail URLs or sitemap entries are generated now. #34 owns status
presentation using the shared labels above. No GitHub metrics/API is introduced.
