# Simpyll repository state — October 2026

Assessed October 27, 2026 (America/Chicago). Default branch `main`, audited commit `b442cd6728ef286464875503dd931647fb717317`. Scope: governance, issue reconciliation, completion planning and a bounded CI coverage correction. No application feature or clinical rule changed.

## Executive assessment
**NOT READY for maintenance handoff.** The site is available and much of the original feature backlog is already delivered. The remaining finish line is five P1 items: independent clinical release acceptance (#184), content-growth publishing reliability (#67), CI acceptance (#133), unfinished approved licensing (#88), and bounded manual accessibility acceptance (#43). No verified P0 was established. Five items is a finite scope, not a completion percentage or a claim of low clinical risk.

The current bottleneck is reliable acceptance of existing functionality, not new navigation patterns, dashboards, content types or tools. Preserve the existing Pages/React/MDX architecture and defer optional features. Work begins with requesting #184 review and implementing #67.

## Inventory and evidence method
- All **102 issues** were inspected: **46 open**, **56 closed** at intake, excluding PR objects. REST issue pages 1 and 2 returned 100 and 90 combined issue/PR objects; the second page exhausted the collection.
- All **88 PRs** were reviewed across open/merged/closed-unmerged states. At intake **0 open**, **78 merged**, **10 closed unmerged**. The merged count must be verified against the reconciliation source if repository history later changes.
- Repository source, tracked tree, git history, all 10 workflow files, scripts, content registries and documentation were inspected. Source tree response was not truncated.
- Branch inventory contained 83 branches; no branches deleted. No GitHub releases were returned. Unmerged dependency PRs #174–#181 and superseded #126/#161 are historical proposals, not implemented upgrades. Retain branches until owner cleanup.
- Most recent 100 workflow runs were sampled, not the entire Actions archive. Counts include superseded/cancelled runs and unequal event/branch mixes; they are not a general reliability percentage.
- Read permissions did not expose milestones, labels collections, workflow collection or main-rule settings through the connector's supported endpoint allowlist. Issue labels and permissions were observable through individual issue/repository APIs.
- The connected local browser failed initialization. No Project fields, milestone state, provider account settings, assistive-technology sessions or physical-device checks are claimed observed.

## Where the project has been
October 21–22 delivered a working publisher, documented architecture, deterministic content validation, Playwright foundation, semantic tokens, system-aware themes, motion, floating navigation, recovery, search and image processing (#1, #48–#50, #90–#110).
October 23–24 added About, TOC, unified discovery, typed project metadata, Kanban/grid views and real case studies (#113–#124), then homepage/footer, AI learning case study, accessibility and CI work (#127–#135).
October 25–26 delivered policy pages, performance budgets, health/recovery drills, RSS, editorial metadata, references, SEO, Pulse/analytics and healthcare content strategy (#136–#173). Some closures reflected partial delivery: #172 is a preliminary rights report, not the approved license.
October 27 added secure embeds, external-link monitoring, LipidPath and several release/verification fixes (#182–#191). #191 materially shortened CI but left docs and some deterministic coverage behind.

## Where the project is now
| System | Present implementation | Assessment / remaining scope |
|---|---|---|
| Rendering/hosting | React 19, TypeScript, Vite 8, Tailwind 4; whole-document SSR then static prerender; Pages/CNAME | Implemented; current live SHA verified. Do not replace hosting. |
| Routes/navigation/theme | Shared Header/capacity logic, RouteNavigation, system/persistent theme, optional reveal | Implemented with historical browser coverage; fresh manual/mobile acceptance remains #43. |
| Journal/MDX | Six public articles, heading IDs/TOC, syntax/code controls, references, revision history, print, RSS | Implemented; scaffold attribution/prose still needs editorial discretion. |
| Discovery/SEO | Local full-text index, taxonomy filters, related/adjacent articles, canonical/JSON-LD, sitemap and build audit | Implemented; optional social-card generation/palette is deferred. |
| Projects | Typed registry, public-only build, separate workflow/lifecycle, four case studies | Implemented; add content only for actual work. |
| Publishing | Main-only Notion importer, public-only guards, staged ownership checks, history redirects, local private preview, recovery | Implemented safeguards; content growth fails build budgets in inspected Notion run. #67 blocks handoff. |
| Editorial link suggestions | Deterministic reports and signed owner approvals, protected structures/canonical targets | Implemented software; signing environment/first live acceptance remains deferred #152. |
| External embeds | Canonical allowlist, component-local click-to-load, restrictive sandbox and link fallback | Implemented; real provider playback remains deferred #74, which absorbs #2. |
| Analytics/Pulse | Public safe aggregates, static counts, consent-aware tracker, private diagnostics | Implemented. No new statistics foundation is needed. Provider operations stay in runbook. |
| LipidPath | Separate deterministic engine/evidence registry, partial results, patient/clinical presentation, memory-only inputs | Live and software-tested; independent review/release approval remains undocumented in #184. |
| Security/dependencies | Least-privilege workflows, action pins, content/media/URL guards, Dependabot, npm audit | Good foundations; moderate advisories and protection settings require explicit disposition, not an immunity claim. |
| Rights/documentation | Contributor/policy/runbook material, preliminary rights audit | Root LICENSE/package license absent; closed #88 reopened. Docs contained stale tier claims, corrected in this PR. |

## Production observations
Direct unauthenticated HTTP/HTML probes on the audit date:
- HTTP 200: /, /blog, /blog/hello-world, /projects, /projects/simpyll, /projects/ai-engineering, /projects/lipidpath, /tools/lipidpath, /pulse, /about, /contact, /explore, /privacy, /sitemap.xml and /deployment.json.
- Invented /audit-nonexistent-20261027 returned 404 with custom Page not found HTML. /404 itself returned 200; this does not change the observed unknown-route 404.
- /deployment.json reported SHA `b442cd6728ef286464875503dd931647fb717317`, run **40558192363**, matching audited main.
- These checks prove HTTP/static parity only. Search, theme, calculator execution, network privacy, mobile touch and no-JS interactive fallbacks were not newly manually exercised by this audit.
- The latest successful deploy's verify job ran HTTP and production browser smoke. Historical full browser success **40543403090** predates #191; it is not proof of this PR's new head or clinical validity.

## Verified defects and completion ownership
1. **#67 / P1:** Notion run [40513347386](https://github.com/simpyll/simpyll/actions/runs/40513347386), sync job **122220572361**, failed at Validate updated site before committing. Seven MDX articles validated, but shared initial JS was **171946 > 162000 bytes**, individual entry **611034 > 600000 raw bytes**, and multiple page JS budgets exceeded. No failed content commit or data loss was established. `src/lib/blog.ts` eagerly imports all bodies; this is a plausible measured remediation target, not proof of the complete root cause. Reproduce in an isolated representative fixture before changing architecture.
2. **#184 / P1:** docs/projects/LIPIDPATH-VALIDATION.md still says independent clinical review is pending and required before merge/deploy. #190 merged and the tool is live. No review signoff was found in inspected records; absence of a record is not proof no review occurred off-platform. Reconcile explicitly.
3. **#133 / P1:** #191 skipped all browser/fixtures on PRs and reduced deterministic test invocations. AGENTS/CI docs still described previous required tiers. This PR restores the existing cold deterministic lane and license metadata check, keeps direct dependency/health contracts, and moves three real-build tests out of that lane into existing scheduled/manual fixture execution. Final timing/full-matrix/protection acceptance remains open.
4. **#88 / P1:** approved MIT source licensing never materialized as LICENSE/package metadata. #172 delivered preliminary findings; exact rights acceptance is still unfinished.
5. **#43 / P1:** existing accessibility record/public statement explicitly leaves manual screen-reader, device, real zoom, contrast and motion checks undocumented. Reopen only a finite final-journey pass, not a new WCAG framework.
6. **#82 / P2 deferred:** moderate runtime/build advisories already documented; no high/critical defect established here. Closed-unmerged major update PRs are not remediation. Reopen canonical issue for bounded triage/remediation.

## CI/CD findings and bounded change
| Workflow | Purpose / trigger | Decision |
|---|---|---|
| validate.yml | PR required build + aggregate; weekly/manual full browser, fixtures and advisory Lighthouse | Keep fast PR lane; restore deterministic suites/license inventory. Full browser stays off normal PRs. |
| deploy.yml | main push/manual/reusable deployment, build + Pages + exact-release HTTP/Chromium verify | Preserve. Successful latest run is evidence; do not restore a full predeploy browser matrix. |
| notion-publish.yml | scheduled ~15 min, manual dry-run default; validate before content write, reusable deploy | Preserve integrity gates. Reproduce/fix budget failure in #67; do not increase budgets to hide it. |
| publishing-health.yml | weekly/manual read-only status report | Preserve; acceptance of sustained-failure/recovery belongs to #67. |
| publishing-recovery.yml | monthly/manual clean-clone recovery drill | Preserve. Current regression also remains in scheduled/manual fixture job. |
| external-links.yml | scheduled/manual public link checks + bounded issue reporter | Preserve; #80 complete. |
| monitor.yml | scheduled/manual current-release HTTP availability | Preserve. |
| google-analytics.yml | scheduled/manual aggregate refresh + reusable deploy if changed | Preserve; avoid duplicate analytics systems. |
| internal-links.yml | content-change/manual/reusable suggestion discovery | Preserve owner edits, no automatic content approval. |
| authorize-internal-links.yml | owner manual signed approval | Preserve fail-closed behavior; no key/environment configured by this audit. |

Latest single timing samples: PR **40557849914** = **88 s**; Pages **40558192363** = **103 s**. Earlier full PR **40543403090** = **488 s**. Different inventories and events mean these are descriptive samples, not a causal benchmark or median.
Across the most recent 100-run sample:
```json
{
  "Deploy Simpyll to GitHub Pages": {
    "success": 2,
    "cancelled": 3,
    "failure": 14
  },
  "Validate Simpyll": {
    "success": 30,
    "cancelled": 20,
    "failure": 11
  },
  "Refresh Google analytics": {
    "success": 2
  },
  "External link health": {
    "success": 1
  },
  "Publish Notion blog": {
    "failure": 2,
    "success": 4
  },
  "github_actions in /. - Update #1658038726": {
    "success": 1
  },
  "Production availability": {
    "success": 4
  },
  "Internal link editorial review": {
    "success": 2
  },
  "npm_and_yarn in /. - Update #1656752069": {
    "success": 1
  },
  "github_actions in /. - Update #1656752075": {
    "success": 1
  },
  "npm_and_yarn in /. - Update #1656752048": {
    "success": 1
  },
  "github_actions in /. - Update #1656752050": {
    "success": 1
  }
}
```
Four npm ci installations remain in full validation jobs for isolation; routine PRs install once. Deploy installs for build and verification separately. Lockfile-keyed npm download caching and exact image-transform caching exist. No cache-hit percentage was calculated; no node_modules or cross-SHA HTML reuse introduced.

Restored fast lane: 26 Node files (29 prior entries minus real project-build, preview-build and recovery-build fixtures). The preview isolation test snapshots shared output, so it must run after production generation and not concurrently with a build. The initial local attempt did overlap a build, correctly failed its byte-preservation assertion, and is not counted as passed. The subsequent isolated fixture result is recorded in verification. Existing direct dependency/health commands are retained to satisfy their explicit workflow contracts even though the fast suite overlaps them slightly.
Normal PR security remains npm audit high/critical + license metadata, with read-only credentials. Full matrix is available weekly/manual, not on main/Pages builds. GitHub settings must actually require validate; workflow presence does not establish that enforcement.

## Security, privacy and accessibility limits
The source audit found no new critical exploit. GitHub Pages response-header limits are documented; don't claim an enforcing response-header CSP from meta markup. Manual MDX is trusted source, while Notion text/media cross an explicit validation boundary.
The dependency runbook lists moderate React Router and typography-transitive advisories. A fresh audit gate is validated separately; historical counts must not be treated as a current vulnerability scan.
No patient inputs, private drafts, signing keys, provider messages or Notion account content were accessed during this audit. The contact provider was not sent a test message. No tool review signoff, licensing determination or full accessibility-conformance claim is manufactured.

## Verification
- Local production build/TypeScript/client+server/prerender/asset budgets passed; SEO output: **24 pages, 23 indexable, 0 errors, 7 existing editorial warnings**.
- ESLint passed.
- Corrected fast deterministic lane: **378 passed, 0 failed**, about **20 seconds** locally; this is test execution, not total hosted PR duration.
- Workflow/dependency/publishing-health focused contracts: **26 passed**.
- Dependency license metadata inventory passed. This does not prove asset provenance or legal compatibility.
- Isolated private-preview production build passed (1 test, ~30 seconds). Clean-clone recovery production build passed (1 test, ~17 seconds). Fresh npm audit: 4 moderate findings, 0 high/critical; high/critical gate passed. Never infer browser or clinical success from these checks. Hosted final-head results are recorded in the PR.
- No UI behavior changed, so a new exhaustive local browser matrix was not launched as routine documentation validation. #133 requires a current full regression before final project handoff.

## Technical debt and future direction
Prioritize content/body chunking only where it fixes #67. Remove stale coordination, reuse implemented systems and verify the actual remaining acceptance. Optional animations, graph/heatmap/terminal, comments/newsletter, new content types, tools framework and NIHSS are deferred. Preserve ownership-protected one-way publishing; #111 is a distinct high-complexity expansion.

## Handoff recommendation
Keep primary completion work finite and ordered: #184 review request; #67 engineering; #133 acceptance; #88 rights; #43 final manual acceptance. #88 preparation can overlap engineering, and #43 waits for stable behavior.
After those gates pass, transition to maintenance mode and move development to Cortex. No code or backlog changes were made in Cortex.
See [versioned roadmap](../roadmap/simpyll-v1-completion.md), [issue table](simpyll-issue-disposition-2026-10.md), and [GitHub change log](simpyll-github-reconciliation-2026-10.md).
