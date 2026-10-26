# Healthcare-first architecture and taxonomy

Status: proposed strategic taxonomy for owner review in the #153 PR. Public changes are limited to curated Journal navigation and real article/project links. No homepage rebrand, clinical guidance, or new authority hubs are published.

## Purpose and audience

Prioritize useful healthcare software and educational resources for nurses, NP students, clinicians, educators, and healthcare developers. Maintain engineering tutorials as a major pillar. The owner is presented as a critical care nurse learning software engineering, never as a licensed NP. Current evidence is in [the inventory](topical-inventory.md).

| Priority | Strategic pillar | Reader need | Boundaries and initial destination |
| --- | --- | --- | --- |
| 1 | Healthcare Software & Clinical Tools | Find a useful, transparent utility and understand its limits | Product development priority; `/projects` remains the honest roadmap until a healthcare release exists |
| 2 | Nursing Informatics & Healthcare Technology | Understand workflows, data standards, human factors, interoperability and usable software | One systems reflection supports a Journal starting point; no clinical authority claim |
| 3 | Nursing & Advanced Practice Education | Practice and learn with sourced, reviewed materials | No established coverage; proposed learning resources need sourcing and review |
| 4 | Artificial Intelligence in Healthcare | Evaluate reliability, privacy, and oversight | General AI learning is not clinical AI expertise; no healthcare AI hub yet |
| 5 | Software Engineering & Development | Learn Python, React, TypeScript, testing, automation, accessibility and architecture | Preserve real engineering coverage and category/tag discovery; three curated Journal links |

These are cross-cutting editorial assignments, not replacements for the existing six categories or tags. Preserve categories such as Python, Engineering, Ideas, Personal, Field Notes, and Journal. Do not rename old posts or assign clinical categories merely because they mention healthcare. Personal essays may sit outside the five pillars.

## Routes and hub gate

Use `/blog` for curated starting points, `/explore` for existing category/tag filtering, and `/projects` for product lifecycle discovery. Preserve article URLs, canonical tags, sitemap rules, and breadcrumb paths. No `/topics/*`, `/resources`, or `/tools` routes are introduced. That avoids duplicate category indexes, empty healthcare pages, and false product availability.

A future hub requires at least three substantive canonical published supporting articles, an approved original introductory guide/sequence, a distinct reader task not already served by Explore, and an editor's explicit decision. `hubEligible` encodes the minimum corpus plus approval gate; it does not automatically publish routes. The threshold is a local maintenance rule, not a search-engine claim. No candidate qualifies today because no original hub guide has been approved. When justified, add the canonical route through App, route loader, prerender, sitemap, breadcrumbs, search policy, internal navigation and route/browser tests together. Do not index empty filters or a second copy of the Journal.

A future `/tools` is justified by at least one released, documented healthcare utility with an actual usable destination, release status and review record. It should answer “what can I use?” rather than duplicate the project board's “what is being built?” A project with a live external website is not necessarily a released tool.

## Relationships and maintenance

- `content/projects.json` remains the project source of truth. Its existing `links[kind=article]` owns reciprocal project/article navigation. Cards and case studies already render these links; article pages derive the reverse relationship. Do not maintain the same relation separately in MDX, topic config and Notion.
- Article URLs in these project links must resolve to current canonical published articles. Review them during a slug migration; unlike topic assignments, these existing link fields are URL-based. Tests validate this against the identity registry. A future central stable-ID relationship migration should replace all readers together rather than add another competing field.
- `src/lib/topics.ts` owns only curated topic membership using immutable article IDs. `topicArticles` resolves the supplied published posts into current slug URLs, excludes flagged drafts/tests, and deduplicates. It never changes related-article ranking, category IDs, or search scoring.
- `scripts/topical-inventory.mjs` intersects the identity registry with the existing search extractor, validates canonical collisions, extracts literal internal body links without executing content, and emits a reviewable snapshot. Run `npm run audit:topics` after editorial or project changes and review the diff. No scheduler or duplicate runtime index.
- Keep Notion-owned content untouched. Unclassified articles are marked for editorial review. Extend audience/depth/opportunity annotations after reading the article; do not infer clinical expertise from keywords.
- Supporting case studies remain in their existing project registry. Planned projects may appear on the board with their real statuses; no fabricated case-study routes or “launch” links.

## Homepage copy for owner review

Suggested primary message: **Building software and resources for better healthcare learning and workflows.**

Suggested supporting copy: “A critical care nurse building toward practical healthcare tools, while sharing lessons in software engineering, nursing informatics, and AI.”

Suggested CTA pair after a healthcare release: “Explore healthcare tools” and “Read the journal.” Until then, retain “Explore projects.” Do not imply that planned tools are available. The PR leaves the primary hero, SEO positioning, About copy and credentials intact; approval and final phrasing can be reviewed here without blocking the bounded navigation work.

## Scope and acceptance

No backend, database, paid dependency, new workflow, patient data, Notion rewrite, clinical recommendations, analytics edits, or new indexable pages. Existing static templates, design tokens, responsive grids and native links provide no-JS navigation. Follow [clinical editorial standards](clinical-editorial-standards.md) before publishing healthcare reference content.

Validation commands: `npm run audit:topics`, `node --test scripts/topics.test.mjs`, `npm run build`, `npm run lint`, and affected Playwright topic/discovery, project, related-article, accessibility and theme suites. Local browser availability and CI results must be reported accurately; a pending CI run is not a passing check.
