# #199 operational audit and recovery correction — October 28, 2026

Keep #199 open. #204 is merged, not a draft awaiting implementation. This follow-up
corrects demonstrated incident recovery defects and updates operational evidence;
it does not establish full hosted lifecycle or notification acceptance.

## Revision and evidence reconciliation

Inspected main: `95b45685d8631bf461830cae25e98ee13bedf35e`. No open PRs at
initial inspection. #204 head was `50845a2f63ec6213de34ffb2bb43a86301fedc8e`,
merged as `49f7f8a8ce202583d51a92aebd1c14395955871f` on October 28 at 12:44 UTC.
Its original audit is historical. Read AGENTS.md, #199 and comments (none), #89,
#67 and comments, PUBLISHING-HEALTH.md, the incident audit, and current publisher,
health and availability workflows. #133 remains owner-closed; #210 engineering
is merged. Its full browser/visual and required-check acceptance remains in #89.
#82 remains the last project-wide gate at the eventual stabilized revision.

| Evidence | Actual result |
|---|---|
| [Publisher 40706393159](https://github.com/simpyll/simpyll/actions/runs/40706393159) | Scheduled run starts at `49f7f8a8ce20`; sync job 122879561184 succeeds, builds/validates, commits and pushes `cf23007bbcb5e91b6ea7c0cb9da02b0cf5ce0ee0`. Overall failure is later browser verification, not transfer failure. |
| Same run, build/deploy/verify | Build and Pages deployment succeed. Production-manifest artifact 12824975326 actually contains content SHA `cf23007bbcb5`, build ID 40706393159, built 14:32:58 UTC. HTTP verification observes that SHA. Browser job 122881980025 has one pass/one failure: missing LDL input selector times out. This historical failure is not an article transfer failure. |
| [Deployment 40730578683](https://github.com/simpyll/simpyll/actions/runs/40730578683) | Build/deploy/verify all succeed at `95b45685d863`. Downloaded production-manifest artifact 12834703478 contains that SHA, build ID 40730578683, built 16:55:21 UTC. It includes the content commit by Git ancestry. Later production HTTP and two Chromium smoke checks pass; isolated growth browsers remain distinct. |
| Live recovery | Direct HTTP 200 for release identity, intended article, RSS and sitemap. Release identity is `95b45685d863`. Canonical matches. All 369 nonempty committed MDX paragraph/code/heading/list blocks appear in live HTML after excluding aria-hidden decorative icons; owned MDX digest matches manifest (`7d971a805940d9bb701521a232ddf19583fcc645a41a5f24e94b68815d2c4b1b`). RSS/sitemap contain the route. No private source identity or article text is reproduced here. |
| Source read | Connected original Notion row remains Published, dated October 26; last edited October 27 03:41:03 UTC. Stable identity privately matches the remote manifest entry, which now has sourceRevision. The connector's flattened page representation is not a raw publisher plan: a fresh expected-output reconciliation against current Notion still requires the health workflow. No source data changed. |
| [Availability 40694154938](https://github.com/simpyll/simpyll/actions/runs/40694154938) | Scheduled watchdog job 122836351371 executes at merged #204 main with actual Actions:read, Contents:read, Issues:write. Grace environment is 6 hours. It creates bot ledger [#205](https://github.com/simpyll/simpyll/issues/205), records monitor-evidence, then intentionally exits 1 because heartbeat evidence is missing. HTTP availability job passes. This is successful alert-state writing and a failed health outcome, not an API permission failure. |
| Authorized retry, same availability run | Rerun operation succeeds. Attempt 2 watchdog job 122995213252 checks out actual `95b45685d863` despite the run's original head metadata `49f7f8a8ce20`. Same permissions and six-hour grace; state reconciliation succeeds and exits 1 for missing heartbeat. Ledger #205 retains first=1793193100123 and generation=1, updates checked=1793209660481, due=false. No second ledger or incident was created. This verifies hosted retry persistence before the grace threshold, not incident creation/recovery/recurrence. |
| Health workflow | Browser Actions page explicitly shows zero runs. No health artifact, eligible-revision hosted reconciliation or full bot article incident lifecycle exists in inspected history. |

The old missing/404 claims in #199/#89 are superseded by the recovery evidence
above. A successful live release does not prove a subsequent unchanged sync.
No later publisher run was present in the inspected history. Do not rerun ordinary
publishing blindly: main now includes #208's tag normalizer and a run could perform
the deferred backfill, outside this task's no-tag-migration constraint. Use a trusted
read-only plan first; resolve tag/backfill scope in #200 before a potentially
content-changing run. No synthetic articles, eligibility changes, article edits,
Notion writes, feature-branch deployments, protection changes or bypasses occurred.

## Demonstrated defects and focused correction

Two added tests fail against original main and pass after the correction:

1. A complete health inventory omitted the independent watchdog key. The generic
   absence handler resolved it and reset its sustained-failure grace, even without
   successful heartbeat evidence. Watchdog state now requires its explicit verified
   observation, preserving first observation across interleaved healthy inventories.
2. Complete Notion inventory with unavailable GitHub metadata resolved a prior
   deployment incident merely because it was absent from the partial health report.
   Known health-system checks now carry explicit missing/unknown/verified evidence.
   Metadata failure preserves prior deployment/system incidents. Verified recovery
   resolves only the corresponding key; article transfer remains separate.

Also corrected an uncovered path: stale or wrong-run artifacts previously threw
outside the writer's fallback, suppressing the durable failure observation. One
validated boundary now turns missing, malformed, stale, future-skewed or wrong-run
evidence into sanitized system evidence with no inferred article failures. Invalid
run configuration still fails closed. Existing schema/ledger identity and markers
remain compatible; state is not reset. No workflow privileges or schedules change.

Existing deterministic coverage was rerun for new articles/edits, stable identity,
expected output differences with stable timestamps, failed pushes, publication
withdrawal, transient/sustained grace, revision churn, durable markers/pagination,
ambiguous POST/PATCH failures, trusted actors, recurrence and safe public output.
The shared writer concurrency remains `publishing-incident-writer` with cancellation
disabled. Hosted independent read-job permissions remain unexecuted because health
has no runs; YAML contracts are not described as hosted proof.

## Checks and limitations

- `npm ci`: pass, 481 packages. Initial clean checkout lacked ignored
  `src/generated`; creating that output directory allowed normal generation. No
  tracked source change was needed for that setup failure.
- `npm run test:unit`: 407 pass, zero failures/skips.
- `npm run test:notion`: 84 pass, zero failures/skips.
- `npm run build`: pass, unchanged budgets and zero SEO errors; existing editorial
  advisories remain. `npm run test:built`: 144 pass, zero failures/skips.
- `npm run lint`: pass.
- Focused incidents/health/workflow command: 43 pass, zero failures/skips.
- `node --test scripts/notion-growth.test.mjs`: all 50/65/110-paragraph builds,
  budgets, complete rendering and no-op assertions pass. Largest corrected deferred
  chunks are 15,253 / 15,255 / 15,253 bytes. The unchunked control reproduces a
  20,718-byte failure against the unchanged 16,000-byte limit. Both desktop/mobile
  browser cases fail before assertions because pinned Chromium headless shell 1248
  is absent. Command exits 1 after 185 seconds; no download retry or test weakening.
  Exact final published-head checks are recorded in the PR and issue update.
- `git diff --check`: pass. Generated sitemap output was excluded from this PR.

## Access and remaining owner actions

Tool discovery confirms rerun-job capability (used successfully), but no workflow
dispatch or notification/settings read/write operation. GitHub fetch rejects
workflow-definition-specific runs and assignee endpoints with HTTP 400
`INVALID_ARGUMENT`; repository-wide run listing/jobs/logs/artifacts work. The
GitHub Actions browser remains signed out with no Run workflow control. No login,
provider setting or notification preference was changed. Current configured
repository variable cannot be read through this access; actual watchdog execution
shows the effective six-hour value. No Actions Notion secrets are available locally.

Two current connected-inbox searches (GitHub sender/repository, incident terms and
controlled issue numbers, including all mail folders) return zero message IDs.
That does not prove notifications are disabled or that another selected email/push
route failed. Owner policy remains verified individual `simpyll`, ID 8688524;
previous #203 verifies connector assignment, while bot incident assignment and
actual delivery remain unaccepted. #205 is a ledger, not an assigned incident.

After review/merge of this correction, the owner must:

1. Run existing **Notion publishing health and incidents** on main through signed-in
   Actions (or observe its schedule), inspect sanitized artifact and actual writer
   permissions/ledger. Preserve legitimate ledger #205; never seed/edit its production
   state to force a threshold. Verify a fresh expected-revision remote plan.
2. Complete a bounded, non-sensitive hosted lifecycle using the existing trusted
   serialized writer with isolated controlled evidence: grace, one bot-assigned
   incident, retry deduplication, expected-revision recovery and same-issue recurrence.
   The current workflow has no controlled-fixture dispatch input; do not substitute
   manual connector transitions (#203) or change production eligibility/state. A
   reviewed isolated harness is needed if natural evidence is insufficient. Clean up
   only the controlled incident; preserve production ledger/history.
3. Inspect participating/assignment email or mobile-push preferences and repo ignore/
   subscription state in the owner's signed-in account, without changing them
   silently. Confirm a real bot-origin incident arrives at the selected destination.
   Do not send test mail. Issue creation/assignment alone is not delivery proof.
4. Obtain focused desktop/mobile isolated growth browser acceptance through the
   existing full manual fixture lane or an already-working pinned Chromium. No
   repeat of the known broken browser download was attempted.
5. After a read-only plan establishes compatibility with the no-tag-migration scope,
   observe an unchanged ordinary publisher run with commit/deploy skipped. Coordinate
   any backfill with #200. Retain #133/#89 browser/visual and required-check actions;
   #82 remains the later final project-wide gate, not completed by this focused work.

Rollback is a reviewed revert of this correction only. Preserve content, ledger
#205 and legitimate incidents. Existing schema and marker identity do not change.
