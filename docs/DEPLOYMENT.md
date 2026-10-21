# Deployment and hosting

[← README](../README.md)

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
