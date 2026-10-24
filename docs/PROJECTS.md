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
  "workflowStage": "in-progress",
  "lifecycleStatus": "active",
  "projectType": "Learning",
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
completion date. The approved initial inventory includes 21 projects; only Simpyll has a verified software stack.

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

Workflow and lifecycle are independent of each other and visibility.
The canonical registries are `workflowStages` and `lifecycleStatuses`; see the
Project Lab section below. #34 owns broader reusable badge styling.

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
not create a card URL. The Simpyll links and explicitly labeled existing RNtoNP website are owner-verified.

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
- `Project`, `ProjectImage`, `ProjectLink`, `WorkflowStage`, `LifecycleStatus`, `Technology` types.
- `workflowStages`, `lifecycleStatuses` and `technologies` for canonical display labels.

The schema also exports `ProjectInput` for typed tooling before link normalization.
No network fetching or runtime validation is needed in the homepage. Client and
SSR share the same generated public manifest, preventing hydration drift.

The Project Lab archive uses `getPublicProjects()` for both Board and Grid.
#27 can associate an MDX narrative by stable project ID and optional
`caseStudy.contentKey`, deriving title/summary/workflow/lifecycle/SEO from this metadata rather
than repeating it in frontmatter. That association asserts available content, not
an implemented route: its renderer must validate content existence and public
visibility before creating routes/canonicals/structured data/sitemap entries.
No project detail URLs are generated; `/projects` is in the sitemap. #34 owns status
presentation using the shared labels above. No GitHub metrics/API is introduced.

## Project Lab (`/projects`)

The shared `workflowStage` is required: `ideas`, `on-deck`, `in-progress`,
`shipped`, `archived`, in that display order. Move a card by editing that field
in its one authoritative JSON record. `lifecycleStatus` is separately required:
`planned`, `active`, `maintained`, `paused`, `retired`. A live site can remain
In Progress. The old mixed `status` field has been removed; do not reintroduce it.
`projectType` is required; `nextMilestone` (nonempty text) and `priority`
(nonnegative integer, currently informational) are optional. Edit the milestone
in the same record. No dates, progress metrics or release availability are inferred.

The default read-only Board groups public records into five columns. Desktop
uses a keyboard-focusable horizontal scroll region with readable minimum column
widths. Mobile selects a single stage (initially In Progress); all columns remain
in server HTML. No-JavaScript CSS shows every stage and the remaining Ideas.
Ideas initially shows four cards with explicit expansion; Grid shows the complete
filtered collection. Empty stages have compact messages. No destinations means
no link or clickable-card affordance. Optional descriptions use native details.
No case-study route is generated: #27 must add real pages before linking them.

Search matches title, summary, description, type, topic tags and technology labels.
Type, technology, stage and lifecycle selectors use AND composition. Search uses
a case-insensitive literal substring; there are no API requests or search library.
URL parameters: `q`, `type`, `technology` (canonical ID), `stage`, `lifecycle`,
`view=grid`. Board omits `view`. Switching views preserves filters; Reset preserves
view. Search replaces the history entry while selector/view changes push entries;
back/forward and refresh restore them. Unknown filter values fall back to All.
Mobile viewing-stage selection is local unless an explicit stage filter is active.
Query variants canonicalize to `/projects` and set noindex after hydration; the
static host serves the canonical prerendered page for query URLs. First hydration
matches that static HTML before applying query state, as in Explore.

Featured Work still selects the first two public enabled records by featured order
and preserves its existing two-card layout. Change `featured.enabled` and
`featured.order` in JSON to control inclusion and ranking; `order` then stable ID
break ties. Draft/private records are excluded from the generated client manifest.

| Workflow | Meaning |
| --- | --- |
| Ideas | Candidate concepts being considered |
| On Deck | Selected for upcoming development |
| In Progress | Currently receiving active work |
| Shipped | A released, publicly accessible deliverable |
| Archived | Retired, discontinued, or intentionally set aside |

Lifecycle describes maintenance independently: Planned has not started; Active
receives ongoing work; Maintained receives upkeep; Paused is temporarily stopped;
Retired is no longer maintained. Editing workflow never changes lifecycle implicitly.

## Case studies (#27)

Set `caseStudy.contentKey` on a public project only when a complete editorial file
exists in `content/case-studies/<contentKey>.json`. The project generator validates and publishes only associated public editorial
content into an ignored generated manifest. Do not copy title, status,
stack or canonical links into editorial content. The layout reads them from the
validated metadata. Only Simpyll is published in this increment.

Each study supplies `sections` (unique hyphenated `id`, `title`, nonempty
`paragraphs`). `timeline` is optional; entries use verified ISO date, title, text
and source URL. Optional metadata `screenshots` render through the existing
responsive Figure component; omit empty galleries. Optional section `flow` supplies a caption, textual steps and explanation;
optional section `links` supplies labeled source URLs. Neither assumes a
particular project or repository. No interactive gallery
or new scroll-spy system is introduced.

`generate-projects.mjs` validates sections, optional diagrams, safe source URLs
and timeline dates. `project-routes.mjs` derives both prerender and sitemap
routes from the public manifest. Missing associated files fail the build.
The renderer reads the public generated editorial manifest; unassociated and
unpublished content stays outside the application bundle. Unknown/unpublished slugs use NotFound. Published slug changes require
an explicit migration plan; article redirect history remains unchanged.

Verify with build, lint, `npm run test:projects`,
`node --test scripts/case-study.test.mjs`, and
`npx playwright test project-detail`. Check source claims against current main,
use bounded accessibility claims, and leave project workflow/lifecycle untouched
when publishing a case study. Case study publication is not project completion.

### Simpyll editorial evidence (October 23, 2026)

- Initial scaffold: `610060e` (October 18); MDX and deployment: `0338051`,
  `8f90620` (October 20). Workflow creation is not asserted as the first successful deployment.
- Rich publishing/search/images/verification: merged PRs #105–#108 (October 22).
- Article navigation: #114/#115; project metadata/board: #117/#118 (October 23).
- Content-inventory regression: merged PR #119. Architecture claims use
  `docs/ARCHITECTURE.md`, `src/entry-server.tsx`, `scripts/prerender.mjs`,
  `scripts/notion/`, image tooling, and `.github/workflows/`.
- Timeline dates are commit dates. Installed lockfile versions inspected include
  React 19.2.8, Vite 8.3.4, Tailwind 4.3.3 and Motion 14.3.0; public prose uses
  technology names to avoid stale patch-version claims.
