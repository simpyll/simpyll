# Notion publishing health and incidents

The **Notion publishing health and incidents** workflow runs hourly at minute 37
(`37 * * * *`) and manually on **main**. It extends the former weekly metadata
audit; it does not replace the publisher. The publisher's nominal 15-minute cron
is unchanged. GitHub cron is best effort, not a 15-minute service guarantee.
Observed October 28 publisher executions were several hours apart.

The read job fetches main without persisted Git credentials, installs existing
locked dependencies, reads GitHub metadata and uses the existing Notion publisher
in read-only planning mode. Only this main-only job receives existing Notion
secrets. It never builds or writes generated content. Its two-day artifact contains
strictly validated operational enums, opaque SHA-256 keys/revision digests,
numeric timestamps and a workflow run number. No source ID, title, body, slug,
media URL or provider/compiler error is serialized.

The separate issue writer has `contents:read` and `issues:write`, receives no Notion
credentials and consumes only this run's artifact (maximum age one hour). Missing
or invalid evidence produces a system incident, never inferred missing articles.
An audit failure still fails the workflow after evidence upload and issue writing.
No PR event, `pull_request_target`, feature-branch publication or external service
is involved.

The existing six-hour **Production availability** workflow independently checks
the health workflow's active state and last successful heartbeat. Its separate
Notion-free watchdog shares this same issue writer, ledger and concurrency group.
It cannot hide behind a failed publisher or disabled health workflow. If all
GitHub Actions or both independent schedules stop, GitHub cannot run an alert;
inspect Actions notifications and manually dispatch after service recovery.

## Article revision and transfer evidence

Publication gates remain the original source discovered from `NOTION_PAGE_ID`,
exact `Published` status, not archived/trashed, required metadata, unique ownership,
conversion/media/content validation and the production build. Published Date is
metadata, **not a scheduling gate**; existing dates stay immutable. Notion's own
web-publish switch is not Simpyll's status gate.

The version-1 manifest gains optional `sourceRevision`: a canonical SHA-256 digest
of stable page identity, provider revision and allowlisted publishing properties.
Old manifests remain readable; the next ordinary successful publisher run adds
revision evidence without rewriting article bodies or changing identity/dates.
A technical source edit may now create a manifest-only revision commit; the next
unchanged synchronization is a no-op. Media signatures and unrelated properties
are excluded from this fingerprint.

A full dry plan compares the expected article and owned-media digests with the
fetched **remote main checkout**, its ownership manifest and source revision.
The incident's expected revision digest combines source evidence and planned
output digests, so body changes are detected even with unchanged source timestamps.
Local writes, a dry run, local commits or rejected pushes cannot prove transfer.
No new content is committed by this monitor. Old records without revision evidence
remain pending until normal publishing establishes it; no arbitrary main edits.

Complete query pagination is required before observing articles. Discovery/query
failure leaves prior article incidents unresolved and creates system evidence
instead. Conversion failures preserve known missing/outdated expectations. An
intact old output with matching provider fingerprint is **unknown** when the full
plan fails; it cannot close a pending incident. A complete inventory may retire an
expectation when status changes, archive/trash or intentional unpublishing removes
eligibility; its resolution explicitly says eligibility was withdrawn, not that
content transferred.

## Grace, durable state and lifecycle

`PUBLISHING_GRACE_HOURS` is a repository variable, default **6**, allowed **1–168**.
An article must remain pending for that long from its first complete observation.
Edits during an unresolved incident update the expected revision without resetting
the delay. Healthy observations reset a transient pending incident. Source/system
errors also require sustained observation for this grace, on top of the metadata
thresholds below. The watchdog treats a disabled monitor or no successful health
run within six hours as missing evidence, then applies the same grace. Its six-hour
cadence and GitHub schedule delays mean notification is not an exact deadline.

One operational issue beginning with `simpyll-publishing-ledger:v1` holds only
allowlisted opaque state, including first/last observation, expected revision,
category, occurrence and resolution. Do not edit/delete it. Clean checkouts do not
reset state. The JSON is bounded below GitHub's issue-body limit; capacity or
malformed state fails visibly for manual archival instead of dropping incidents.

