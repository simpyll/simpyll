# LipidPath

Educational preview of selected adult pathways in the 2026 ACC/AHA multisociety dyslipidemia guideline. Issue #184; roadmap #89. One feature branch and one implementation PR. Do not merge/deploy before qualified independent clinical review and owner release review.

## Delivered interfaces

- `/tools/lipidpath`: guided profile → labs → existing therapy → confirmed manual PREVENT-ASCVD → results. Editable steps and full reset. Original expandable decision pathway, evidence explorer, absolute lipid comparisons and baseline reduction when known.
- `/projects/lipidpath`: native portfolio registry/case-study entry, factual architecture, validation and limits. Linked from projects, generated sitemap, prerender and smoke inventory.

## Architecture

`src/features/lipidpath/types.ts` defines optional input facts, structured goals, evidence, considerations and reasoning trace. `engine.ts` validates first and evaluates pure deterministic rules, with no React, network, storage, clock or random dependency. `eligibility.ts` is shared with the form. `calculations.ts` supplies non-HDL, LDL percent change and analyte-specific unit conversions. `evidence.ts` records journal section, recommendation number, COR/LOE, eligibility, exceptions and page/figure. Every goal, consideration and trace references that registry.

`LipidPath.tsx` uses only in-memory React state and lazy-loads the engine on assessment. The route is split from the shared application and registered on SSR/preloaded before direct-route hydration using the existing deferred-route pattern. Native HTML controls/details/meter provide keyboard and text alternatives without graph libraries, animations or new dependencies. No clinical inputs in URLs, storage, analytics or third-party calls. Unknown answers are explicit and default to no assumptions. Reset/reload clears inputs. Existing optional site analytics excludes the tool from its published-route allowlist; no form events are sent.

## Supported scope

Core primary prevention (low/borderline/intermediate/high, low-risk long-term exception), severe documented LDL elevation, diabetes age 40–75, clinical ASCVD with exact event/condition counts, eligible CAC scores/percentiles/incidental findings, TG severity/persistence and restricted IPE discussion, elevated Lp(a), apoB assessment, established CKD and stable-treated HIV indications. Concurrent indications remain visible; the strictest applicable absolute target is highlighted. An optional tighter goal remains optional. Medication intensification needs confirmed maximum tolerated statin, adherence and relevant existing-drug data. No doses are selected.

Statin symptoms receive a separate evaluation-first educational pathway, not an intolerance diagnosis. Pregnancy/planning/lactation, children, HoFH, maintenance dialysis, complex/limited-life-expectancy care and other unsupported scenarios stop automated treatment output. See [limitations](LIPIDPATH-LIMITATIONS.md).

## Source and calculation provenance

Blumenthal et al. (2026), *Circulation*, 153:e1154–e1276. DOI [10.1161/CIR.0000000000001423](https://doi.org/10.1161/CIR.0000000000001423). Supplied full PDF is the working source; source map lists exact recommendation tables and Figures 1–18 were inspected, with clinical algorithms checked against recommendation text. No claim that an automated extraction equals qualified clinical review. See [source map](LIPIDPATH-CLINICAL-RULES.md).

PREVENT coefficients/model reference cases and reuse rights have not been independently verified sufficiently to deliver an equation implementation. The permitted manual mode links to the [official AHA tool](https://professional.heart.org/en/guidelines-and-statements/prevent-calculator) and requires user confirmation of the ASCVD outcome for the same profile. No PCE, total-CVD, HF substitute or numerical approximation. A manually entered result cannot be independently authenticated by this application. Thirty-year estimates restricted to age 30–59; ten-year general risk-based pathway requires 30–79, LDL 70–189, no clinical/subclinical disease or FH/severe LDL history. Disease-specific indications do not require high risk estimates.

Non-HDL = TC − HDL. LDL reduction = 100 × (untreated baseline − current)/baseline; unknown baseline means unknown reduction, and a negative change is retained. No LDL estimation method is implemented; enter laboratory-reported LDL-C. CDC NHANES uses mg/dL ×0.02586 for cholesterol and ×0.01129 for TG to mmol/L; this app uses their reciprocals for the opposite conversion. See [CDC methods](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/P_TRIGLY.htm). Source thresholds are compared in mg/dL without snapping rounded mmol/L equivalences to a threshold. Display rounding does not alter engine values. ApoB and Lp(a) keep explicitly reported units; no fixed Lp(a) mg/dL↔nmol/L conversion.

## Privacy, rights and release status

No names, DOB, record identifiers, account, persistence, backend or automatic external clinical calls. External source/calculator links are user-initiated with no clinical query parameters. Client-side operation does not constitute a HIPAA-compliance claim. A future backend needs a separate review.

Original code follows repository software licensing; original explanatory content follows repository content terms. The guideline is copyrighted by ACC Foundation/AHA. Its PDF, figures, recommendation tables, logos and branding are not included; summaries and pathway UI are independently authored. No affiliation, endorsement or certification is implied. The repository MIT decision does not relicense the third-party guideline.

## Review and updates

Source mapping → deterministic rule tests → browser/accessibility verification → qualified independent clinical review → owner release approval. Tests verify software against source-transcribed expectations and are not evidence of clinical validation. Every result identifies `2026.1.0`; review status is visible. Follow [validation](LIPIDPATH-VALIDATION.md).

Updates require source/version review (including errata), registry/rule changes, independently derived expected cases, qualified review, version bump and changelog. No automated medical scraping changes clinical thresholds. A reviewer should focus on exact populations, baseline versus treated lipids, simultaneous indications, strict/inclusive boundaries, COR/LOE and special-population stops. Record reviewer identity/qualification, date, rules/scenarios reviewed, findings and disposition before release. No qualified reviewer is fabricated here.
