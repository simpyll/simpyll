# Published topical inventory

Repository snapshot: 2026-10-26. Regenerate with `npm run audit:topics`. Sources: identity registry (`collectArticles`), published search extractor, literal MDX metadata/body links, `content/projects.json`, and editorial assignments in `src/lib/topics.ts`. No traffic, search-volume, or clinical-validation claims are inferred.

## Coverage: 6 canonical published articles

One article directly examines healthcare systems. Three articles support engineering foundations. Two are personal introductions/reflections. None is a validated clinical reference, a clinical calculator guide, or a healthcare AI evaluation. The hospital essay also discusses engineering; pillar counts describe primary editorial assignments, not all mentions.

| Article / canonical URL | Date | Category; tags | Primary pillar | Secondary topics; audience | Depth | Related projects | Existing body links | Supporting-content opportunity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Learning Python #001: Functions, Variables, and My First CLI Tool](https://simpyll.com/blog/001-python-fundamentals) | 2026-10-20 | Python; Python, CS50P, Software Engineering, AI Engineering | Software engineering & development | Functions, variables, CLI practice; Beginner developers | Tutorial with a small application | AI Engineering | None | Test calculator input boundaries with Python |
| [Hello, World.](https://simpyll.com/blog/hello-world) | 2026-10-19 | Journal; Introduction, Personal | Personal / journal (outside strategic pillars) | Introduction; New visitors | Brief introduction | No explicit relationship | None | Link to a substantive project once released |
| [The Art of Reading Code: Inside Simpyll’s New Journal Experience](https://simpyll.com/blog/the-art-of-reading-code) | 2026-10-22 | Engineering; Simpyll, MDX, React, Design, Developer Experience | Software engineering & development | React, MDX, accessibility, static publishing; Frontend developers and technical writers | Feature walkthrough with code and interactive examples | Simpyll | /blog | Explain accessible calculator error states |
| [Starting Over Without Starting From Zero](https://simpyll.com/blog/starting-over-without-starting-from-zero) | 2026-10-23 | Field Notes; AI, career, learning in public, personal, software development | Personal / journal (outside strategic pillars) | Career transition, learning in public; Clinicians learning development | Personal reflection | No explicit relationship | None | Document a bounded healthcare software learning milestone |
| [A Hospital Is the Most Complicated Computer I've Ever Used](https://simpyll.com/blog/a-hospital-is-the-most-complicated-computer-ive-ever-used) | 2026-10-23 | Ideas; critical care, healthcare, human factors, software engineering, systems thinking | Nursing informatics & healthcare technology | Human factors, workflow, systems thinking; Clinicians and healthcare developers | Long-form personal systems reflection; not clinical guidance | No explicit relationship | None | Translate one synthetic nursing workflow into requirements |
| [Why Simpyll? A Name, a Philosophy, and the Beauty of Doing Less](https://simpyll.com/blog/why-simpyll) | 2026-10-23 | Personal; Linux, Unix philosophy, building in public, jekyll, simpyll, software design | Software engineering & development | Unix philosophy, composition, software design; Developers and readers interested in Simpyll | Design philosophy essay | No explicit relationship | None | Show composition in a small healthcare learning utility |

## Hub decisions

| Candidate | Supporting articles | Eligible now | Decision |
| --- | ---: | --- | --- |
| Healthcare software & clinical tools | 0 | No | Editorial opportunity only; no public placeholder |
| Nursing informatics & healthcare technology | 1 | No | Curated links in the existing Journal; no separate index |
| Nursing & advanced practice education | 0 | No | Editorial opportunity only; no public placeholder |
| Artificial intelligence in healthcare | 0 | No | Editorial opportunity only; no public placeholder |
| Software engineering & development | 3 | No | Curated links in the existing Journal; no separate index |

A separate engineering guide could become useful after an original learning sequence is approved. A three-article minimum is a local editorial guardrail, not an SEO ranking rule. Existing `/blog` and `/explore` already provide canonical navigation and taxonomy filtering. No `/tools` route is justified while all healthcare tools remain planned. No new routes, sitemap entries, redirects, or breadcrumb levels are needed.

## Publication and project lifecycle

- Existing but unpublished article identities: 1. This is a repository audit, not an inspection of private Notion drafts.
- Published case studies: Simpyll, AI Engineering, Simpyll Pulse. A published case study is not proof of a completed application.
- in-progress: Simpyll (active); AI Engineering (active).
- shipped: Simpyll Pulse (active).
- on-deck: RNtoNP — NP School Database (planned); Medical Calculators Collection (planned).
- ideas: NIHSS Assessment Trainer (planned); Critical Care Scenario Simulator (planned); Hemodynamic Monitoring Explorer (planned); ABG Interpretation Trainer (planned); ECG Rhythm Recognition Trainer (planned); Ventilator Waveform Explorer (planned); Hospital Systems Explorer (planned); NP Board Question Bank (planned); NP Boards Wiki (planned); AGACNP.org (planned); RN-to-NP Career Pathway Planner (planned); Nursing Specialty Explorer (planned); NP Clinical Hours Tracker (planned); AI-Assisted Research Organizer (planned); Automated NP Program Data Updater (planned); Personal Knowledge Graph (planned); Interactive Developer Learning Roadmap (planned).
- archived: None.

No released healthcare application is evidenced by the registry. RNtoNP’s external site link does not establish that its proposed database is live. Proposed editorial opportunities are in [the content roadmap](healthcare-content-roadmap.md); they are not published coverage.

## Discovery and publishing audit

- Home retains its approved “From bedside to build” hero. Proposed healthcare-first primary copy is held for owner review in the taxonomy document.
- Project board and grid retain workflow/lifecycle labels. Existing `article` project links now connect the Simpyll and AI Engineering cards/case studies to their supporting writing; article pages derive reverse links from those same records.
- Journal reading paths use immutable IDs and resolve current canonical posts; categories and tags still link to `/explore` query filters. No automatic keyword linking or MDX rewriting.
- Related-article ranking (#15), previous/next navigation, search generation, citations, editorial history, breadcrumbs, sitemap, and static prerendering remain authoritative. No duplicate content index is introduced.
- Notion publishing remains one-way and retains author-owned categories/tags. Taxonomy assignments live outside Notion-managed MDX. New or renamed articles require an editorial assignment/review, not a forced healthcare category.
- Pulse and analytics are present on the audited main branch. No open PRs were returned by the connected GitHub repository search at audit time; this snapshot cannot guarantee future concurrency. This change does not edit Pulse, analytics, their generated data, or workflows.
- Inventory body links exclude global navigation and computed recommendations; the latter still use their existing published registry. Article word counts would not establish clinical authority, so depth is a qualitative editorial assessment.
