# Simpyll Pulse

Public route: `/pulse`. Portfolio entry: `/projects/simpyll-pulse`.

## Architecture and reusable infrastructure

Pulse extends `scripts/seo-audit.mjs` from #151, which inspects actual prerendered HTML with linkedom and the existing sitemap/XML validators. It does not maintain another validator or article registry. `collectArticles` and `readMetadata` from the publishing/redirect infrastructure supply canonical published article metadata. Existing SEO, theme tokens, adaptive header, project registry, case-study loader, Vite manifests, static renderer and performance budgets are reused. No charting dependencies, backend, remote APIs, tracking or publisher jobs are added.

The normal build prerenders the existing routes and a minimal Pulse document, runs the shared audit, projects an allowlisted snapshot, and renders Pulse with that snapshot. A final normal SEO gate validates the finished deployment. The renderer passes data through a provider and emits escaped JSON in the hydrated tree. Direct visits hydrate with the identical data; client navigation fetches `/pulse.json`. Pulse is a deferred route chunk. Article content styles and the existing project-detail styles are also loaded with their routes to preserve the unchanged CSS budget. Article code remains eager to preserve journal-to-article offline navigation and the exact static 404 hydration tree. Article CSS is linked in the initial HTML for journal/article routes and progressively loaded for SPA navigation. The graph uses deterministic SVG positions without a force simulation.

## Commands and owner reports

- `npm ci && npm run build`: normal full build, including public snapshot and local reports.
- `npm run audit:pulse`: regenerate from an existing `dist` build.
- `npm run audit:pulse -- /absolute/path/to/previous-report.json`: compare stable finding identifiers with a prior local baseline. New, existing and resolved findings are reported. Copy a report outside `artifacts` before rebuilding if you want to retain it.
- `npm run test:pulse && npm run test:seo`: projection/privacy, schema, determinism and shared validator tests (build first).
- `npx playwright test pulse`: browser tests; Chromium, Firefox and WebKit are included in the existing matrix.

Detailed reports are `artifacts/pulse/report.json` and `artifacts/pulse/report.md`. They include severity, rule, route, field, evidence, remediation, stable ID and baseline status. JSON additionally includes link classifications, contextual inbound sources, approximate crawl depth and site-navigation orphan status. They are ignored by Git and never copied to dist. This implementation deliberately keeps owner reports local: artifacts on a public GitHub repository must not be assumed private. The previous raw SEO audit is also removed from the shared CI artifact. No frontend authentication is claimed.

## Public contract and adding metrics

Schema v1 contains exactly: `schemaVersion`, `reportDate`, `indexablePages`, `articles`, `edges`, `health`, `analytics`.

- Article: canonical root-relative `route`, public `title`, `category`, `tags`, publication date `published`, deduplicated explicit `updates` dates.
- Edge: `from`, `to`, one directed relationship between distinct currently published articles.
- Health: category `name` and `critical`, `warning`, `informational` counts.
- Analytics: independently labeled `searchConsole` and `ga4`, each currently `{status: "unavailable"}`.

`projectPublic` constructs fresh objects with explicit fields. `validatePublic` rejects unknown keys at every object level, invalid dates, counts, routes and invalid edges. Never spread an internal object into this contract. Add a metric by identifying its authoritative source, documenting its meaning and privacy review, extending the explicit projection and validator, updating TypeScript and tests, and bumping the schema when compatibility changes. Google types are separate; enabling them requires the reviewed schema and integration work in #157. No API credentials or raw queries belong in public JSON.

## Audit methodology

Metadata, duplicate titles/descriptions, headings, canonicals, robots, expected public inventory, sitemap consistency, social metadata, structured-data identity and dates, broken destinations, fragments, aliases, local images and approximate crawl depth reuse #151. Date/identity checks compare generated pages with authoritative publishing records. Draft/withdrawn records are excluded from public projection even if accidentally present in the build; the existing private-output gate reports such leaks.

Severity mapping preserves the existing gate: Critical → critical; High/Medium → warning; Low → informational. Public warning counts include both actionable errors and subjective opportunities; they are not a pass/fail certification. CI still fails for the existing objective error rules, while editorial length and hierarchy opportunities remain warnings. No score or ranking estimate is calculated. A zero category means no findings detected, not proof all possible checks passed. JSON-LD validation is structural/identity checking, not a complete external schema.org validator. External citation availability is not fetched by this offline engine; citation rendering/validation stays with #63 and external availability with #80.

Links are classified in priority order: article-body contextual, breadcrumb, related-articles, global header, footer, previous/next, other navigation, project, other. Galaxy edges require both endpoints in the published article set and exclude self-links. Counts are unique directed article destinations, not repeated anchor instances. A contextual-link orphan has no inbound article-body edge; it may be well linked from navigation. A site-navigation orphan has no crawlable path from `/` in the static anchor graph. Crawl depth is breadth-first over rendered links and is an approximation, not a crawler simulation. The JSON owner report retains raw link records, explicit contextual-link orphan flags and duplicate contextual destination counts so repeated destinations and weakly linked pages can be inspected without publishing diagnostics.

## Dates, activity and history

`reportDate` is the source commit's calendar date (Git `%cs`); generation consults no wall clock. Identical source commits and inputs produce identical snapshots without timestamp commits or scheduled repository growth. The snapshot is regenerated on ordinary builds; snapshots are not automatically committed. Each local build retains up to 90 distinct source-commit dates under `artifacts/pulse/snapshots`; same-date builds replace that date, and older records are removed. CI runners are ephemeral and these owner archives are deliberately not uploaded. `docs/pulse/initial-public-snapshot.json` records the actual initial public measurement as a small, reviewed starting baseline. There are no scheduled history commits or public technical trend claims from this single baseline. Genuine independent technical baselines can be retained locally, but no historical technical trends are claimed on the public dashboard.

Publication curves count currently published articles by their author-controlled publication dates. Monthly update counts deduplicate revision/correction/updatedAt events per article/date. Notion synchronization and Git commits are not editorial events. Revision history may be incomplete, withdrawal history is not reconstructed, and publication dates do not prove continuous public availability. Calendar cells after the report date are unmeasured. No historical traffic is inferred.

## Accessibility and performance

Semantic metrics, captions, row/column headers and actual article links are prerendered. The graph supports Enter/Space, visible focus, selection labels and a searchable/filterable relationship table; graph use is optional. Categories are explicitly labeled in filters and the table rather than color-coded. Content charts have textual equivalents; activity dates have an expandable event list. Native controls work on touch; the dense year grid scrolls on narrow screens. Reduced motion disables transitions; no ongoing animation or simulation exists. Existing light/dark tokens determine all colors.

Route assets are included through the existing Vite manifest helper, including Pulse CSS on direct visits. Existing gzip budgets apply without changes. No article bodies, raw audit objects or new libraries ship in Pulse. Browser tests cover filtering, keyboard selection, no-JS output, hydration errors, horizontal layout and axe checks in both themes; screenshots are under `docs/pulse`. Automated axe results do not substitute for manual assistive-technology review.

For larger collections the map shows at most 120 matching articles, with deterministic ring positions for that visible subset. Search and category/orphan filters narrow the subset; the accessible inventory table retains all matches. Counts are precomputed from the full edge set. There is no per-frame recalculation or physics loop. This bounded map is progressive disclosure, not an assertion that hidden articles have no relationships.
