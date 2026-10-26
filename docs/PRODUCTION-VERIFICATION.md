# Production verification and recovery

Issue #75 adds read-only verification of `https://simpyll.com` after Pages deploys.
Build success, Pages publication, public HTTP verification, and browser verification
are separate outcomes. A verification failure makes the workflow fail; it does
not undo a successful Pages publication or roll back content automatically.

## Architecture

`npm run build` finishes with `scripts/smoke/generate.mjs`, which parses the actual
prerendered HTML using LinkeDOM. `dist/deployment.json` contains the checked-out
Git SHA (not the caller workflow's potentially older SHA), timestamp, Actions run
ID, route titles, article-body excerpts and publication dates. These are public
content only. It enumerates all MDX routes, including manually authored and
Notion-generated posts, rather than the search index, which excludes test-named
posts. It rejects an empty article at build time. Nothing changes publishing,
routing, CSS, DNS, or the application runtime.

The deploy workflow preserves that manifest separately from the Pages artifact.
Its read-only `verify` job needs both successful build and deploy jobs, checks out
the built SHA, and downloads the expected manifest. `smoke:http` first waits for
public metadata matching that SHA. It validates pages against the **local release
manifest**, so a missing new article cannot disappear from test expectations just
because production serves an old index. No rebuild or deploy occurs in this job.

Existing `pages` workflow concurrency serializes publication **and verification**,
including the Notion reusable-workflow path. Monitoring has a separate concurrency
group, so it cannot replace a queued Pages deployment. If a scheduled probe sees
its release change while checking it, it reports `superseded` instead of blaming
the obsolete release; rerun manually to verify the replacement immediately.

## Coverage and cost

Every generated home, blog and article document must return HTTP 200, HTML,
prerendered main content, the exact expected H1, one correct production canonical,
and (for articles) an article-specific excerpt inside `article .prose`. The blog
must link every article. This catches generic shell/homepage fallbacks, stale or
incorrect article routing, and empty article bodies even when HTTP is 200.
The sitemap must be valid XML, use production URLs and contain every built route.
There is currently **no RSS feed**; metadata records `rss: null` and reporting
explicitly skips it. Add a feed URL and extend its semantic assertions when RSS
is implemented; this issue does not introduce a publishing system.

Referenced same-origin JS/CSS bundles and up to three unique article images are
checked for status, content type, nonempty bytes and HTML masquerading as assets.
Chromium also detects failed same-origin script/style/image/font requests, bad
asset statuses, uncaught exceptions and React/hydration console errors. Ordinary
warnings and unrelated third-party request failures do not fail the run. The
browser checks the oldest and newest article (deduplicated), client navigation,
direct reload/hydration, canonical URLs and 404 recovery. Existing offline browser
regressions still cover all articles before deployment.

`/blog/__production-smoke-missing__` must render `Page not found.`, no canonical,
`noindex`, and a recovery link. HTTP 404 is the intended Pages response. A static
host's HTTP 200 fallback is accepted only if it contains the same genuine missing
page, never homepage/article HTML. Both HTTP behavior and browser recovery are
checked. Hosting that replaces 404.html with the homepage is unhealthy.

## Running checks

Use Node 24 and `npm ci`, then:

```bash
npm run test:smoke
npm run build
npm run smoke:http
npx playwright install chromium
npm run smoke:browser
```

Browser smoke tests consume the successful HTTP report, so always run HTTP first.
The default base URL is production. No production credentials are used.
To test a local build, start `npm run preview -- --host 127.0.0.1 --port 4173`:

```bash
SMOKE_BASE_URL=http://127.0.0.1:4173 SMOKE_MANIFEST=dist/deployment.json npm run smoke:http
SMOKE_BASE_URL=http://127.0.0.1:4173 npm run smoke:browser
```

Deployment CI sets `SMOKE_EXPECTED_SHA` and `SMOKE_MANIFEST`. Manual/scheduled
availability probes omit these and inspect the currently published manifest.
The canonical origin remains `https://simpyll.com` even against a local server.
HTTPS is mandatory except for localhost fixtures; Node's normal certificate and
hostname verification remains enabled. Cross-origin redirects (including a
GitHub Pages default domain), redirect loops and >5 redirect hops are rejected.
Each HTTP request/redirect chain has a 10-second AbortSignal deadline.

Identity propagation permits six attempts with delays of 5, 10, 20, 30 and 30
seconds (95 seconds of waiting plus bounded network requests). Set
`SMOKE_INITIAL_DELAY_MS` in 0–30000 to change the first backoff. Stale identities,
network errors, temporary 404 and gateway/server failures are retried. Forbidden
metadata responses and malformed metadata fail immediately. Transport errors, temporary 404s and gateway/server errors get one short retry per URL;
content assertion failures are never retried to conceal a bad release. The job has a 12-minute outer
limit; the availability job has a 10-minute limit. These are bounded probes, not
an unlimited availability loop.

## Reports and notifications

The Actions summary lists domain, expected and observed SHA, timestamp, identity
attempt count, URLs, status, check names and expected/actual failure evidence.
`artifacts/production/http.json` also contains each identity attempt and article
expectations. A failure looks like:

```text
URL: https://simpyll.com/blog/new-article
Check: rendered HTML / canonical / content
HTTP: 200
Expected: h1 New article; Actual: Frombedside tobuild.
Expected SHA: <release commit>; observed SHA: <release commit>
Result: failed
```

Browser output includes screenshots, traces, an HTML report and browser errors.
CI retains diagnostics for seven days. HTTP probes store metadata/errors, not
full response bodies. Browser artifacts contain only the public site; no signed-in
session or user-provided content is used. Do not add tokens or request headers to
logs. GitHub Actions failure notifications are the alert channel; subscribe to
workflow failure notifications in your GitHub notification settings.

`Production availability` runs every six hours at minute 23 and supports manual
workflow dispatch. It performs HTTP checks only to minimize traffic and CI use.
Disable its schedule in `.github/workflows/monitor.yml` if unwanted. GitHub cron is
best-effort: it may be delayed, skipped, or disabled for an inactive repository.
This is not guaranteed real-time uptime monitoring, multi-region monitoring,
certificate-expiration forecasting, or a replacement for an external uptime SLA.
It cannot catch browser-only regressions between deployments; the post-deploy
Chromium check handles those. Identity/availability retries reduce transient
alerts, but persistent content errors should remain visible.

## Recovery runbook

Start with the failed URL, expected/actual check and observed SHA in the summary:

- [Pages settings](https://github.com/simpyll/simpyll/settings/pages)
- [Deployment logs](https://github.com/simpyll/simpyll/actions/workflows/deploy.yml)
- [Availability logs](https://github.com/simpyll/simpyll/actions/workflows/monitor.yml)
- [Notion publisher logs](https://github.com/simpyll/simpyll/actions/workflows/notion-publish.yml)
- [All workflow logs](https://github.com/simpyll/simpyll/actions)

1. **DNS resolution / incorrect records:** Run `dig simpyll.com A`,
   `dig simpyll.com AAAA`, and `dig simpyll.com CNAME` (or `nslookup`). Compare with
   GitHub's [custom domain guidance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
   and your registrar's intended apex records. Inspect conflicting records before
   making an intentional registrar change. Do not copy arbitrary IPs from logs,
   delete ownership TXT records or change DNS as part of a smoke-test rerun.
2. **HTTPS or expired/unavailable certificate:** Check `curl -Iv https://simpyll.com/`
   and Pages' certificate/domain status. Verify hostname, trust chain and the DNS
   check. Follow [HTTPS troubleshooting](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
   Never bypass TLS validation, disable Enforce HTTPS as a test workaround, or put
   credentials in diagnostic commands.
3. **Domain verification / wrong site:** Confirm Pages source is GitHub Actions
   and custom domain is `simpyll.com`. Resolve any ownership conflict through
   [domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
   The older setup note in DEPLOYMENT.md describes a historical conflict, not a
   current DNS assertion. Verify settings before moving a domain from another site.
4. **CNAME:** `public/CNAME` and deployed `CNAME` should contain `simpyll.com`.
   For Actions deployments, Pages settings remain authoritative. Vite base is `/`;
   `simpyll.github.io/simpyll/` is not an equivalent deployment target. Fix source
   through review and rebuild rather than editing deployed artifacts manually.
5. **Redirect loops / wrong canonical host:** Inspect `curl -I` per hop and the
   runner's redirect evidence. Check registrar forwarding and Pages custom-domain
   settings. The runner permits same-origin slash normalization, never a downgrade
   to HTTP or a redirect to the default Pages domain. It probes the canonical host;
   alternate `www` and HTTP entry-point policies require separate checks if added.
6. **Missing deployed content / failed Actions:** Separate a build/deploy failure
   from a successful deploy with failed verification. Inspect the uploaded Pages
   artifact, its directory indexes and deployment manifest. Correct the source or
   workflow via PR, then rerun the normal deployment. Verification never uploads
   content. Do not delete a working deployment to troubleshoot it.
7. **Stale CDN:** Compare `/deployment.json` with the expected checked-out commit.
   Retry using manual verification after the bounded propagation window. Do not
   declare an old healthy site successful. If another release replaced it, inspect
   the newer workflow instead. Persistent staleness merits Pages status/settings
   and deployment-log investigation, not an unbounded retry increase.
8. **One article broken:** Inspect that route's initial HTML, title, canonical and
   `.prose` body, not only the homepage. Compare the release manifest and sitemap.
   Confirm its MDX filename/slug, exported metadata, Notion publication status and
   ownership manifest. Review the Notion publisher's validated commit and reusable
   deployment SHA. Check article images and browser errors in the diagnostic
   artifact. Reproduce with `npm run build`, the local smoke runner and existing
   article tests; fix content/imports in a PR. Do not publish private drafts just
   to produce a passing probe.

To add checks, keep parsing/assertions in `scripts/smoke/core.mjs`, collection and
reporting in `run.mjs`, and fixture failures in `*.test.mjs`. Add a representative
browser assertion for runtime-only failures. Avoid introducing a second deploy
workflow, write permissions, paid services or a manually maintained article list.

The HTML/XML parsers (`linkedom`, `fast-xml-parser`) are development dependencies,
not client bundle dependencies. They provide structural HTML selectors and real
XML syntax validation rather than fragile whole-document regular expressions.
Isolated source-copy fixtures without `.git` supply `SMOKE_BUILD_SHA` explicitly;
a normal checkout always takes its identity from Git. Unversioned builds without
an explicit SHA fail rather than inventing a release identity.

## Implementation validation

Executed before opening the PR: production TypeScript/client/server build and
prerender; ESLint; 113 Node checks (including 34 monitoring cases and isolated
Notion/rich-MDX build integration); 154 existing desktop/mobile browser cases
with four fixture-only cases skipped in that run and passed by the isolated MDX
integration; healthy local production HTTP probes; and the new Chromium smoke
journey. Workflow YAML parsing and verification dependency/permission checks
also passed.

The environment returned truncated archives for pinned Chromium 156. Local
browser runs used temporary Chromium 153 through the existing executable-path
override and system FFmpeg; neither workaround is committed and CI retains its
pinned browser installation. A read-only live probe reached the domain but
`/deployment.json` returned HTTP 404, as expected before this feature is deployed;
this is not a passing live release verification. No production deployment was
triggered. The first merged deployment must establish the live verification result.

For lost/corrupt Notion publishing sources, use the
[Git-based disaster recovery runbook](NOTION-RECOVERY.md). Its monthly isolated
drill cannot modify production, push or deploy. Source restoration requires an
explicit operator apply followed by a reviewed PR and normal deployment checks.

For source recovery validation, `node --test scripts/recovery-build.test.mjs`
restores a damaged independent local Git clone and runs the production build.
The [recovery audit](NOTION-RECOVERY.md#follow-up-audit-and-local-change-protection-october-26-2026)
maps failure scenarios to tests and documents local-change refusal. This proof
never deploys; verify production separately after a reviewed recovery PR lands.
