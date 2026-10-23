# Article URLs and slug history

Once published, an article's old addresses should keep working. The production
build generates `dist/blog/<old-slug>/index.html` with an immediate meta refresh,
a canonical link to the final article, `noindex,follow`, and a semantic fallback
link. These are **HTTP 200 HTML pages, not HTTP 301 or 308 redirects**. GitHub
Pages cannot configure arbitrary HTTP redirects; `_redirects` is not supported.
A future host or edge layer could translate the same validated mapping into
HTTP 301/308 rules. No hosting migration is required here.

## Rename a Notion article

Change **Slug** on the **same Notion page**, keeping **Status = Published**.
The publisher uses the stable page ID, records the previous slug in the existing
`.notion/published.json` manifest, and emits `metadata.articleId` in generated
MDX. Do not rename generated MDX directly or edit publisher hashes. A duplicated
Notion page has a different identity.

For example, `learning-react` → `learning-react-and-typescript` →
`building-with-react` creates two aliases directly to `building-with-react`.
Reverting to `learning-react` makes it canonical again; the other two become
aliases. Repeated syncs retain history and unrelated updates do not change it.
An optional Notion text property **Redirect From** accepts comma-separated old
slugs. Invalid or duplicate aliases fail synchronization before files change.

The manifest retains minimal inactive records (ID, last slug, date, historical
slugs, unpublished status) when a page is Draft/Ready, deleted, archived, private,
or absent from a complete successful query. It does not retain private titles or
body text in those records. No public redirects are emitted for inactive
records. Their hosted images and cached image variants are excluded from the
public build artifact and public image manifest; repository source copies remain
for compatibility if the article is republished. Republishing that same page restores its history. A failed API request
aborts synchronization rather than interpreting the failure as deletion.

## Rename a manual article

Keep its `metadata.articleId` unchanged and rename its `.mdx` filename. Existing
manual posts have IDs already. New manual articles need an immutable ID once:

```mdx
export const metadata = {
  articleId: 'manual:my-article',
  title: 'My article',
  description: 'A useful description.',
  date: '2026-10-23',
  category: 'Journal',
  author: 'David Becker',
  tags: [],
  redirectFrom: ['earlier-name', '/blog/another-name/'],
}
```

The filename remains the canonical slug. The Git content journal provides the
automatic historical slugs for each stable ID. Retain full Git history; CI uses
`fetch-depth: 0`, and shallow builds fail explicitly. Removing caches does not
remove history. Do not rewrite history or change IDs as part of an ordinary
rename. Commit the original article before renaming it; uncommitted filenames
have never been published and cannot be recovered. Legacy commits without IDs
are associated with the migration IDs `manual:<original-filename>`.

Manual `src/content/blog` is a public-only directory. Keep draft/private MDX
outside it. Builds explicitly reject draft/unpublished flags there, rather than
merely hiding articles from a list while bundling their content. Remove a manual
file to unpublish it; its old aliases also become unavailable. Restore the same
ID to republish with its history. Already published content can remain in Git,
search indexes and browser caches; unpublishing cannot erase that history.

## One registry, validation and routing

`scripts/redirects.mjs` combines Git history, the existing Notion manifest and
explicit aliases. It emits `src/generated/redirects.json` for React Router,
content-link canonicalization and prerendering. This generated file is ignored
by Git and reconstructed on every full build. It contains **only public alias →
current canonical slug pairs**, never inactive IDs or private metadata. The
Notion manifest is committed atomically with content by the existing workflow.
Sync plans all changes and validates cross-source claims first; filesystem errors
trigger rollback. Process termination can still interrupt local writes; CI never
commits or deploys a failed sync/build. Reset the failed workspace and retry.

Every destination belongs to an existing published article. Arbitrary targets,
external URLs and replacement chains are deliberately unsupported. Missing
canonical files fail prerendering; alias/canonical collisions fail validation.
Self-redirects, duplicate IDs/aliases and reserved names fail with article IDs
and paths. Since aliases point to identity-owned canonical articles, chains and
cycles cannot be represented. The generator also checks routes before writing,
so a stub cannot overwrite a canonical page.

Only flat, lowercase ASCII, hyphen-separated slugs of 1–100 characters are
supported. A bare slug or `/blog/slug/` alias is accepted. A single safe encoding
is decoded; encoded separators, traversal, double encoding, duplicate separators,
Unicode, uppercase, query/fragment metadata, external URLs and `.html` aliases
are rejected. Application paths and assets cannot be claimed because aliases
are confined to `/blog/<slug>`, with reserved blog filenames also rejected.
Direct clean URLs and trailing-slash URLs resolve to the same directory index.
There is no `.html` article URL convention to migrate.

React Router replaces aliases with the canonical route, preserving search and
fragment suffixes and using existing route focus/scroll behavior. Static stubs
need no JavaScript; their fixed same-origin target never uses untrusted query
input. Static meta refresh does not promise to preserve incoming query/fragment
suffixes. Avoid putting essential article identity in those suffixes.

The sitemap, article lists, search index and canonical metadata continue to use
current filenames only. Internal MDX links to aliases are rejected with the
current destination in the error; the shared MDX URL helper also canonicalizes
alias links at runtime. There is currently **no RSS generator** in this repo.
If one is introduced, use `articleId` as the stable item GUID and the current
canonical slug for its link.

## Inspect and troubleshoot

Run `npm run build`, then inspect
`src/generated/redirects.json` and `dist/blog/<old-slug>/index.html`.
Use `npm run preview` to test the built output, including trailing slashes.
Stubs intentionally target the production canonical origin.

- Missing alias: verify the same stable ID/page was retained, the old manual
  filename was committed, full Git history exists, and the article is public.
- Collision: use the reported IDs to remove the conflicting alias or choose a
  different slug; never suppress the validation error.
- Unpublish pending: inspect the latest Notion Actions run. A failed build leaves
  the last successful deployment live; fix it and rerun promptly.
- Never redirect removed content to the homepage. Intentional replacement
  redirects are not supported in this model; publish a reviewed replacement
  under the original identity only when it truly remains the same article.
- Changes made before this feature may already have lost Notion history. Add
  known old slugs explicitly; this implementation cannot infer unknown URLs.

Run `npm run test:redirects`, `npm run test:notion:build`, and the normal test
suite. The isolated Notion build test creates two successive renames, inspects
real generated stubs/sitemap, and runs desktop/mobile Playwright against the
production build. Test redirects never enter production article content.
