# Architecture and rendering

[← README](../README.md)

## Prerendering and hydration

`npm run build` generates HTML for `/`, `/about`, `/blog`, `/explore`, and each MDX post. React renders
an entire document so React 19 can place metadata in the head; JSON-LD stays in
the hydrated body tree. Do not extract arbitrary tags from rendered app HTML.
Run the full build before rerunning prerender (the script rejects an already
prerendered index to prevent nesting an old page inside a new one).

`npm run preview` serves each generated directory index at URLs with or without
a trailing slash. Production hosting must likewise resolve `/blog` to
`dist/blog/index.html` and `/blog/hello-world` to its own index **before** any SPA
fallback. Serving the homepage at these URLs causes a hydration mismatch and
incorrect static SEO content. The Vite preview middleware does not configure
an external hosting provider.

After building, run `node --test scripts/prerender.test.mjs` to check static
content, metadata, and JSON-LD placement. With preview running, use
`PREVIEW_URL=http://localhost:4173 node --test scripts/prerender.test.mjs` to also
check HTTP responses for clean URLs, trailing slashes, and query strings.


### Phase 6 audit notes

The build also produces `dist/404.html`. Configure production hosting to serve
that document with HTTP 404 for unknown routes, rather than returning the
homepage with HTTP 200. Preview applies this behavior for extensionless URLs.
The preview plugin is not a production server configuration.

Reveal animations retain their normal appearance. Reduced-motion CSS makes
reveals immediately visible and removes their translation; a noscript rule
makes the same content visible when JavaScript is disabled. Keyboard users can
skip the header and receive a visible focus outline. Article body headings
should start at H2 because the page supplies its H1. The existing repeated
sample title has presentation semantics to preserve its appearance.

The footer year is bundled at build time to avoid cached HTML disagreeing with
client time after New Year. Rebuild to update it. The introductory MDX post still contains a sample author (`Your Name`) and
generic starter prose. Replace these with the intended public author name and
an authored introduction before publication.

undefined
See [error recovery](ERROR-RECOVERY.md) for route isolation, bounded retry,
application fallback, privacy, and the current loading/network feature audit.

See [article URL safety and slug history](REDIRECTS.md) for the identity model,
full-history build requirement, static redirects and removal policy.

## Public profile

`src/content/profile.ts` is the typed source for owner-approved public biography,
roles (including overlapping assignments), education, training, interests, and
social links. Both the homepage About teaser and `/about` consume it. The page
also derives its metadata and ProfilePage/Person JSON-LD from this source.
Update facts there; no CMS or runtime network request is involved. Training is
not a claim of verified current renewal status. The existing `/#about` section
remains a bookmark target, while the navigation points to `/about`. The project
CTA uses the existing `/#work` section; no unimplemented project route is linked.
Issue #41 printable CV remains separate. Starter articles remain unchanged.

See [unified discovery](DISCOVERY.md) for combined URL search, taxonomy filters, sorting and prerender behavior.

Project metadata and publication contract: [PROJECTS.md](PROJECTS.md).

### Breadcrumb navigation

Before #5, articles and case studies had single parent back links; article
BlogPosting JSON-LD and canonical tags were separate existing head components.
Breadcrumbs now replace those back links on the only shipped nested routes:
Home → Blog → article, and Home → Projects → case study. Top-level and unknown
pages omit them; learning and notes have no implemented nested routes yet.

Resolved public records supply titles and canonical paths to `contentBreadcrumbs`.
`Breadcrumbs` uses that same data for its ordered navigation list and one Helmet
BreadcrumbList script, serialized with HTML-safe escaping. Existing SEO and article
schema are preserved. Current pages are noninteractive `aria-current` text;
ancestors are native links with visible focus. CSS truncation retains the full
accessible title on mobile. Breadcrumbs are hidden in print.

New articles and studies inherit this automatically. Future nested page templates
can pass their authoritative metadata through the shared component; do not add a
second title registry. Blog aliases redirect before rendering content; static alias
stubs contain no breadcrumb schema. Renamed titles/slugs therefore use only the
current canonical record without changing immutable identity.

After one `npm run build`, run `node --test scripts/breadcrumbs.test.mjs` and
`npx playwright test breadcrumbs` to check the actual static HTML, schema/UI
agreement, omissions, aliases, keyboard focus, themes, mobile and no-JavaScript
navigation. Inspect `dist/blog/<slug>/index.html` for the nav and BreadcrumbList;
its final item must match the existing canonical link. Screenshots are emitted
as Playwright test artifacts. No new dependencies, build steps or API calls.