After the threshold, one issue per opaque article/system key is created and
assigned to the verified individual repository owner `simpyll` (GitHub ID 8688524),
after checking assignment eligibility. A repository transfer requires an explicit
owner-policy review. Only owner/bot-authored issue markers are trusted. Listing
uses paginated issue API results rather than eventually indexed search.

Both workflows use `publishing-incident-writer`, with cancellation disabled for
writing. This serialization is required: GitHub issues have no atomic unique-key
constraint. Never run a second manual writer outside that concurrency contract.
State saves before incident creation. An ambiguous POST response is not retried;
the next serialized run recovers the marker from GitHub. Partial PATCH failures
fail the run and retry the same issue next time. Duplicate trusted markers fail
closed for manual reconciliation. No repetitive comments are posted. The incident
body refreshes on lifecycle/category/assignment changes or daily; exact last-check
state is retained in the ledger on each run.

Successful full remote revision verification closes a transfer incident. A new
failure after recovery gets a fresh grace and reopens the **same issue**, incrementing
its occurrence. A complete withdrawal of eligibility is separately explained.
Deployment/verification failures remain distinct system incidents; closing a
transfer incident does not claim website publication. A no-op publisher does not
redeploy a previously committed revision.

Fixed categories are `notion-access-query`, `eligibility-configuration`,
`conversion-content-media`, `build-budget`, `commit-push`, `deployment`,
`execution-stalled`, `monitor-evidence`, and `unknown`. Build/push categories use
allowlisted latest workflow stage evidence, not causal claims about every page;
post-import validation can also fail for reasons other than budgets. Raw errors
are never included. Missing/stalled/cancelled scheduling ultimately escalates
through stale success/schedule evidence; cancellation alone is not proof of failure.

## Owner notification and controlled acceptance

Assignment is verified independently of delivery. The owner must enable GitHub
notifications for **Participating and @mentions** (including assigned issues),
choose email and/or mobile push in notification settings, and ensure this repo is
not ignored. For broader system visibility, watch Actions failures and issue
activity. Do not change settings silently or assume self-authored assignments
send the same notifications as `github-actions[bot]`.

