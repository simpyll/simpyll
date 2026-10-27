# LipidPath validation record

## Status

Source mapped and software-tested; independent clinical review pending. No clinical-validation claim. Implementation version `2026.1.0`. Source map: [clinical rules](LIPIDPATH-CLINICAL-RULES.md). Evidence registry: `src/features/lipidpath/evidence.ts`.

## Source → eligibility → output → test traceability

`evaluate()` emits stable evidence IDs for each goal, consideration and decision node. The scenario suite checks registry uniqueness and referential integrity; each registry entry retains original paraphrase, recommendation number, page, COR/LOE, inclusion and exceptions. No protected source table or PDF is committed.

| Evidence IDs | Eligibility / output | Independently source-derived scenario group in `scripts/lipidpath.test.mjs` |
| --- | --- | --- |
| risk, lifestyle, low, borderline, intermediate, primary-goals, high, high-goals | Eligible age, lipid range, confirmed ASCVD risk; category/goals | Primary boundaries 3/5/10, LDL 70/190, ages 29/30/79/80; low long-term exceptions |
| high-add, high-add-next | High risk + maximum tolerated statin + adherence + unmet goals | Intensification requirements; source evidence integrity |
| severe-causes, severe-statin, severe-simple, severe-risk, severe-ascvd, inclisiran | Severe untreated/history LDL with separate risk/ASCVD groups | Severe uncomplicated, plus risk/HeFH/CAC/ASCVD; correct add-on source ID |
| diabetes, diabetes-risk | Age 40–75, number of ASCVD risks | Diabetes normal/multiple risks; ages 39/40/75/76 |
| secondary, secondary-add, very-high, very-high-add | Distinct event and condition counts; optional tighter target | 0/1/2 major events, 0/1/2/7 conditions; missing counts; add-on safety |
| cac-extensive, cac-severe, cac-moderate, cac-mild, cac-optional, cac-incidental, cac-zero | Age, score, percentile and exception-aware CAC | 0/1/99/100/299/300/999/1000/1001; percentile 74.99/75; men39/40 women44/45; incidental findings; zero exceptions |
| tg-lifestyle, tg-pancreatitis, tg-ipe, tg-apob | Fasting persistence, age, ASCVD/diabetes risks, therapy | TG 149.99/150/499/500/999/1000/1001; missing persistence/fasting/diet; IPE exclusions; FCS referral |
| lpa-test, lpa, lpa-add, apob | Unit-specific Lp(a), residual lipid risk | 49.99/50/50.01 mg/dL; 124.99/125/125.01 nmol/L; missing units; apoB has no invented goal |
| ckd, ckd-ascvd, hiv | Established CKD/no dialysis; stable ART and age | CKD chronicity not inferred; CKD+ASCVD; stable ART requirements |
| muscle, muscle-discussion, special, monitor | Evaluation-first symptoms, scope guards, monitoring | Muscle symptoms suppress automatic intensification; pregnancy/planning/lactation, age, HoFH, dialysis, complex care, unknown/declined safety review |

Boundary expected results were transcribed from recommendation text/figures, not copied from engine output. These remain subject to independent clinical review. Grade/source registry checks do not prove the medical interpretation.

## Software commands and observations

- `node --test scripts/lipidpath.test.mjs`: 116 passing cases.
- `npm run lint`: passes.
- `npm run build`: passes, including TypeScript, static prerender, asset budgets and SEO audit (0 errors; 7 pre-existing editorial warnings).
- Isolated regression run: 519 tests pass; clean production-build/recovery fixtures: 2 tests pass. Eight additional targeted clinical tests also pass (116 clinical cases total).
- Initial broad concurrent Node invocation conflicted with shared build-output fixture tests; rerun isolated/sequential checks for reliable results, do not treat that attempt as passed.
- Local Playwright browser installation failed: the download returned an invalid/truncated archive. Browser suites are committed and run by the existing pinned CI container. Local browser, axe and visual checks are **not claimed passed**. Initial CI build/performance checks passed; the rich-MDX fixture exposed a 373-byte shared-bundle overrun. Optional theme-transition code is now deferred on interaction, preserving the budget. Browser traces also identified wrapped select labels whose text included option content; controls now use unique explicit label associations and programmatically associated hints, covered by a static accessibility contract test. Authored-label IDs remain identical across full-document SSR and root hydration; React tree-derived IDs were unsuitable for this existing wrapper architecture. Browser tests also capture hydration console errors. Final browser/fixture CI outcomes belong in the PR and final handoff.

## Browser verification contract

`tests/e2e/lipidpath.spec.ts` runs in desktop Chromium/mobile Chromium and the existing Firefox/WebKit matrix: complete intake → manual risk → result, focus movement, trace expansion, no external requests, no clinical browser storage, reset/reload, unsupported pregnancy/missing data, keyboard access, evidence grades, light-theme axe scan, narrow-layout overflow, portfolio navigation and hydration error capture. Screenshots attach to CI test results. Existing project-board inventory expectations are updated with the new project; existing axe/focus/reduced-motion rules are preserved.

## Manual release review still required

Qualified clinician: examine every mapped recommendation and exception, test source-annotated scenarios independently, reconcile source ambiguities and sign off on output wording and supported populations. Owner: review privacy, IP boundaries, successful browser/CI evidence and release scope. Record findings and corrected cases; bump rule version if guidance changes. Do not merge/deploy while this review is pending.
