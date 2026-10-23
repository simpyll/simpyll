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