[Controlled issue #203](https://github.com/simpyll/simpyll/issues/203) used one
non-sensitive manual connector issue and this implementation's deterministic
state/render functions: assignment, reread with zero comments, simulated recovery,
recurrence on the same issue and final closure succeeded. It did **not** run the
unmerged automatic writer or validate real remote revision recovery. A focused
connected-inbox search found no matching email; bot-origin email/push delivery is
still unaccepted. Offline tests cover actual writer transport failures and state
semantics. Do not publish synthetic content or intentionally fail production.

After review/merge, run this workflow on main and verify its ledger/artifact and
permissions, then exercise a bounded controlled fixture through the trusted writer
under the same concurrency contract. Inspect bot assignment and actual owner
notification delivery. Verify the real article's ordinary publisher content SHA,
exact release deployment and live body/discovery, then a second unchanged sync.
Keep #199 open until these outcomes are recorded. #67's owner closure does not
establish those outcomes. See the dated audit for precise access blockers.

## Rollback

Revert workflow/script changes through a reviewed PR; disable only new incident
steps if immediate containment is needed. Preserve the opaque ledger and incident
issues so re-enabling does not reset grace/deduplication. Never delete legitimate
published MDX/media or roll main content back to remove the optional revision field.
Older publisher/recovery readers accept the optional field. No budget/gate rollback
is needed because no budgets or publication gates change.

## Evidence and thresholds

| Status | Meaning |
|---|---|
| Healthy | Recent scheduled sync job succeeded, and available deployment evidence is consistent. |
| Warning | Sync/schedule is over 6 hours old, an isolated failure remains, deployment is pending, or a workflow has been pending over an hour. The metadata report itself does not send a notification; the sustained incident writer above handles escalation. |
| Action Required | Success/schedule is over 24 hours old; at least three unrecovered sync failures span at least one hour; a deployment/verification failure remains over one hour; or a manifest commit remains undeployed over six hours. Audit exits 1. |
| Unknown | Missing history, missing successful Pages/verification evidence, incomplete jobs, malformed API data, network errors, permission errors or rate limits prevent verification. Audit exits 1; this is a verification failure, not proof of a publishing outage. |

The overall result prioritizes Action Required, then Unknown, then Warning.
Thresholds intentionally tolerate many missed 15-minute slots. They exceed the
publisher's 20-minute timeout and measured normal ~30-second no-change runs;
deployment gets one hour of initial grace for queues, build, verification and
propagation. An undeployed commit warns during that grace and escalates only
after six hours. A single missed scheduled run is never proof of an outage.

A successful **sync job**, including a successful no-op, counts even if the
subsequent reusable deployment failed. A recovered failure is historical, not
an actionable alert. Cancelled/superseded runs alone do not escalate. Manual
publisher runs may be read-only (the default); they are shown but do not reset
the scheduled-success clock. No new article per week is required.

The latest publisher stage evidence uses fixed step names to distinguish a
successful Notion read/conversion/MDX compile, failed post-import site validation,
failed commit/push, successful commit/push stage, and successful no-op/read-only
execution. Missing stage metadata stays explicit. A commit-stage success still
requires checking its content SHA: stage metadata is not article-level revision
evidence, and a no-op never proves that an intended article was eligible.

Sync timestamps come from job `completed_at`; execution timestamps come from
run `created_at`. Run checkout SHAs may predate a publisher's new commit. The
latest commit touching `.notion/published.json` is therefore reported separately
with its committer timestamp and SHA. This is manifest-change evidence, not proof
of which sync produced it; a manual manifest edit is possible. Public commit
metadata only is requested, never file contents. The last successful Pages SHA
comes from GitHub deployments for `github-pages` and an actual `success` status
in its history (including releases now marked inactive). A GitHub compare request
checks whether it includes the latest manifest commit. A Pages success alone is
not proof of public propagation: build/deploy/verify jobs and later successful
verification are inspected separately. See [production verification](PRODUCTION-VERIFICATION.md).

Queries inspect the latest 20 publisher runs, latest 20 standalone deployment
runs, one additional most-recent successful scheduled publisher run, latest
manifest commit and up to 20 Pages deployments (up to 100 statuses each). Jobs
are bounded at 100 per run, using the latest attempt. Partial job lists fail
closed. Failure counts describe this bounded sample, **not an exhaustive weekly
count**. Very busy histories can omit older failures or recovery evidence;
missing verification remains Unknown. There is no persistent state, exhaustive
historical audit, or SLA. Deleted history, disabled workflows, GitHub outages,
and schedules delayed/skipped/disabled for inactivity limit verification. The
audit itself can also be delayed/skipped; manual dispatch is the fallback.

## Notifications

The summary is produced on every completed audit, including API failures, without
publishing API payloads, job names, commit messages, inputs or article contents.
Confirmed actionable failures and Unknown verification failures fail this hourly
workflow. GitHub's native Actions notifications can surface that failure; no
email delivery is guaranteed. In your GitHub account **Settings → Notifications →
System → Actions**, enable email notifications and optionally failed workflows
only. Check the selected email address and repository subscription settings.
No email API, webhook or external notification service is introduced. The
sustained incident writer described above creates assigned GitHub issues; it
adds no healthy-run comments or per-sync notifications. A checkout/runner failure
can prevent a report; the independent availability watchdog checks monitor
freshness. #199 remains open for hosted lifecycle and notification acceptance.
#67 was owner-closed after #202 merged; that closure does not establish actual
article transfer/deployment/no-op recovery. Record unmet acceptance in #199/#89.

## Manual recovery

1. Open [Publish Notion blog](https://github.com/simpyll/simpyll/actions/workflows/notion-publish.yml)
   and the run links in the audit. Look at **sync**, not just the overall workflow
   conclusion: a red workflow can have a successful sync and failed deploy.
2. Find the last green sync job. The publisher's final message says `unchanged`
   for a successful no-op; skipped commit/deploy jobs are expected then. A
   failed sync is not a successful no-op. Manual runs marked read-only validate
   but cannot demonstrate that production synchronization wrote changes.
3. Inspect the failing job/step and existing sanitized publisher diagnostics.
   Check repository secret presence, Notion connection access, content validation,
   push conflicts and branch rules. Never print tokens, dump API responses, paste
   unpublished text, or enable shell tracing around secrets.
4. After correcting the cause, dispatch the publisher on **main**, first with
   **dry_run checked**. When validation succeeds, dispatch with **dry_run unchecked**
   to synchronize. Do not force-push or hand-edit the publisher manifest. See
   [Notion publishing](NOTION.md) for supported content and safe retry behavior.
5. For changed output, inspect the `content: synchronize published Notion articles`
   commit, its timestamp/SHA and owned file changes. No commit is expected for
   unchanged output. The run's original checkout SHA is not the new content SHA.
6. Inspect the publisher's reusable deploy/build/verify jobs or
   [Deploy Simpyll to GitHub Pages](https://github.com/simpyll/simpyll/actions/workflows/deploy.yml).
   After a content commit followed by deployment failure, rerun the failed
   deployment or manually deploy current main. A no-op publisher will not redeploy.
   Confirm the deployed SHA includes the content commit and public verification
   succeeds; allow queue/build/propagation time before declaring another outage.
7. Run the health workflow manually on main to verify recovery. If the failure was
   schedule staleness, a manual publisher does not reset that signal: wait for a
   scheduled sync to succeed and confirm the publisher schedule is enabled.
8. For DNS, HTTPS, missing routes or public availability, use
   [Issue #75's runbook](PRODUCTION-VERIFICATION.md), not this metadata audit.
   Consistent restoration of MDX, media, manifest and slug history belongs to
   [Issue #84](https://github.com/simpyll/simpyll/issues/84); this audit does not
   restore files or back up private Notion drafts.

## Development

`node --test scripts/publishing-health.test.mjs` uses synthetic metadata and an
injected clock/API client. It runs in the existing validation build job without
another build. Local live read-only execution is optional with `GITHUB_REPOSITORY`
and a securely supplied `GITHUB_TOKEN` granting contents/actions/deployments read:
`node scripts/publishing-health.mjs`. Do not put a token in a command, file or PR.

### Budget failure after import

In the publisher's **sync** job, distinguish the import step from **Validate updated site before committing**. A failure in the latter (including `BUDGET FAILED`) is a failed synchronization even if the import step succeeded; no content commit or downstream deploy should be reported. Inspect the named failing budget and asset report, then reproduce with an isolated synthetic article and the production build. Do not raise budgets or publish a test article to clear the error. Correct the build, merge the reviewed change, and allow the normal authorized schedule to retry; confirm the resulting content commit and exact-revision deploy, followed by an unchanged no-op run. If the push was rejected, start a fresh run against current main rather than force-pushing. If the content commit exists but deployment failed, use the deployment recovery steps above.

PR #193 separated metadata and route bodies, resolving shared-entry growth.
A long individual body can still exceed the deferred-chunk budget. The build
now extracts long compiled MDX string literals into static prose-data imports,
targeting 8 KB source groups once extracted prose exceeds 16 KB. Rendering and
escaping are unchanged; all data imports preload with that article and remain
included in route/page and individual asset budgets. This does not permit
unlimited article growth: a single huge literal, markup-heavy body, growing
metadata or total page weight can still fail. Do not exempt article chunks from
auditing. `node --test scripts/notion-growth.test.mjs` checks the two original
growth cases, reproduces the post-193 single-chunk failure with a larger synthetic
case, checks all corrected builds/no-op imports, and runs focused desktop/mobile
hydration/navigation checks in the isolated site. It requires installed Chromium.
