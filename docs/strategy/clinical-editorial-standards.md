# Clinical editorial and healthcare software review standards

This is a proposed publishing and release policy, not evidence that any current project has clinical validation, certification, regulatory clearance, institutional adoption, or HIPAA compliance. No clinical guidance is published by #153.

## Classify intended use before writing or building

| Class | Permitted initial scope | Required review before publication/release |
| --- | --- | --- |
| Educational | Learning, fictional cases, simulation and training | Verify sources and media rights, learning objectives, scoring assumptions, independent clinical educator review for clinical claims and boundary cases |
| Reference utility | Transparent sourced information or calculations with defined inputs/limitations | Independent calculation checks, reference/version verification, clinical applicability and failure-mode review |
| Clinical decision-support candidate | Could influence a clinical decision | Stop portfolio-style release; obtain an appropriate clinical safety, governance, privacy/security and regulatory assessment for the actual intended use and deployment context |

Labels alone do not determine risk. A disclaimer does not establish safety or remove the need for validation. Do not imply certification or use in patient care from successful unit tests. Scope changes, real-world integrations or use with patient inputs require reassessment.

## Article review record: reuse existing editorial and citation systems

Keep author, publication date, updated date, revision/correction history and source citations in the existing article metadata/components (#62/#63). Do not infer a clinical review from `updatedAt` or ordinary proofreading. Before clinical publication, agree the review workflow with the owner and #87 source-freshness work. Do not add undocumented metadata fields to Notion or MDX in this issue.

Until a validated review schema exists, keep an accompanying versioned review record linked from the article/source documentation with:

- Exact article/project ID and version; educational/reference purpose, intended users and exclusions.
- Claim-level sources: guideline vs primary research vs educational summary vs personal experience; date/version, applicability, source location and rights where relevant.
- Named author and reviewer only with verified credentials and their participation; role, scope and date of review. No invented reviewers, endorsements or NP credentials.
- Evidence status: unreviewed, source-verified, independently clinically reviewed; unresolved limitations and conflicts. These are editorial states, not regulatory labels.
- Clinical content review date, next review date and accountable owner. Proposed default: review stable educational content at least annually; rapidly changing material at least every six months or sooner when the underlying source changes. These are local proposed intervals, not externally mandated standards.
- Corrections and withdrawal history through the existing editorial system; distinguish a factual correction from a routine typo.

An unreviewed clinical draft remains unpublished. When a source is superseded or a critical error is found, assess immediately; withdraw affected high-risk content until corrected and reviewed. Do not keep publishing stale recommendations merely because a calendar deadline has not elapsed. Clearly label experience-based essays and avoid turning them into universal treatment guidance.

## Tool release evidence

Document intended use/users, assumptions, formula/algorithm source and versions, units, rounding, valid ranges, missing/invalid-input behavior, expected outputs, known limitations, validation status, review dates, version history, privacy and safety considerations. Use independent reference examples and boundary cases rather than tests that merely repeat implementation arithmetic. Verify both displayed explanations and calculations. Include keyboard/screen-reader checks and usable error recovery.

For future implementation, extend the existing project schema as described in [tool opportunities](healthcare-tools-opportunities.md). Store evidence beside the product and link to it from the registry; do not create a competing project lifecycle model. Independently reviewed does not mean clinically validated for all settings. Regulatory questions require qualified assessment of actual use, claims, users, and distribution before any clinical deployment.

## Data handling

Use synthetic demonstration data. Do not ask users to enter real patient information into prototypes. De-identification alone is not a blanket permission to copy clinical records. Do not log sensitive inputs, put them in URLs/analytics events, persist them in browser storage, or send them to third-party AI services without an approved design and safeguards. Reference/educational demos should work without accounts where feasible.

Document every input, persistence location, retention/deletion behavior and third-party request. No HIPAA-compliance claims without the required technical and organizational assessment. Clinical AI demonstrations must remain distinguishable from validated clinical systems; record model/version, evidence traceability, human oversight, test limitations and failure modes when applicable.

## Owner decisions before clinical expansion

Approve review ownership and capacity; verify credentials used publicly; choose the first bounded product; approve any clinical-use scope and obtain the reviews appropriate to it. The #153 PR can be reviewed without publishing clinical claims or committing to a reviewer who has not agreed to participate.
