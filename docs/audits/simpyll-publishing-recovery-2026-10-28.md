# Publishing recovery acceptance — October 28, 2026

Refs #67, #89 and #199. Base: `4d0265aa3a7f3da9ced34a0c8e3cb1f3a363008b`.
**Draft acceptance: recovery is not yet live. Do not close #67.**

## Diagnosis and privacy boundary

Connected Notion evidence identifies one eligible article absent from the
publisher manifest, matching the route generated in the failed publisher build.
Its exact title, source IDs, private link and body are intentionally omitted
here and from public issue/PR updates. Its publication date is October 26;
Status is exactly Published, and its parent data source matches the existing
manifest source. The publisher successfully discovers, queries, converts and
validates MDX for the waiting article. This also establishes integration access
at those attempts; it is not a claim about later credential availability.
No editorial properties were changed, no publication gates were bypassed, and
no synthetic content was published. Owner confirmation is needed only if a
different article was intended.

The actual gate is exact Status = Published, excluding archived/trashed pages.
Notion web publishing and a separate toggle are not gates. The date is metadata,
not a future-publication scheduler. Stable identities, valid metadata, collision
checks, revision rechecks, content/media validation and ownership checks still
apply. Successful conversion at the inspected runs rules out those stages as
the first failing stage for this attempt; it does not prove the whole sync.

PR #193 merged at `098a19b4ce6ce179c6b6d27f64be0949b29f3b43` and already
separated discovery metadata from route-specific article bodies. Its original
synthetic cases reproduced shared-entry budget growth and passed after the fix.
Reimplementing that work is unnecessary. The remaining failure is an
**individual deferred article chunk**: 17,606 gzip bytes exceeds the existing
16,000-byte limit. In the same failed run, shared JS is 135,979 bytes and the
intended article route is 153,641 bytes; those are within their existing limits.

## Workflow and release evidence

