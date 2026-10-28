# Simpyll v1.0 — Production Stabilization & Handoff

- Owner scheduling decision — October 28: move #82's remaining full browser/visual acceptance to the **last stabilization task**, after all other selected project work and immediately before final project sign-off. Keep #82 open; refresh the dependency audit and run the full regression/visual checks against that final revision. Existing dependency monitoring and security gates continue throughout.
## Current scheduling and dependency update — October 27, 2026

- #184 is closed as not planned; #43 is deferred by owner decision. Neither is a prerequisite for #82.
- #82 update (October 28): remediation merged in #196; clean-install full and production audits on main `37b3b97`, revalidated at `4d0265a`, report zero vulnerabilities. No further dependency upgrade is needed. Full browser/visual acceptance remains outstanding after local browser crashes/download and host-library failures; owner must inspect the existing full manual matrix and representative layouts before closure. The scoped parser override remains an owner maintenance item. See `docs/audits/simpyll-dependency-acceptance-2026-10-28.md`.
- MIT source licensing was implemented in #195; separate asset-provenance work is not complete.

## A. Project mission
A maintainable personal publication and portfolio connecting critical care, software engineering and AI. Finish reliable core publishing and existing tools; additional products, visual effects and growth infrastructure are outside v1.

## B. Current state — October 27, 2026
Audited main `b442cd6728ef286464875503dd931647fb717317`. The live deployment manifest matches this SHA.
Direct HTTP checks returned 200 for the homepage, Journal, an article, Projects, three case studies, LipidPath, Pulse, About, Contact, Explore and Privacy. An invented URL returned the custom 404. HTTP proves static availability, not interaction correctness.

React 19/TypeScript/Vite 8/Tailwind 4, MDX and static prerendering run on GitHub Pages. Six articles, four case studies, local search, themes, recovery and publishing safeguards are implemented. Latest PR validation took 88 seconds; Pages deployment including verification took 103 seconds (single samples, not medians).
Publishing is not fully healthy: the last two inspected Notion runs failed; the latest exceeded bundle budgets after importing a seventh article.
Clinical review, source licensing and bounded manual accessibility acceptance remain incomplete.

## C. Completed milestones
- Design, theme and navigation: PRs #90, #91, #96–#103.
- Rich MDX, search, images, stable URLs and recovery: #104–#110, #139, #166–#168.
- Projects, About, TOC and discovery: #113–#118, #120, #124, #131, #141.
- Editorial, SEO, RSS and analytics: #140, #142–#150, #155–#158, #160, #162.
- Security/dependency/embed/link foundations: #169–#173, #182, #183. #172 delivered a preliminary rights review only.
- LipidPath implementation and follow-up: #185, #188–#190. Independent clinical approval is not established.
- Faster CI/deploy: #191. This audit restores the fast deterministic lane and dependency license inventory; expensive browser/build fixtures remain scheduled/manual.

## D. Active P0 release blockers
None established. No verified outage, critical vulnerability or specific clinical misclassification was found by this audit. Pending clinical validation remains P1; this is not a safety certification.

