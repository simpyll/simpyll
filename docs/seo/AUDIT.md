# SEO audit — issue #151

Audited October 25, 2026 against main `2b71278a43ad173548305cc61876716d514cf9cc`.
Baseline was generated from a clean production build before template edits.
[baseline.json](baseline.json) and [after.json](after.json) contain per-route evidence:
metadata, headings, JSON-LD, social tags, sitemap membership, internal anchor edges,
image attributes and static article excerpts. They are offline artifact observations;
HTTP status is explicitly null, not a fabricated 200. No search-indexing or ranking
claims are inferred from artifact correctness.

## Research and decision rules

All thirteen requested source pages were accessible during this review. Backlinko
provides practical strategy; Google documents supported Search behavior. The
commercial copywriting and topical-authority articles have changed scope: they
focus on buyer messaging and brand reputation/AI visibility. Their commercial
conversion advice is not a requirement for this personal learning journal.

| Source reviewed | Application and classification |
| --- | --- |
| [Backlinko on-page SEO](https://backlinko.com/on-page-seo) | Recommendation: accurate subject placement, readable sections and intent alignment; no density quota. |
| [Backlinko checklist](https://backlinko.com/seo-checklist) | Strategy: measurable audits. Analytics installation and paid products are not prerequisites. |
| [Backlinko technical guide](https://backlinko.com/technical-seo-guide) | Recommendation: discoverable architecture and useful crawl paths; three-click advice is not a hard rule. |
| [Backlinko internal links](https://backlinko.com/hub/seo/internal-links) | Recommendation: relevant links and descriptive anchors; no indiscriminate exact-match linking. |
| [Backlinko copywriting](https://backlinko.com/seo-copywriting) | Editorial: understand reader needs; commercial conversion framework only where appropriate. |
| [Backlinko topical authority](https://backlinko.com/topical-authority) | Hypothesis/strategy: establish a coherent subject reputation with original work; no guaranteed ranking/AI citation outcome. |
| [Google Search Essentials](https://developers.google.com/search/docs/essentials) | Technical eligibility and spam constraints differ from best practices; eligibility does not guarantee indexing. |
| [Google helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) | Recommendation: original useful information, accurate attribution and people-first writing. |
| [Google title links](https://developers.google.com/search/docs/appearance/title-link) | Recommendation: descriptive concise titles, modest branding and a clear main heading; Google can select other title text. |
| [Google snippets](https://developers.google.com/search/docs/appearance/snippet) | Supported behavior: descriptions may supply snippets; no fixed meta-description limit or guaranteed display. |
| [Google crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) | Technical discoverability: resolvable anchors with href; descriptive link text is a recommendation. |
| [Google structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) | Technical/quality: valid markup describing actual visible content; eligibility is not a rich-result promise. |
| [Google sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) | Discovery recommendation: canonical intended pages, without a guarantee of crawling/indexing. |

Local engineering contracts (for example one canonical per indexable page, unique
metadata, one primary H1 and no broken local fragments) are CI correctness standards,
not claims that Google demands every convention for indexing. Sentence case is an
editorial preference. CTR, traffic growth, topic authority and the best title wording
remain hypotheses needing Search Console/usage data and editorial review.

## Existing infrastructure reused

- `SEO.tsx`, `siteConfig` and `getSiteUrl`: Helmet metadata and production identity.
- `App.tsx`, `prerender.mjs`: real route inventory and full static documents;
  `prerender.test.mjs` already checks metadata and no-JS reveal styles.
- `redirects.mjs` / `collectArticles`: stable manual/Notion identities and withdrawals;
  source validation rejects private manual MDX in the public directory.
- `editorial.mjs`, `ArticleSchema`, `Breadcrumbs`, About's Person data: editorial
  dates and safely serialized existing JSON-LD. No additional schema library/types.
- Sitemap and RSS generators: canonical pages and explicit editorial lastmod dates,
  no rebuild-clock lastmod. Query variants/aliases/404 excluded already.
- `validate-content.mjs`, citation compiler and publisher validation: literal
  metadata, unsafe schemes, DOI formatting and author-controlled references.
- Image transformations, responsive figures, route asset budgets, Lighthouse,
  cross-browser tests, axe and the existing three-tier validation workflow.

## Baseline and final results

| Artifact metric | Baseline | After |
| --- | ---: | ---: |
| Indexable pages | 18 | 18 |
| Canonical identities | 18 | 18 |
| Custom noindex 404 | 1 | 1 |
| Missing / duplicate titles | 0 / 0 | 0 / 0 |
| Missing / duplicate descriptions | 0 / 0 | 0 / 0 |
| Invalid / duplicate canonicals | 0 / 0 | 0 / 0 |
| Heading hierarchy findings | 0 | 0 |
| JSON-LD findings | 0 | 0 |
| Sitemap inconsistencies | 0 | 0 |
| Broken local links / fragments | 0 / 0 | 0 / 0 |
| Orphan pages | 0 | 0 |
| Image attribute / local image failures | 0 | 0 |
| Empty prerendered pages/articles | 0 | 0 |
| Editorial warnings | 7 | 7 |

This is a healthy baseline, not eighteen broken pages. Most SEO infrastructure was
already compliant. Existing successes were preserved rather than rebuilt.

### Evidence and changes

| Severity / category | Evidence | Resolution / ownership |
| --- | --- | --- |
| Medium confirmed tooling defect | `validate-content.mjs` allowed `/`, `/blog`, `/about`, `/explore`, policies and articles, but omitted `/projects` and public case studies. A valid authored project link failed publication. | Reuse `caseStudyRoutes(root)` and the generated public project registry; regression covers valid hub/detail links and a nonexistent project. |
| Low editorial opportunity | Homepage title “From Bedside to Build” describes a slogan but omits the subjects already stated in the visible introduction. | “Software Engineering & AI from a Critical Care Nurse” adds truthful subject context. Visible headline and URLs preserved. This is a clarity improvement, not a proven traffic lift. |
| Medium preventive validation gap | Existing checks sampled templates but lacked a complete static-output graph, cross-route metadata uniqueness and registry-to-output comparison. | Bounded offline artifact gate added to existing build, with malformed-output tests and browser coverage. No baseline indexing defect invented. |
| Low deferred editorial | Five of six articles have no body links to another internal page; navigation/related/previous-next links prevent orphaning. | Review relevant connections under #152; do not insert automatic links here. |
| Low deferred editorial | `hello-world` and `/terms` descriptions each have 47 characters. | Review specificity if useful; do not pad or overwrite author-written descriptions to satisfy a threshold. |

No Critical/High baseline defect was established. No slug, author claim, publication
date, article text, citation or image pipeline was rewritten.

## Route inventory and editorial review

| Route | Type | Indexable | H1 count | Inbound pages |
| --- | --- | --- | ---: | ---: |
| `/404` | 404 | no | 1 | 0 |
| `/about` | page | yes | 1 | 17 |
| `/accessibility` | page | yes | 1 | 17 |
| `/blog/001-python-fundamentals` | article | yes | 1 | 5 |
| `/blog/a-hospital-is-the-most-complicated-computer-ive-ever-used` | article | yes | 1 | 8 |
| `/blog/hello-world` | article | yes | 1 | 4 |
| `/blog` | page | yes | 1 | 17 |
| `/blog/starting-over-without-starting-from-zero` | article | yes | 1 | 8 |
| `/blog/the-art-of-reading-code` | article | yes | 1 | 5 |
| `/blog/why-simpyll` | article | yes | 1 | 8 |
| `/disclaimers` | page | yes | 1 | 17 |
| `/editorial-standards` | page | yes | 1 | 17 |
| `/explore` | page | yes | 1 | 17 |
| `/` | page | yes | 1 | 17 |
| `/privacy` | page | yes | 1 | 17 |
| `/projects/ai-engineering` | case-study | yes | 1 | 2 |
| `/projects` | page | yes | 1 | 17 |
| `/projects/simpyll` | case-study | yes | 1 | 3 |
| `/terms` | page | yes | 1 | 17 |

There is no standalone contact route or topic hub in the router. Contact is handled
through existing profile/footer paths. Policy routes remain indexable; low traffic
is not a reason to noindex them. `/explore` is useful static discovery; query/filter
views already declare noindex while retaining the base canonical. Unknown URLs use
GitHub Pages' static noindex 404, not a client-generated article shell.

The six published articles are a Python fundamentals lesson (`001-python-fundamentals`),
a code-reading learning essay (`the-art-of-reading-code`), a healthcare/software
systems reflection (`a-hospital-is-the-most-complicated-computer-ive-ever-used`),
a career/learning reflection (`starting-over-without-starting-from-zero`), and two
site/philosophy introductions (`hello-world`, `why-simpyll`). Their present intent is
educational or personal reflection, not clinical treatment guidance. Sections,
bylines, publication dates and source links exist in static HTML. Optional editorial
work: review lesson prerequisites/examples, add references for factual healthcare
systems claims where warranted, and connect the Python/code-reading learning
threads where useful. Do not turn reflections into keyword-targeted tutorials.
No mass rewrite or additional content was authorized by this audit.

## Objective gate and follow-ups

`npm run build` runs `audit:seo` after prerendering and existing asset budgets.
It writes a deterministic JSON report without clocks or remote requests. Actual
rendered routes are compared to the current policies, public project paths and
published identity registry. The gate checks titles/descriptions, canonicals,
social consistency, H1/static content, JSON-LD article/breadcrumb identity, sitemap,
robots, internal URLs/fragments and local images. Withdrawn registry entries are
checked against HTML, search and RSS. It is not a complete Google rich-results
validator, prose grader or general robots.txt interpreter. Existing source checks
still own malformed metadata, DOI/URL safety and draft exclusion before compilation.

Warnings include hierarchy jumps (which need semantic review), metadata length,
missing image dimensions and sparse contextual links. They never block CI. Remote
403/429/outages cannot fail this gate. Image alt coverage is objective; accuracy,
source credibility, remote availability and image loading priority require review.
Existing image and performance tests retain those component contracts.

- **#152:** reuse `collectArticles`, generated related/adjacency IDs, taxonomy,
  canonical destinations and the report's contextual link edges. Apply suggestions
  to prose AST nodes only, with deduplication, a bounded density and author control;
  exclude headings/code/links/citations and generic site-name matches.
- **#153:** actual corpus supports early Python/code-reading and personal
  learning/publishing threads, plus one healthcare systems reflection. Broad
  React/ML/clinical topic hubs are premature without more substantive articles.
  Reuse current category/tag discovery; do not create thin landing pages.
- **#154:** consume the existing deterministic report and distinguish required
  defects from warnings. Scheduling, historical trends and a dashboard are deferred.

See [EDITORIAL.md](EDITORIAL.md) for the short author checklist, including both
manual MDX and Notion. No new service, runtime dependency, AI call or SEO framework.

## Validation record

Production build (including TypeScript, static output checks and asset budgets),
lint, content tests and the new SEO regression tests passed locally. Full existing
Node tests initially exposed copied duplicate metadata in two publishing fixtures;
those fixtures now have distinct author-controlled titles/descriptions. Browser
installation in this workspace returned truncated archives, so local browser runs
could not launch. Required PR CI must supply browser, accessibility and publishing
fixture validation; pending checks are not represented as passing.

The offline artifacts prove readable DOM content without executing JavaScript;
actual no-JS visibility and hydration are separately exercised in Playwright.
Existing keyboard, responsive, light/dark and axe suites remain enabled. Lighthouse
lab measurements reuse the existing CI performance job. Field LCP/INP/CLS cannot be
established from a static build or one lab run; no field-performance claim is made.
