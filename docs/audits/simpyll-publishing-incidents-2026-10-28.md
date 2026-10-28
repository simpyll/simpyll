# Publishing recovery and incident acceptance — October 28, 2026

References: [#199](https://github.com/simpyll/simpyll/issues/199),
[#67](https://github.com/simpyll/simpyll/issues/67),
[roadmap #89](https://github.com/simpyll/simpyll/issues/89).
Audit base: `013c6f33b896e13a4a03403cb67bd5f9a307cf4d` (merged #202).
No changes to editorial content, gates, budgets or deployed feature branches.

## Recovery evidence

| Stage | Observed result |
| --- | --- |
| Source identity and eligibility | Connected Notion evidence matches the previously investigated article in the original manifest source. Published status, explicit slug and October 26 publication date are present. Complete connected-source rows contain four Published entries, versus three published manifest entries; the additional identity is the intended delayed article. Two Draft rows remain ineligible. Private source identifiers, title, body and route are omitted. |
| Publisher integration query | Last observed scheduled run [40650995495](https://github.com/simpyll/simpyll/actions/runs/40650995495) predates #202; prior conversion succeeded. Connected-source access is not proof that the workflow's integration token still has access. No post-merge publisher run was available. |
| Conversion / build | Prior run failed after import at 17,606 gzip bytes versus the unchanged 16,000-byte individual chunk limit. #202 corrected static prose-data loading. A build including the intended revision has not run after merge in available evidence. |
| Commit / push | The intended stable identity is absent from current main's ownership manifest and article files. No successful transfer or new content commit is established. |
| Deployment | [40680898943](https://github.com/simpyll/simpyll/actions/runs/40680898943) build, deploy and verify succeeded for exact merge SHA `013c6f33b896e13a4a03403cb67bd5f9a307cf4d`. Direct production `deployment.json` reports this SHA and build ID. This is a code deployment, not the delayed article's deployment. |
| Live revision | Intended route returns HTTP 404; RSS and sitemap return HTTP 200 without the intended route. The article remains unpublished on the site at this inspection. |
| Unchanged synchronization | No post-recovery production no-op is available. Isolated normal import then unchanged reimport passes, including all growth cases. |

The connected page response does not independently expose every archive/integration
flag; the trusted publisher must confirm those through its normal API gates before
publication. No editorial status/date was changed. Published Date is not a timing
gate in this repository. Source/slug ownership evidence was compared privately;
there is no second unexpected eligible article in the complete connected inventory.

#67 was closed by the owner after #202 merged. Its closed state is preserved; its
unchecked live acceptance remains explicitly recorded here and in #199/#89.
Root cause of the prior failed transfer is verified. Whether the corrected
production publisher can now transfer the intended revision remains unverified
until the first normal post-merge publishing execution.

## Implementation

Reuse `synchronize`, discovery/pagination, metadata, revision/status rechecks,
conversion, media validation, ownership manifest and the existing health evaluator.
An optional backward-compatible manifest fingerprint supplies source evidence;
expected-output hashes and fetched-main bytes establish transfer. The independent
hourly health workflow records strictly sanitized observations. Its separate,
Notion-free writer persists grace and recurrence in an opaque GitHub issue ledger.
One issue per article/system key reopens after a new post-recovery grace. A
six-hour default grace is configurable from one through 168 hours; active edits
cannot reset the clock. Daily body refreshes replace repetitive comments.

A watchdog in the existing six-hour production-availability workflow checks that
the monitor remains active/recent. Both use the same serialized issue writer,
with cancellation disabled. No competing workflow or service is added. Read and
write permissions, bounded API access, trusted marker authors, fail-closed partial
queries and lost-response recovery are documented in the runbook. Public issue
bodies cannot take arbitrary source/error strings.

Transfer recovery requires full remote revision/output verification. Eligibility
withdrawal is a separate explicit outcome. Deployment problems remain distinct
system incidents and never imply the article is live. Old manifests need one
normal publisher revision-evidence commit before that evidence can be verified.

## Validation

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 481 locked packages installed. |
| `npm run build` | Passed production TypeScript/client/server/prerender, content/image/discovery/RSS/sitemap, budgets and SEO audit; seven advisory existing editorial warnings, zero SEO errors. |
| `npm run lint` | Passed. |
| `npm run test:unit` | Passed all 399 tests. |
| `npm run test:notion` | Passed all 81 tests. |
| `node --test scripts/notion/incidents.test.mjs` | Passed all 16 deterministic incident tests. |
| `node --test scripts/images/*.test.mjs scripts/rss.test.mjs scripts/performance/*.test.mjs scripts/prerender.test.mjs scripts/article-toc.test.mjs scripts/publishing-health.test.mjs` | Passed 47 focused checks. |
| `node --test scripts/notion-growth.test.mjs` | All 50/65/110-paragraph build, full-body/prerender, budgets and no-op assertions passed. Overall command failed only at desktop/mobile Chromium launch: missing installed executable. |
| `npx playwright install chromium` | Unavailable environment: downloaded archive was corrupt/truncated; installer exhausted its retries. No browser tests claimed passed. |
| `node --test scripts/ci-workflows.test.mjs` | Passed all four workflow contracts. |
| `git diff --check` | Passed. |

Growth measurements (gzip bytes, existing unchanged limits):

| Paragraphs | Shared JS | Article route JS | Largest deferred JS |
| --- | ---: | ---: | ---: |
| 50 | 136,029 | 145,856 | 15,255 |
| 65 | 136,024 | 148,526 | 15,255 |
| 110 | 136,051 | 156,777 | 15,255 |

The isolated 110-paragraph control without prose-data extraction reproduces a
20,722-byte individual deferred chunk violation. No fixture is published.
Hosted #202 production verification successfully installed Chromium and passed its
HTTP/hydration smoke for existing deployed routes. It does **not** clear the
isolated desktop/mobile growth matrix. Fast PR checks do not run browsers or
build fixtures.

During development, strict pagination exposed synthetic API fixtures that omitted
`has_more`; their mock responses were corrected without relaxing validation.
Revision-evidence changes required updating the technical-edit test to preserve
body/date assertions while expecting a manifest-only fingerprint commit. One
serial-suite attempt observed global temporary-preview-directory contention;
a fresh serial run passed without modifying that unrelated cleanup test. No
checks, budgets, accessibility rules or expensive fixture stages were disabled.

Deterministic incident tests exercise missing/new and outdated edits (including
same provider timestamp), remote versus local failed-push isolation, clean copies,
unchanged sync, draft/archive/trash/unpublish/future dates, transient/sustained
observation, query access/incomplete pagination, conversion/configuration, build
and push categories, deployment-only failure, stalled/disabled/missing monitoring,
unknown evidence, strict public schema, trusted marker authors, pagination,
workflow serialization contract, ambiguous issue/ledger POSTs, PATCH failure,
deduplication, recovery and recurrence. Concurrency uniqueness relies on the
shared GitHub Actions concurrency contract, not an API uniqueness primitive.

## Controlled incident and notification

[Issue #203](https://github.com/simpyll/simpyll/issues/203) is the only live controlled
incident. It is clearly marked as a manual connector transport test, with simulated
operational times/revisions and a separate test marker. It used state/render
functions from this change, not a production article. Creation and actual
assignment to verified owner `simpyll` succeeded. Reread showed one issue and zero
comments. Simulated recovery closed it, simulated recurrence reopened the same
issue, and final cleanup closed it. No duplicate issue, source publication or
production failure was induced.

This does not constitute a hosted automation test, actual remote-revision
recovery, or bot-origin notification acceptance. Two focused connected-inbox
searches returned no matching GitHub email. GitHub notification/watch preferences
and mobile push cannot be read through available access; connector writes are
owner-authored, so this is not representative proof of bot assignment delivery.
Required participating/assignment settings are documented; owner delivery remains
an explicit acceptance blocker.

## Access blockers and exact remaining steps

The GitHub connector exposes no workflow-dispatch operation. The available GitHub
browser is signed out, so no trusted publisher/manual full CI dispatch is available.
Actions secrets are not supplied locally; they were not extracted, replaced or
exposed. The implementation must be reviewed/merged before its actual main-only
monitor can run. Keep the PR draft and #199 open until acceptance is resolved.

1. Obtain the isolated desktop/mobile growth result at the proposed revision in
   the existing full manual fixture job, or a working local Chromium environment.
   Review fast final-head checks separately.
2. Through authorized main Actions access, dry-run then ordinarily run/observe the
   publisher, confirming current integration/eligibility and only the intended
   additional article. Record content commit/push SHA and expected revision.
3. Verify deployment containing that exact content SHA and the intended complete
   live revision/canonical/RSS/sitemap. Then verify an unchanged sync without
   content commit or deployment. A green code deploy/no-op is insufficient.
4. After monitor merge, dispatch hourly health on main; inspect the allowlisted
   artifact, durable ledger, actual issue-write permissions and watchdog result.
   Run a bounded non-sensitive controlled fixture through the trusted writer under
   its serialization contract; confirm bot issue assignment, repeated/no-noise
   behavior, verified-revision recovery, deployment distinction and recurrence.
5. Confirm actual owner email/push route, then record acceptance in #199/#89.
   Do not infer delivery from assignment or close recovery based on merged code.

Keep framework/functionality first. Content rewriting, editorial cleanup/backfill
and asset-rights work stay near the end. #82's final project-wide acceptance stays
last; this scoped work does not reactivate deferred clinical/accessibility/features.

Rollback: revert code/workflow changes through one reviewed PR while preserving
legitimate published content, optional revision evidence, opaque ledger and incident
history. If necessary disable only new incident steps, never delete content or
reset durable state. See [runbook](../PUBLISHING-HEALTH.md).
