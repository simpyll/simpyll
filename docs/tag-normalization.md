# Article tag identity and migration (#200)

## Policy and authority

`src/lib/tags.mjs` owns tag identity and display normalization. Identity uses
Unicode NFKC, trims surrounding whitespace, collapses internal whitespace and
lowercases using JavaScript's locale-independent `toLowerCase()`. Punctuation
remains significant: C++, C# and C are distinct. Empty tags are removed and each
article's identities are deduplicated and sorted by code-unit order.

Display labels deliberately equal the lowercase identity, including acronyms and
proper names (`MDX` → `mdx`, `Notion` → `notion`). This avoids guessing a preferred
capitalization or introducing another registry. Labels never depend on article,
tag or query order. Categories retain their existing display policy.

Notion properties are authoritative for imported articles. The publisher writes
canonical tags on every import/update, even when the source revision is unchanged;
it already rebuilds metadata on every sync. Ownership hashes are checked before
conversion. Normalization does not bypass them or alter publication eligibility,
source revisions, bodies, slugs, dates, redirect history or immutable identities.
Repository-authored MDX remains authoritative for manual articles.

`src/generated/*`, search indexes and prerendered output are derived, ignored
artifacts, not migration inputs. Article generation, runtime metadata and search
index generation normalize legacy tags immediately without editing source MDX.
Validation still accepts legacy string tag arrays so engineering can ship before
the published-content backfill. Discovery's existing URL parser/serializer and
related-article comparisons use the shared identity (via `taxonomyId`). Search
uses normalized tags with its existing text/token matching. Taxonomy aggregation
counts unique article IDs (slug fallback) per identity, even for duplicate variants.

Existing `/explore?tag=Nursing`, encoded values and repeated case variants resolve
to one canonical selection. The existing replace-history URL canonicalization,
SSR/hydration state and navigation behavior remain in place. Tags printed on
article cards/pages and search results use the same lowercase labels.

## Reviewable migration

From a clean checkout with dependencies installed:

```sh
npm ci
npm run migrate:tags
# Review JSON: each file, before/after values, ownership and manifest update.
# Only in the later owner-approved content phase:
npm run migrate:tags -- --apply
git diff -- src/content/blog .notion/published.json
npm run migrate:tags
npm run test:unit
npm run build
```

The default command only plans. `--apply` is required for writes. No Notion API or
database writes occur. The migration parses literal MDX metadata without evaluating
article code and replaces only the tags-array source range; every other source byte
is preserved. All publisher-owned files are verified against the validated manifest
before any writes. Notion identities without manifest ownership are rejected.
Owned article hashes are updated together with their metadata, preserving source
revision/asset/history fields, so a subsequent unchanged publisher import agrees
with the migrated file. Manual article changes need no publisher ownership entry.
The apply path rechecks originals before writing and restores them on write failure.
Run on a clean branch without concurrent publishing; review and commit article and
manifest changes together. Do not hand-edit generated MDX or its hashes.

Fixture evidence is in `scripts/tags.test.mjs`: default planning leaves bytes
unchanged; manual and publisher-owned fixtures preserve all non-tag bytes; repeated
apply has no changes; the next two unchanged imports are no-ops; unchanged-source
imports can also normalize legacy tags; tampered ownership and unowned Notion
identities are rejected. Mixed-case/whitespace import updates, unique-post counts,
stable labels, old encoded queries and punctuation are tested. Browser journeys
in `tests/e2e/discovery.spec.ts` cover old direct URLs, selected controls, history,
hydration errors, keyboard, axe and both themes across desktop/mobile projects.

## Deferred content-phase acceptance

This engineering PR does **not** apply the migration to published posts or rewrite
the Notion database. Keep #200 open. In roadmap #89 Phase 3, review the actual plan,
apply/commit the corpus and ownership manifest together, run normal publishing,
verify unchanged sync produces no commit/deploy, and verify old links, combined
results and unique-post counts against the deployed content. Only then complete
#200's published-content backfill acceptance. #82 remains the final project-wide
acceptance task, after the selected functionality and content work.
