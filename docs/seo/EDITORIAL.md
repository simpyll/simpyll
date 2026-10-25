# Editorial SEO checklist

Use this for manual MDX and Notion articles. Search visibility is a possible outcome,
not a guarantee. Serve a specific reader before optimizing for a search query.

## Required technical correctness

- Supply an accurate, nonempty title, description, author, publication date,
  category and tags using the existing metadata fields. Keep the stable article ID.
  In Notion, use Name, Description and the documented publishing properties in
  [NOTION.md](../NOTION.md); manual authors use `export const metadata` in MDX.
- The template supplies the H1 from the title. Start article sections at H2; nest
  H3 within H2. Do not repeat the article title as a body H1. Use headings for
  sections, not to make a paragraph look large. Review hierarchy warnings.
- Link to actual canonical destinations, with safe HTTP(S) URLs (or appropriate
  mailto/tel links). Use `/projects/simpyll`, not an invented project route.
  Update links after a slug migration; retain ID/redirect history through #66.
- Every rendered image needs an alt attribute. Use `alt=""` for decoration;
  describe meaningful visual information in context. Never derive alt from a filename.
- Preserve the true publication date. Set `updatedAt` / Updated Date only for a
  meaningful editorial change; record corrections/revisions as documented in
  [MDX.md](../MDX.md). A rebuild is not an editorial update.
- Do not publish drafts inside the public manual MDX directory. Use the established
  Notion publication status and withdrawal process. Validate with `npm run build`.

## Editorial judgment (warnings never block publication)

**Titles and intent.** Name the actual subject and task. “Diagnosing a React
Hydration Mismatch” is clearer than “React Tips.” Match the promise to the body:
explanation, tutorial, troubleshooting, reference, case study or research summary.
The template adds ` | Simpyll`; do not add it to article metadata. Titles must be
unique across public pages; unusual lengths prompt review, not a character quota.

**Descriptions.** Write a specific, truthful summary: “Trace a React hydration
mismatch through prerendered HTML and fix the inconsistent initial render.” Reuse
that explicit description everywhere; do not overwrite it with an AI summary.
Google may choose a different snippet. Brevity is useful; there is no magic length.

**Headings.** Prefer natural sentence case for new section headings (for example,
“How React hydration works”). Existing professional title case is acceptable.
Preserve React, TypeScript, ICU, clinical terms, identifiers such as `useEffect`,
and author-intended syntax. Capitalization is a style choice, not a ranking factor.
Do not mechanically uppercase, title-case or rewrite imported Notion headings.

**Structure.** Answer the central question early when helpful. Give prerequisites,
examples, reasoning, limitations and a useful next step where the topic needs them.
Use paragraphs, lists, code, diagrams and tables for comprehension. No fixed word
count, keyword density, mandatory FAQ or formulaic conclusion. Do not pad an article.

**Internal links.** Link where another page actually helps the reader, with a
natural descriptive anchor. Avoid “click here,” repeated exact-match links and
linking “Simpyll” to Home on every occurrence. Related articles, breadcrumbs and
chronological navigation already handle general discovery. Contextual links are
optional; avoid headings, code, existing links, citations and irrelevant matches.

**Sources and healthcare.** Cite primary documentation, research or original
observations as appropriate, using the existing references/footnotes system.
Use canonical HTTPS DOI links. Verify qualifications and claims; do not invent
expertise, clinical recommendations, outcomes or evidence. Healthcare education
needs source review and the applicable educational disclaimer. Periodically review
facts that can change; update dates only when the content actually changes.

**Images.** Choose descriptive source filenames when creating assets (for example,
`react-hydration-render-flow.png`). The existing image pipeline generates stable,
responsive derivatives with dimensions and appropriate loading behavior. A useful
figure and accurate alt text matter more than a keyword in the filename.

## What automation checks

`validate:content` validates source metadata, citations and local destinations.
The production build's `audit:seo` inspects every emitted page, metadata uniqueness,
canonicals, social consistency, static content, JSON-LD, sitemap membership, local
anchors and images. It compares the artifact to the existing publishing registry.
It never fetches remote citations or scores prose. The JSON report is written to
`artifacts/seo/audit.json`; `npm run test:seo` tests the rules with malformed output.

Heading skips, short/long metadata, missing dimensions and sparse contextual links
are review warnings. A human must judge relevance, helpfulness, alt accuracy,
source credibility and whether content deserves publication. Search intent and
ranking improvements need real performance data; an offline audit cannot prove them.
