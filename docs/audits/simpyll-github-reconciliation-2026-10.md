# GitHub reconciliation — October 27, 2026

All issue changes below were applied directly through GitHub's issue API and confirmed by successful responses, then the complete open issue list was fetched again. These metadata changes already exist; merging the PR does not apply them.

## Counts and exact actions
- Reviewed: 46 initially open + 56 closed issues; 88 PRs.
- Initially open dispositions: KEEP 0, REWRITE 6, MERGE 1, CLOSE COMPLETE 5, CLOSE DUPLICATE 0 (the merge row closes duplicate), CLOSE OBSOLETE 0, CLOSE OUT OF SCOPE 0, DEFER 34, CREATE 0.
- Five previously closed issues were reopened and rewritten: #43, #67, #82, #88, #133.
- **51 issue updates** total, including roadmap #89. No new issues or intermediate PRs.
- Closed complete: #37, #44, #63, #72, #80. Evidence and original requirements retained in each body.
- Consolidated #2 into #74 and closed #2 duplicate; #74 now owns the actual remaining real-provider acceptance.
- Open after reconciliation: 45 = P1 5 + P2 16 + P3 24. No P0. P2 includes roadmap #89.
- Deferred: 39 open issues labeled status:deferred; includes the four remaining operational follow-ups and moderate dependency maintenance.
- Existing P0–P3-style labels were reused as P1/P2/P3. No cosmetic area/type-label overhaul. Existing unrelated labels preserved. Every retained issue records effort, dependencies, next action and handoff-blocker status.
- No milestones assigned, board fields modified, branches deleted, PRs merged or automation schedules created.

## Per-issue API receipt
| Issue | Previous state | Disposition | Confirmed action |
|---|---|---|---|
| #184 | open | REWRITE | confirmed |
| #152 | open | REWRITE | confirmed |
| #111 | open | DEFER | confirmed |
| #95 | open | DEFER | confirmed |
| #94 | open | DEFER | confirmed |
| #87 | open | DEFER | confirmed |
| #86 | open | DEFER | confirmed |
| #80 | open | CLOSE — COMPLETE | confirmed |
| #74 | open | REWRITE | confirmed |
| #73 | open | DEFER | confirmed |
| #72 | open | CLOSE — COMPLETE | confirmed |
| #71 | open | DEFER | confirmed |
| #70 | open | DEFER | confirmed |
| #69 | open | DEFER | confirmed |
| #64 | open | REWRITE | confirmed |
| #63 | open | CLOSE — COMPLETE | confirmed |
| #61 | open | DEFER | confirmed |
| #60 | open | DEFER | confirmed |
| #59 | open | DEFER | confirmed |
| #55 | open | REWRITE | confirmed |
| #44 | open | CLOSE — COMPLETE | confirmed |
| #41 | open | DEFER | confirmed |
| #40 | open | DEFER | confirmed |
| #37 | open | CLOSE — COMPLETE | confirmed |
| #36 | open | DEFER | confirmed |
| #35 | open | DEFER | confirmed |
| #33 | open | DEFER | confirmed |
| #32 | open | DEFER | confirmed |
| #31 | open | DEFER | confirmed |
| #30 | open | DEFER | confirmed |
| #29 | open | DEFER | confirmed |
| #28 | open | DEFER | confirmed |
| #27 | open | DEFER | confirmed |
| #26 | open | DEFER | confirmed |
| #25 | open | DEFER | confirmed |
| #24 | open | DEFER | confirmed |
| #23 | open | DEFER | confirmed |
| #22 | open | DEFER | confirmed |
| #21 | open | DEFER | confirmed |
| #20 | open | DEFER | confirmed |
| #18 | open | DEFER | confirmed |
| #14 | open | DEFER | confirmed |
| #9 | open | DEFER | confirmed |
| #3 | open | DEFER | confirmed |
| #2 | open | MERGE | confirmed |
| #133 | closed | REWRITE | confirmed |
| #88 | closed | REWRITE | confirmed |
| #82 | closed | REWRITE | confirmed |
| #67 | closed | REWRITE | confirmed |
| #43 | closed | REWRITE | confirmed |
| #89 | open | REWRITE | confirmed roadmap body/title/P2 update |

The [machine-readable dataset](simpyll-reconciliation-data-2026-10.json) and [disposition table](simpyll-issue-disposition-2026-10.md) give individual rationale/dependencies. Previous bodies are retained in details sections. No closure relies on merge keywords. The roadmap Markdown is byte-identical between the issue body and versioned companion at audit revision 1.

## Requested milestone / Projects — incomplete, not claimed
Requested milestone: **Simpyll v1.0 — Production Stabilization & Handoff**; membership #184, #67, #133, #88, #43 only.
The available GitHub tool registry has no milestone create/list or Projects operations. GET milestones and labels collections were rejected as unsupported endpoint families by the fetch connector. Browser-plugin initialization returned: “Browser access requires the originating browser context.” No browser session or GitHub board was available to continue. No competing board was created.
Consequently milestone creation/assignment and Project-board reconciliation remain **unapplied**. Issue labels provide confirmed deferred separation, but are not a substitute for verified Project field changes. Existing board/milestone contents are unknown and untouched. Main branch protection/rules are likewise not claimed configured.

## Final verification record
Local build/lint, 378 fast tests, 26 focused contracts and license inventory passed. First experimental unit invocation failed on disconnected workflow contracts and a concurrently changing preview snapshot; those failures were diagnosed, coverage reconnected and build fixtures separated before final verification. Isolated preview and clean-clone recovery production-build fixtures each passed (1 test each). Fresh npm audit found four moderate vulnerabilities, no high/critical; the configured high/critical gate passed. Markdown link/count/coverage validation and git diff --check passed. Final-head hosted CI results belong to the single PR; pending checks are not passes.