## E. Final stabilization — strict execution order
1. [#184](https://github.com/simpyll/simpyll/issues/184) — independent clinical review and release acceptance for the already-live tool. Effort M. Dependency: final rule revision and browser evidence; request review first.
2. [#67](https://github.com/simpyll/simpyll/issues/67) — restore content-growth publishing within budgets and prove recovery. Effort M. No code prerequisite; implementation can proceed while clinical review is arranged. **Implemented in #193:** synthetic content-growth builds exercised the fix; live post-merge publishing acceptance remains open.
3. [#133](https://github.com/simpyll/simpyll/issues/133) — accept restored deterministic CI, inspect a full regression at the stabilized SHA, verify required checks and record timings. Effort S. Fast PR samples passed in 65–84 seconds; full regression at the current revision and main protection acceptance remain open.
4. [#88](https://github.com/simpyll/simpyll/issues/88) — finish approved MIT source-only licensing and deployed asset/content boundaries. Effort M. Owner rights/copyright decisions; can be prepared in parallel with publishing.
5. [#43](https://github.com/simpyll/simpyll/issues/43) — bounded manual accessibility acceptance and serious-barrier fixes. Effort S. Depends on final core behavior and current automated matrix.

6. [#82](https://github.com/simpyll/simpyll/issues/82) — **Very last task before project sign-off:** refresh full/production dependency audits and complete full browser/fixture and representative visual acceptance on the final project revision, after all other selected work. Remediation is already merged and the latest audits are clean; keep the issue open until final evidence is recorded.

Only these five P1 issues belong in the completion milestone. Do not add optional features to fill a phase.

## F. Deferred improvements
All entries below are explicitly nonblocking and labeled `status:deferred`. The roadmap coordination issue itself is P2 and remains open.

### P2
- [#152](https://github.com/simpyll/simpyll/issues/152) — Context-Aware Internal Linking — Conservative Build-Time Suggestions & Editorial Approval. Optional: configure protected signing and verify one public non-sensitive approved link end to end; keep registry empty/manual links until then.
- [#111](https://github.com/simpyll/simpyll/issues/111) — Implement bidirectional Notion ↔ GitHub article synchronization with conflict protection. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#87](https://github.com/simpyll/simpyll/issues/87) — Track article/source freshness and review dates for clinical technology content. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#74](https://github.com/simpyll/simpyll/issues/74) — Protect users and content when rendering third-party embeds. Optional: record one real-provider playback/privacy/network/mobile check without weakening sandbox; otherwise retain link fallback. Canonical home for #2 residual acceptance.
- [#71](https://github.com/simpyll/simpyll/issues/71) — Build a structured learning journal and milestone tracker. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#64](https://github.com/simpyll/simpyll/issues/64) — Add secure draft preview workflow for unpublished Notion posts. Optional: verify one owner-authorized non-sensitive Draft/Ready preview and cleanup; do not rebuild preview or publish private fixtures.
- [#60](https://github.com/simpyll/simpyll/issues/60) — Support multi-part article series and learning paths. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#59](https://github.com/simpyll/simpyll/issues/59) — Add accessible article image lightbox and captioned galleries. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#55](https://github.com/simpyll/simpyll/issues/55) — Provide contact page and spam-protected inquiry form. Optional: record owner-controlled delivery acceptance and provider settings/cost limits; email fallback already works as a link. No unsolicited test message sent.
- [#41](https://github.com/simpyll/simpyll/issues/41) — Build interactive resume/CV. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#40](https://github.com/simpyll/simpyll/issues/40) — Add article sharing and social cards. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#31](https://github.com/simpyll/simpyll/issues/31) — Embed interactive project demos. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#27](https://github.com/simpyll/simpyll/issues/27) — Create detailed project case study pages. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#18](https://github.com/simpyll/simpyll/issues/18) — Build global command palette (⌘K / Ctrl+K). Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.

### P3
- [#95](https://github.com/simpyll/simpyll/issues/95) — Prototype and implement a signature interactive Simpyll hero element. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#94](https://github.com/simpyll/simpyll/issues/94) — Add theme-aware atmospheric backgrounds with subtle ambient motion. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#86](https://github.com/simpyll/simpyll/issues/86) — Add lightweight previews for internal links. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#73](https://github.com/simpyll/simpyll/issues/73) — Add opt-in newsletter subscription and email delivery pipeline. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#70](https://github.com/simpyll/simpyll/issues/70) — Build interactive guided NIH Stroke Scale learning tool. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#69](https://github.com/simpyll/simpyll/issues/69) — Build a clinical tools hub with a safe reusable calculator framework. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#61](https://github.com/simpyll/simpyll/issues/61) — Create a digital garden for short notes and code snippets. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#36](https://github.com/simpyll/simpyll/issues/36) — Add publishing activity heatmap. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#35](https://github.com/simpyll/simpyll/issues/35) — Build interactive content knowledge graph. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#33](https://github.com/simpyll/simpyll/issues/33) — Create a Now page. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#32](https://github.com/simpyll/simpyll/issues/32) — Create visual development timeline. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#30](https://github.com/simpyll/simpyll/issues/30) — Add project changelogs. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#29](https://github.com/simpyll/simpyll/issues/29) — Create interactive technology stack page. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#28](https://github.com/simpyll/simpyll/issues/28) — Integrate live GitHub project statistics. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#26](https://github.com/simpyll/simpyll/issues/26) — Add keyboard shortcuts help overlay. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#25](https://github.com/simpyll/simpyll/issues/25) — Add back-to-top control. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#24](https://github.com/simpyll/simpyll/issues/24) — Add custom tooltips. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#23](https://github.com/simpyll/simpyll/issues/23) — Add animated text reveals. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#22](https://github.com/simpyll/simpyll/issues/22) — Add smooth page transitions. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#21](https://github.com/simpyll/simpyll/issues/21) — Build animated project cards. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#20](https://github.com/simpyll/simpyll/issues/20) — Explore optional terminal Easter egg after core UX is complete. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#14](https://github.com/simpyll/simpyll/issues/14) — Add blog sorting and filters. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#9](https://github.com/simpyll/simpyll/issues/9) — Add article reading progress bar. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.
- [#3](https://github.com/simpyll/simpyll/issues/3) — Add accessible, moderated blog comments. Explicitly deferred beyond v1; no Cortex transition dependency. Select only for demonstrated reader need and a sustainable maintenance plan.

## G. Dependency-aware execution
Request #184 review first; implement #67 next while review is arranged. Verify #133 against the final publishing/tool revision. Prepare #88 rights work independently. Perform #43 on the stabilized journeys. Cohesive fixes may share a PR; do not combine unrelated redesign.
#55, #64, #74 and #152 retain only live/provider/setup acceptance, not reimplementation.
#111 is deferred bidirectional synchronization; continue the existing one-way model and do not migrate content.

## H. Definition of Done
- [ ] No unresolved P0 or release-blocking P1.
- [ ] Core routes and exact-release HTTP/browser checks pass on the final release.
- [ ] Main Pages deployment succeeds and normal PR validation is reliable, preferably 1–3 minutes where measured feasible.
- [ ] A representative new Notion article can publish without budget failure; no-op sync, failure visibility, recovery and slug safety remain intact.
- [ ] Published MDX, navigation, search and themes work on desktop, narrow screens and keyboard.
- [ ] A current full automated browser/accessibility/fixture run is inspected, and bounded manual acceptance records limitations and serious-barrier retests.
- [ ] LipidPath has independent qualified clinical review, explicit scope, source/version traceability and owner release acceptance.
- [ ] Approved source licensing, content boundaries and deployed asset rights are resolved with evidence.
- [ ] No unresolved serious security defects; moderate advisory disposition is recorded in #82.
- [ ] Development/publishing/deploy/recovery instructions agree with code.
- [ ] Optional work remains deferred; roadmap and tracked issues agree.

## I. Transition to Cortex
**NOT READY** until these gates are verified. The finite five-item stabilization scope replaces indefinite feature expansion.
After acceptance, shift primary development to Cortex. Simpyll receives publishing fixes, security updates, dependency review and regressions only; no new platform work without a demonstrated need.
Owner: review existing weekly publishing-health/external-link/validation results, monthly recovery drill, dependency proposals and production verification. These schedules already exist; no new automation is created by this audit.
Cortex has not been modified.

## J. Audit metadata and organizational limits
- Last audit: October 27, 2026 (America/Chicago); revision 1.
- Audited commit: `b442cd6728ef286464875503dd931647fb717317`.
- Open priority counts after reconciliation: P0 **0**, P1 **5**, P2 **16** (includes this roadmap), P3 **24**.
- Open deferred issues: **39**. Active execution issues: **5**; roadmap coordination: **1**.
- Initial backlog reviewed: **46 open** and **56 closed issues**, plus **88 PRs** (all PR states).
- Initial open dispositions: 5 close complete, 1 merge into #74, 6 rewrite, 34 defer. Five closed issues reopened: #43, #67, #82, #88, #133.
- [Repository audit](https://github.com/simpyll/simpyll/blob/audit/simpyll-completion-roadmap/docs/audits/simpyll-repository-state-2026-10.md) · [Disposition table](https://github.com/simpyll/simpyll/blob/audit/simpyll-completion-roadmap/docs/audits/simpyll-issue-disposition-2026-10.md) · [API change log](https://github.com/simpyll/simpyll/blob/audit/simpyll-completion-roadmap/docs/audits/simpyll-github-reconciliation-2026-10.md).
- **Milestone not created / board not updated:** connector lacks milestone/Projects capabilities, milestone reads were rejected as unsupported, and connected browser initialization failed. The requested milestone is defined here as **Simpyll v1.0 — Production Stabilization & Handoff**, with membership #184, #67, #133, #88, #43. No creation, assignment or board update is claimed.
- Main required-check settings, provider accounts, live draft preview, real YouTube playback, assistive technologies and physical devices remain unverified. Labels provide confirmed issue-level deferred separation; they do not prove Project-board field changes.
- Do not close an issue from a PR title or passing build alone. Recheck current main, remaining acceptance, workflow results and relevant live evidence after each merge.

## Licensing implementation update — October 27, 2026

The `fix/88-source-license` PR implements the already-approved MIT software license, package/lockfile metadata, contributor terms and explicit editorial/media exclusions. Review and merge that implementation; do not select a license again. #88's remaining asset-provenance acceptance is separate and is not established by the MIT grant.

## Owner-selected article series (#60)

The owner selected the previously deferred article-series feature. The implementation is proposed in the associated PR; it remains subject to final validation and merge. It does not reactivate #43, #55, or #184 and does not create a Cortex handoff blocker.
