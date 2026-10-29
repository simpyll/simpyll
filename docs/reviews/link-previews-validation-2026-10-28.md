# Internal-link preview validation — October 28, 2026

Implementation: PR #215, addressing #86. Implementation head `98e51ed8844ef6d033517d4a345f793e6ab4bbd5`, tree `5688be8bb531fa196f5e49468e3cf50c86db5d99`, based on main `38a5e78ed518c254fe9722a047d6832f62a3a928`. The local tested tree matched that remote tree. This record adds documentation only.

## Scope and public data

Read #86, roadmap #89, AGENTS.md, the MDX anchor renderer, article metadata/identity/publication registry, project detail eligibility, aliases, routing and prerendering before implementation. Main already included sharing/social cards; draft lightbox #213 was inspected and was not assumed shipped. No content changes, tag backfill, series assignments, publishing changes, unrelated priorities, deployment or handoff acceptance are included.

The public preview projection permits only title, excerpt, content type and an optional existing public project cover. Articles currently have no thumbnail metadata contract and remain text-only. Draft/unpublished/withdrawn/test/noindex destinations are omitted. Tests include a stale withdrawn owned file containing malformed private content: generation must not read or emit it. Source identities, paths, bodies and publishing ledgers are not serialized into preview records. Existing publication validation remains in force.

See [maintenance and behavior](../link-previews.md).

## Deterministic and production checks

- Production build, TypeScript, prerendering, existing asset budgets and SEO audit passed without budget increases. Preview CSS is deferred until an eligible link is encountered. SEO audit: 26 pages, 25 indexable pages, zero errors, nine existing editorial warnings; no content was rewritten to suppress warnings.
- Lint and diff whitespace checks passed.
- Unit tier: 411 passed, zero failures/skips. Built-output tier: 147 passed, zero failures/skips. SEO regression tier: 25 passed, zero failures/skips.
- Focused final metadata/URL plus existing internal-link tests: 12 passed, zero failures/skips. Four preview-specific tests cover publication exclusions, optional thumbnails, a generated public allowlist, a synthetic withdrawn/draft fixture, canonical/alias resolution, queries/fragments, encoded queries, base paths, unsupported URLs and missing destinations.
- Hosted [Validate Simpyll 40776439767](https://github.com/simpyll/simpyll/actions/runs/40776439767) completed successfully. Inspected build job `123126877007`, aggregate `validate`, job steps and logs. Actual synthetic checkout `16230f94e3e71fd1534ab027fc58c30877a8201a` merges the implementation head into the stated main. Hosted unit 411, built-output 147 and SEO 25 pass; build/lint, license inventory, dependency/publishing contracts, clinical/workflow checks and high/critical audit pass. Audit reported zero vulnerabilities.
- Hosted browser, fixture and advisory performance jobs were skipped by PR policy. Asset budgets run inside build; a skipped advisory performance job is not a Lighthouse result. Fast green is not browser acceptance.

## Browser and visual checks

Final focused command:

```sh
MOZ_DISABLE_CONTENT_SANDBOX=1 PLAYWRIGHT_PREVIEW_PORT=4175 \
  PLAYWRIGHT_HTML_OUTPUT_DIR=artifacts/preview-verified/report \
  npx playwright test link-previews \
  --project=desktop-firefox --project=desktop-webkit --project=mobile-webkit \
  --workers=1 --output=artifacts/preview-verified/results
```

Result: **23 passed, zero failed, four skipped**, 1.3 minutes. The four exclusions are touch in the two desktop projects and mouse hover/native mouse click cases in mobile WebKit. Corresponding real input modes ran in the appropriate projects; this does not establish Chromium acceptance.

Native browser interactions cover delayed focus/hover, pointer transit into the panel, leaving/blur, rapid transitions, Escape suppression without moving focus, Tab/Shift+Tab, unchanged accessible names and descriptions, visible focus, noninteractive tooltip content, Enter and query/hash preservation, ordinary/right/modifier/middle clicks, real emulated one-tap touch, unsupported/missing destinations, scrolling/offscreen cleanup, pending timers, route changes, reload hydration and no-JavaScript fallback. Browser tests inject synthetic contextual anchors into a hydrated production article using real public metadata; they are not end-to-end publishing/editorial approval fixtures or proof of private-data exclusion by themselves. The separate generation tests establish the public projection boundary.

Both-theme preview axe scans passed. Screenshots were visually inspected for article and project previews, light/dark themes, desktop/mobile and edge placement at 320 CSS pixels with 200% root text size. Text wrapped within the panel; long narrow content remained scrollable and the source focus indicator remained visible. The fixture deliberately positions source links at an edge. This is reflow/text-size evidence, not a real browser-zoom or physical-device test. Screenshot files were not retained after the local runtime reset and are not attached to this PR; repeat captures are required for durable review evidence.

A supplemental run reused the existing WebKit accessibility project and ran existing theme/motion specs under desktop/mobile WebKit via a temporary local configuration: **103 passed, six timed out**. This was not a clean full-matrix acceptance run. Four route/axe cases timed out while local validation was busy; focused final rechecks of all four routes in both themes passed **eight of eight**, using the unchanged accessibility rules and original timeouts. The other two timeouts were the native theme-reveal animation case, normally a Chromium journey, under supplemental WebKit execution. They do not establish native reveal acceptance and were not excluded from or relaxed in the repository tests. The temporary configuration was not committed.

Final accessibility recheck:

```sh
PLAYWRIGHT_PREVIEW_PORT=4174 \
  npx playwright test accessibility.spec.ts --project=accessibility-webkit \
  --grep 'hydrated route /blog/(starting-over-without-starting-from-zero|the-art-of-reading-code|why-simpyll)|hydrated route /accessibility-missing-page' \
  --workers=1 --output=artifacts/a11y-recheck/results
```

## Remaining acceptance — keep draft

Pinned Chromium headless shell 1248 was absent. `npx playwright install chromium` returned an invalid/truncated archive and failed. An affected Chromium run with `--max-failures=1` failed at launch before assertions; remaining jobs did not run. No Chromium or complete browser-matrix acceptance is claimed. Full existing required browser validation, supported-engine native theme-reveal checks and durable screenshot captures remain outstanding.

Manual screen-reader use, actual browser zoom/pinch zoom, physical-device touch and native OS context-menu inspection were not completed. Automated right-click confirms the URL stays unchanged and the implementation intercepts no click/context-menu events; that is not manual inspection of the browser's native menu. Resolver base paths are unit-covered; a complete subpath deployment was not exercised. Optional project thumbnails are metadata-tested; the current text-only examples do not certify every image-loading case. This feature's delayed first stylesheet load is local and cached; preview metadata never requires per-hover requests.

Do not infer Cortex handoff acceptance, final #82 acceptance, deployment readiness or permission to merge from these focused results.
