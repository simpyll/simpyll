# Healthcare content roadmap

Planning proposals, not published articles. Based on the six-article repository audit dated 2026-10-26, the owner's healthcare-first direction and the existing project registry. No keyword-volume estimates, traffic forecasts, Search Console metrics, or external market validation are claimed. Priorities are editorial judgments about usefulness, feasibility and maintenance, to be tested with readers.

## Prioritized sequence

Start with one real learner problem, deliver a small resource, explain its engineering, then publish sourced learning documentation. Validate usefulness with a nurse or student before widening scope. A publication need not have a tool; a tool should have clear documentation.

| Order | Proposed article/resource | Audience and gap | Project connection and internal links | Deliverable / feasibility | Evidence and review / upkeep |
| --- | --- | --- | --- | --- | --- |
| 1 | From a nursing workflow to software requirements | Nurses and developers; only one healthcare systems essay exists | Extend the hospital essay; Hospital Systems Explorer remains an idea | Synthetic workflow map, user story, acceptance criteria; small | Label personal experience vs general claims; clinician checks realism; annual review |
| 2 | Model NP education costs transparently | Prospective students; no education cost resource | First bounded feature under Medical Calculators; later RNtoNP comparison; link Python milestone for input handling | Spreadsheet-style specification and static scenario model before UI; small | Source each fee assumption from schools; no guaranteed ROI; per-cycle cost review |
| 3 | TypeScript input boundaries for an education cost calculator | Developers; bridge existing engineering content to a real healthcare education problem | Cost tool specification; journal implementation article | Explain units, missing data, invalid inputs and meaningful error states; small | Independent arithmetic fixtures; engineering review; change with implementation |
| 4 | Testing transparent calculations before designing the interface | Developers/educators; no published validation walkthrough | Cost tool tests and Python milestone | Dimensional analysis, known examples and edge cases; small | Reference calculation audit; distinguishes code correctness from clinical validity |
| 5 | Designing accessible healthcare learning tools | Educators/developers; no healthcare UX guide | Journal accessibility walkthrough and planned NIHSS trainer | Keyboard workflow, plain-language errors and no-JS reference fallback; moderate | Verify against official accessibility guidance at drafting; keyboard + screen-reader review |
| 6 | Nursing informatics through a synthetic workflow | Nurses and NP students; no foundational informatics sequence | Hospital essay → workflow requirements → Hospital Systems Explorer | Describe people, process and data ownership; moderate | Verify formal definitions with primary professional sources; distinguish experience; annual |
| 7 | Healthcare data standards: a small synthetic FHIR example | Healthcare developers; no standards coverage | Future terminology/FHIR resource; link engineering foundations when relevant | Read-only local fixture, field explanations; moderate | Pin official standard version and example provenance; no real patient payloads; review on version changes |
| 8 | How to document a healthcare tool's intended use and limitations | Builders and educators; no trust/validation guide | Tool metadata contract; future NIHSS trainer and cost utility | Concrete example of educational use, exclusions and validation record; small | Verify applicable source/licensing requirements; no compliance certification; per release |
| 9 | Building assessment practice with synthetic cases | Nursing students; no assessment learning coverage | NIHSS Assessment Trainer, contingent on scoring/media rights and review | One reviewed educational case before a scoring engine; moderate | Official instrument/source verification and independent clinical educator review; guideline-triggered |
| 10 | Organizing evidence for a small learning resource | Students/educators; no healthcare reference workflow | Existing citation/editorial systems; research organizer remains proposed | Traceable references and dated review record; small | Verify source relevance/currency; distinguish guideline, research, summary and experience |
| 11 | Evaluate healthcare AI with a synthetic question set | Educators/developers; no healthcare AI evaluation coverage | AI Engineering; future AI evaluation playground | Offline rubric, examples of unsupported claims and human review; moderate | No patient inputs; no clinical performance claim from a tiny benchmark; re-review model changes |
| 12 | Critical-care educational visualizations: start with one variable | Critical care learners; no reviewed physiology resources | Hemodynamic Monitoring Explorer; later ABG/ventilator trainers | Single synthetic educational visualization, no treatment suggestions; higher | Clinical source verification and independent educator review required before publishing; annual/triggered |

## Gap and sequencing decisions

Healthcare Software is the highest product priority but has zero released applications. Start with an education cost scenario utility because it is bounded, transparent and can avoid patient information. Do not call a financial scenario tool a validated medical calculator. Nursing Informatics has one systems essay but no standards or workflow tutorial. Nursing/NP Education has no sourced educational collection. Healthcare AI has no evaluation evidence; general AI learning and career reflections do not close that gap. Engineering has useful foundations but needs a real calculation/testing case study to support healthcare product work.

Orders 1–5 form the first publishable sequence. Finish one bounded product and its useful documentation before starting multiple clinical tools. Orders 6–10 establish informatics, evidence and educational review foundations. Orders 11–12 require additional evaluation or clinical review capacity and can wait. Existing technical articles remain visible and keep their actual subject matter.

## Editorial operating cycle

1. Confirm the reader's task, scope and acceptance criteria; identify an existing project or an explicitly proposed opportunity.
2. Check primary sources and rights before drafting clinical or standards claims. Record source version, applicability, access date and responsible reviewer.
3. Build and verify the smallest useful artifact with synthetic inputs; obtain feedback on usefulness and accessibility.
4. Publish implementation writing only when behavior and limitations can be demonstrated. Publish clinical explanations only after source verification and editorial review.
5. Add deliberate article/project links in the existing registry; assign topic membership by immutable ID; rerun inventory and normal content/build checks.
6. Reassess hub eligibility after each substantial publication. Review clinical resources on the schedule in their record and whenever source guidance changes; withdraw stale high-risk material when it cannot be re-reviewed.

Owner decisions: approve taxonomy and first product; decide whether the proposed homepage copy fits the brand; identify review capacity before committing to clinical scoring content. No invented deadlines or commitments are assigned to reviewers.
