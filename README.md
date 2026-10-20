# Simpyll

A personal website and public learning journal about the journey from critical
care nursing into software engineering and AI. The site brings together a
learning journal, projects and experiments, and questions at the intersection
of healthcare and technology.

Built with React, TypeScript, Vite, MDX, and Motion. Blog content lives in
`src/content/blog`; page metadata lives alongside the page content and in
`src/config/site.ts`.

- `npm run dev`: local development.
- `npm run build`: TypeScript checks, sitemap generation, client and server
  builds, and static prerendering.
- `npm run preview`: preview the production output.
- `npm run lint`: lint the codebase.
- `node --test scripts/prerender.test.mjs`: validate the generated HTML and SEO.

## Prerendering and hydration

`npm run build` generates HTML for `/`, `/blog`, and each MDX post. React renders
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


## GitHub Pages deployment

`.github/workflows/deploy.yml` builds and deploys on pushes to `main`, and can
also be run manually from Actions. It uses Node.js 24, npm's lockfile cache,
`npm ci`, the complete build pipeline, linting, and prerender/SEO tests before
uploading only `dist/` through the official Pages actions. Deployment runs are
serialized and active deployments are allowed to finish.

The intended URL is `https://simpyll.com/`, so Vite uses `base: '/'`.
`public/CNAME` is copied to `dist/CNAME`. With Actions-based Pages deployments,
GitHub's Pages custom-domain setting is authoritative; CNAME alone does not
configure that setting. Keep Settings → Pages configured with GitHub Actions
and custom domain `simpyll.com`. DNS is managed separately; after its check and
certificate provisioning finish, enable Enforce HTTPS if it is not enabled.

Pages serves the generated directory indexes for `/blog/` and each article,
while canonical URLs remain consistent with `https://simpyll.com`. The artifact
includes `404.html`, `sitemap.xml`, `robots.txt`, and route-specific SEO HTML;
there is no homepage-as-404 SPA fallback. No deployment secret or personal
access token is needed by the workflow.

Deployment setup note: GitHub rejected assigning `simpyll.com` because that
domain is already attached to another Pages site. Release it from the existing
site, or verify ownership using GitHub's custom-domain verification process,
then save `simpyll.com` in this repository's Pages settings. Until that succeeds,
the Pages API reports `https://simpyll.github.io/simpyll/`; this build intentionally
uses root-relative assets for the custom domain, so the repository-subpath URL
is not a substitute for the intended production URL. No DNS changes are made
by the workflow.
