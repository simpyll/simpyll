# Weekly Notion publishing health

The **Weekly Notion publishing audit** runs Sundays at **09:37 UTC**
(`37 9 * * 0`) and supports **Actions → Weekly Notion publishing audit → Run
workflow → main**. Open the run's Summary for its native job summary. It installs
no dependencies, reads only GitHub metadata, and does not build, publish, download
artifacts, read Notion, probe pages, or require a new secret. Its concurrency group
is independent of Pages and the publisher. The existing `*/15 * * * *` publisher
schedule and production availability workflow are unchanged.

## Evidence and thresholds

| Status | Meaning |
|---|---|
| Healthy | Recent scheduled sync job succeeded, and available deployment evidence is consistent. |
| Warning | Sync/schedule is over 6 hours old, an isolated failure remains, deployment is pending, or a workflow has been pending over an hour. No failure notification. |
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
Confirmed actionable failures and Unknown verification failures fail this weekly
workflow. GitHub's native Actions notifications can surface that failure; no
email delivery is guaranteed. In your GitHub account **Settings → Notifications →
System → Actions**, enable email notifications and optionally failed workflows
only. Check the selected email address and repository subscription settings.
No email API, webhook, weekly issue, healthy-run comment or per-sync alert is
introduced. Existing publisher/deployment notification settings remain yours to
control. A checkout/runner failure before the script starts may prevent a report;
inspect the job logs in that case.

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
7. Run the weekly audit manually on main to verify recovery. If the failure was
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
