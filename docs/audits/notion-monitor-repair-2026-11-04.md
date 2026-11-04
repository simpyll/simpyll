# Recurring Notion monitor failure — November 4, 2026

Baseline main: `eaa9b1b18c835538f6e2754737feaefde0784e46`. No open PRs
at investigation. Read #67/#199 and prior #204/follow-up acceptance; those
repairs addressed conversion, incident recovery and missing evidence, but never
obtained a successful hosted article reconciliation. This repair does not
complete every historical #199 acceptance item or final project gate #82.

## Evidence and cause

All three supplied scheduled runs used this same main revision:

| Run | Audit job | Writer job | Observation artifact |
| --- | --- | --- | --- |
| [41740349836](https://github.com/simpyll/simpyll/actions/runs/41740349836) | 126279995250 | 126280841113 | 13279609439 |
| [41765448551](https://github.com/simpyll/simpyll/actions/runs/41765448551) | 126362619968 | 126363253290 | 13293075844 |
| [41820898741](https://github.com/simpyll/simpyll/actions/runs/41820898741) | 126543457240 | 126544306896 | 13315969346 |

Inspected all six logs, job steps, run metadata and all three JSON artifacts.
The first failing audit step is **Observe eligible revisions on remote main
(read only)**: `Sanitized publishing observation recorded; no source details
emitted.`, followed by exit code 1. Every artifact reports a complete inventory
of five articles, all unknown, with one missing `eligibility-configuration`
system and healthy GitHub metadata checks. No private source data is copied here.

The first failing writer step is **Reconcile durable incident issues**. It logs
`Publishing incident state reconciled. Delivery acceptance is separate.`, then
exits 1 because that same report contains a missing system. It is successfully
recording an unhealthy observation, not failing issue API permissions or JSON
download. Existing ledger #205, source incident #217 and watchdog incident #216
are preserved. The watchdog also reports a missing successful monitor heartbeat;
availability run [41787084852](https://github.com/simpyll/simpyll/actions/runs/41787084852)
has a successful public HTTP monitor and failed publishing watchdog.

Root cause reproduced with synthetic content: the audit checkout defaults to
depth 1. The real publisher's dry plan calls `manualHistory`, which throws
`Slug history requires full Git history; use fetch-depth: 0`. The monitor catches
that exception at the broad eligibility stage and suppresses its raw message.
Fetching full history in the identical fixture verifies the existing article,
leaves the checkout clean and closes the same system incident. Ordinary publisher
checkout already uses full history. No credentials, schema or editorial changes
are indicated by this evidence.

## Independent publishing/deployment baseline

[Publisher 41816469249](https://github.com/simpyll/simpyll/actions/runs/41816469249),
sync job 126528354429, succeeds at baseline main: **5 published articles;
unchanged**. Its build/commit/deploy steps correctly skip for no changes.
[Deployment 41738229273](https://github.com/simpyll/simpyll/actions/runs/41738229273)
successfully builds, deploys and verifies baseline main (jobs 126272850138,
126273165880, 126273248512), including public HTTP and Chromium hydration.
These are independent operational successes, not proof that the broken monitor
passed or that any new article was published during this repair.

## Repair and validation

The reader now fetches full history with credentials still unpersisted. The
publisher retains its ownership guard and marks history operations with the
fixed `repository-history` category. Reader/writer logs include only validated
aggregate counts and fixed categories, with a full-history remediation for this
failure. Raw provider/compiler errors remain suppressed. Failure exit status,
artifact fallback, schedules, grace, durable identities and deduplication remain.

Monitor workflow/reader/writer changes trigger a main-only push check, allowing
immediate verification after a reviewed merge without feature-branch secrets.
The synthetic regression exercises real shallow/full Git clones and real
publisher planning, plus failure, sustained incident creation and recovery through
the existing writer. The checkout contract also requires full reader history.

Live post-merge evidence and final checks are recorded in the implementation PR.
Do not infer live success from deterministic tests alone. Historical workflow
reruns retain their old workflow definition, so a fresh main push/manual/scheduled
run is needed to validate the checkout fix.