| Evidence | Result |
|---|---|
| [Latest successful sync, 40436025915](https://github.com/simpyll/simpyll/actions/runs/40436025915) | October 27, 02:01 UTC; conversion succeeds, build/commit/deploy skipped: successful unchanged sync, not transfer of the waiting article. |
| Subsequent publisher failures | 40468954912, 40513347386, 40564629978, 40597239668, 40617382510, 40650995495. Three occur after #193 merged. |
| [Latest failure, 40650995495](https://github.com/simpyll/simpyll/actions/runs/40650995495) | Conversion succeeds; post-import build reaches prerender and asset audit, then deferred chunk fails. Commit and deploy skipped. No transfer. |
| [Post-193 failure, 40597239668](https://github.com/simpyll/simpyll/actions/runs/40597239668) | Same first missing stage: post-import validation fails; commit/deploy skipped. |
| [Latest manifest/content commit, 9e606dda059d](https://github.com/simpyll/simpyll/commit/9e606dda059d3e9cf4095dc2df07e84ada46ab4c) | October 24, 23:42:51 UTC. Still the last publisher content commit on inspected main. |
| [Content-changing run, 40143717775](https://github.com/simpyll/simpyll/actions/runs/40143717775) | Sync, validation and commit/push succeed; reusable deployment build job fails afterward. Overall red does not mean the content failed to transfer. |
| [Later successful deployment, 40150944600](https://github.com/simpyll/simpyll/actions/runs/40150944600) | Revision `3fe55d5ab08d924f5f71a6f8b3315bc67baedffa` contains that content commit (Git ancestry checked). |
| [Current main deployment, 40675072912](https://github.com/simpyll/simpyll/actions/runs/40675072912) | Build, deploy, HTTP verification and production Chromium hydration jobs all succeed for `4d0265aa3a7f3da9ced34a0c8e3cb1f3a363008b`. |

Direct production HTTP checks on the inspection date: `deployment.json` is 200
and matches that current main SHA/build ID; the intended article is 404; RSS and
sitemap are 200 and omit its route. Existing production is deployed, but the
waiting article is neither committed nor live. No exact intended-revision live
verification is claimed. The previously green full scheduled validation
40511025299 predates #193 and cannot certify this implementation.

All 386 available runs were inspected for workflow type; no publishing-health
or monthly recovery run was found in that available history. Their configured
workflows and synthetic tests exist; live alert/recovery acceptance is not
inferred from their presence. The six failed publisher executions exceed the
existing sustained-failure policy (three spanning at least one hour). The cron
is still every 15 minutes, serialized without cancelling active syncs, with a
20-minute timeout. Observed executions have multi-hour gaps, so no 15-minute
delivery promise is justified. None of the inspected six failures was a cancelled
execution or credential/query failure.

## Changes

- A build-only Vite plugin extracts long string literals from the compiled MDX
  render body into statically imported prose-data modules. Groups target 8 KB
  serialized source; short articles retain their original structure. Module
  names use repository-relative identity, not machine-specific checkout paths.
- Text stays literal and escaped. Metadata, heading registry, reading time,
  citations, generated MDX/manifest ownership, URLs, dates and redirects are
  unchanged. Existing route preload traversal loads all imports before SSR and
  direct hydration. No new runtime fetch, dependency, backend or paid service.
- Every data module and render chunk remains audited. Page JS includes the
  entire static import graph. No budget increase, content omission or error
  suppression. Very large individual literals, markup-heavy articles and total
  page/metadata growth remain bounded by the existing checks.
- Health summaries report fixed, sanitized stage evidence: conversion versus
  site validation, commit/push, and no-op/read-only. Article-level revision
  reconciliation and automatic incident issues remain #199's implementation.
- The existing growth fixture now reproduces the remaining single-chunk failure,
  verifies three corrected builds, checks unchanged imports, and runs focused
  desktop/mobile article hydration, reload, journal navigation and history.
  The clean-clone recovery fixture also copies the Vite config under test.
- Runbooks distinguish pre-commit failure from committed-but-not-deployed
  content and remove the old instruction to publish a synthetic acceptance post.

## Measurements and validation

Single local builds at the current dependency baseline; bytes are gzip estimates,
not network measurements. Budgets unchanged: shared JS 162,000; deferred chunk
16,000; route/page JS 180,000.

| Synthetic Notion case | Shared JS | Article route JS | Largest deferred JS, entire site | Result |
|---|---:|---:|---:|---|
| 50 varied paragraphs | 136,029 | 145,856 | 15,255 | All budgets pass |
| 65 varied paragraphs | 136,024 | 148,526 | 15,255 | All budgets pass |
| 110 paragraphs, extraction disabled | — | — | 20,722 | Expected deferred-chunk failure |
| 110 paragraphs, extraction enabled | 136,051 | 156,777 | 15,255 | All budgets pass |

The two original cases were retained. Synthetic source stays in a temporary
checkout; full body/last paragraph must appear in prerendered HTML, body marker
must not appear in shared entry JS, and each second import must report unchanged.
The new unit test also compares actual React static HTML before/after extraction
byte-for-byte, including escaping, Unicode, ordering and literal code-like text.

Commands and observed outcomes:

- `npm ci`: pass, 481 packages installed from the existing lockfile.
- `npm run build`: pass, including TypeScript, client/server, prerender,
  images/search/RSS/sitemap, unchanged asset budgets and SEO (0 errors,
  7 existing editorial warnings).
- `npm run lint`: pass.
- `npm run test:unit`: 383 pass.
- `npm run test:notion`: 65 pass, including ownership, private/public gates,
  unsupported content, recovery, pagination and fail-closed behavior.
- `node --test scripts/article-text-chunks.test.mjs scripts/publishing-health.test.mjs`:
  19 pass; expanded React-output assertion also passes.
- `node --test scripts/images/*.test.mjs scripts/rss.test.mjs scripts/performance/*.test.mjs scripts/publishing-health.test.mjs scripts/ci-workflows.test.mjs scripts/prerender.test.mjs scripts/remark-heading-ids.test.mjs scripts/article-toc.test.mjs`:
  55 pass.
- `node --test scripts/recovery-build.test.mjs`: pass; a clean local clone
  restores damaged committed owned content/manifest, preserves manual content,
  builds and reports no further recovery writes.
- `node --test scripts/notion-growth.test.mjs`: all four build stages and
  three no-op assertions pass; the combined fixture exits nonzero at the new
  browser stage because Chromium is unavailable. Neither browser assertion ran.
- `npx playwright install chromium`: fails downloading a valid browser archive.
  `GROWTH_FIXTURE=1 npm run test:e2e:built -- article-growth.spec.ts --project=desktop-chromium --project=mobile-chromium --workers=2`:
  both projects stop at launch due to missing executable. This is environment
  failure, not passing browser evidence or a demonstrated application regression.

During fixture development, its negative baseline first failed TypeScript because
removing the plugin left an unused import. The fixture now removes both the
invocation and binding; the baseline reaches the asset audit and fails for the
intended 20,722-byte chunk. No production checks were weakened.

## Required acceptance and ownership

1. Inspect fast PR checks at the final head. Run the existing manual validation
   at that head and inspect the growth fixture's desktop/mobile browser results
   and relevant full rendering/navigation regression. Fast PR CI skips browsers
   and real-build fixtures; it is not a substitute.
2. Review and merge the correction before production publishing. Do not deploy
   a feature branch or manually push generated content to main.
3. Inspect current eligible scope in Notion, then run/observe the trusted main
   publisher. Dry-run validates conversion only; a real changed run must pass the
   complete build, push a legitimate content commit, and invoke deployment for
   that exact new SHA. Unexpected extra content requires an editorial decision.
4. Verify the intended article revision in GitHub independently of the Pages
   release; check actual live body, canonical identity, RSS and sitemap.
5. Observe a subsequent unchanged main sync: no content commit, no deployment.
   If a content commit exists but deploy failed, rerun deployment, not a no-op
   sync. Rerun health after recovery and wait for a scheduled success to reset
   schedule/success staleness.
6. #199 owns eligible-revision incident detection, durable deduplication,
   automatic issue creation/assignment, independent monitoring and verified
   owner notification delivery. Existing health thresholds/native Actions
   signals are not that implementation. Keep #67 open for its live recovery
   and delegated failure-visibility acceptance; filing #199 alone completes none.

The GitHub connector has no workflow-dispatch operation and cannot expose Actions
secrets locally. Its workflow-specific collection URLs were rejected; the
repository-wide runs collection and per-run jobs/logs supplied the audit evidence.
The available browser is signed out and has no dispatch control. No workflow
dispatch, secret modification, production push/deploy or deliberate live failure
was performed. Even with dispatch access, this correction must merge first.
There was no overlapping #67 PR; only the separate #82 draft was open. #82's
project-wide browser/visual acceptance remains the last stabilization task;
these focused publishing checks do not move it forward.

## Rollback

Revert this implementation through a reviewed PR, preserving legitimate later
publisher content commits, owned media, manifest, immutable identities, dates,
slugs and redirect history. Never reset main to the audit baseline. Removing the
chunk correction may restore the article budget failure, so validate an isolated
growth import and track that consequence before retrying. For actual content
damage use the existing recovery dry-run, inspect its ownership plan, then apply
only the authorized snapshot; reconcile Notion before resuming sync.
