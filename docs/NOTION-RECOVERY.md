# Notion publisher disaster recovery

Git records **previously committed public content**, not private Notion drafts.
Recovery reads Git objects offline. It never calls Notion, executes historical
MDX, restores application configuration, commits, pushes, or deploys. Dry-run is
the default; only `--apply` changes source files. Work on a recovery branch in a
clean, exclusive checkout (do not run the publisher or an editor concurrently).

## Ownership and consistent snapshots

The publisher in `scripts/notion/publisher.mjs` owns:

- `.notion/published.json`: version/source ID, immutable Notion page IDs,
  publication state/date, current slugs, history, explicit aliases, image maps,
  and SHA-256 hashes of owned files.
- Only manifest-listed `src/content/blog/<slug>.mdx` articles.
- Only manifest-listed `public/images/notion/<32-character-page-id>/` raster
  source/compatibility assets with the publisher's hashed naming convention.

Manual articles, other public images, settings, secrets, workflows and other
configuration are never recovery targets. A path alone does not prove article
ownership: existing MDX must also declare the current manifest's immutable ID.
A manual replacement or an unowned existing destination aborts the entire plan,
even if its bytes happen to match. Invalid existing MDX cannot establish identity
and must be inspected separately; the tool deliberately refuses to overwrite it.

One historical commit supplies each selected article **and** its complete
metadata/image set. The full historical manifest/files are validated before any
write. Missing assets, invalid hashes/identities, route/alias collisions, unsafe
paths, symlinks and incomplete/empty snapshots stop recovery. Current manual
article routes, explicit aliases and Git-derived aliases participate in collision
checks. Historical content is parsed, never evaluated.

Single or multiple article recovery merges selected IDs into the current valid
manifest and removes only their superseded owned MDX paths. Other articles stay
unchanged. A corrupt current manifest requires full-snapshot mode; recovery must
not guess unrelated current mappings. Full mode restores the historical article
set and removes newer currently owned article paths; review this deliberate
scope carefully. Existing valid compatibility images are retained to preserve
public media URLs. A newer missing/corrupt compatibility image outside the chosen
snapshot causes refusal: choose a commit containing the complete image set.
Generated redirects (`src/generated/redirects.json`) and optimized images are
rebuilt using current tooling, never copied from an old application revision.

## Find and inspect the last known-good commit

Use Node 24 and the locked repository dependencies. Retain a local clone or Git
mirror if loss of the GitHub repository/account itself is a concern; Git history
on a single remote is not an independent off-site backup.

```bash
git fetch origin
git switch -c recovery/notion-content origin/main
npm ci
git log --oneline -- .notion/published.json src/content/blog public/images/notion
git show GOOD_SHA:.notion/published.json
git show --stat GOOD_SHA -- .notion/published.json src/content/blog public/images/notion
```

Replace `GOOD_SHA` with the reviewed full commit SHA. Ensure all history is
available (`git fetch --unshallow` in a shallow clone). Find the immutable
32-character page ID in `articles`, not a title or a possibly changed slug.
Inspect recoverable paths, selected IDs, writes and deletions with a dry-run:

```bash
npm run recover:notion -- --revision GOOD_SHA --all
npm run recover:notion -- --revision GOOD_SHA --article PAGE_ID
npm run recover:notion -- --revision GOOD_SHA --article PAGE_ID --article SECOND_PAGE_ID
```

The JSON plan identifies the resolved commit, mode, selected IDs and changed
paths. An unchanged consistent snapshot lists no writes or deletes. `--root`
can target another Git checkout; the revision is resolved in that checkout.
There is no network dependency after history/dependencies are available.

## Restore after accidental unpublish or article deletion (A)

Pause **Publish Notion blog** in GitHub Actions before operational recovery so
another 15-minute synchronization cannot undo the reviewed restoration. Restore
the intended Notion Published status separately when access is available. The
utility does not alter workflow settings or Notion status.

```bash
npm run recover:notion -- --revision GOOD_SHA --article PAGE_ID
npm run recover:notion -- --revision GOOD_SHA --article PAGE_ID --apply
git diff --stat
git diff -- .notion/published.json src/content/blog
```

This restores the selected historical identity, slug, aliases, MDX and its
tracked images. It does not silently restore other articles. For several
articles repeat `--article` in the same operation.

## Corrupt manifest / full publisher snapshot (B)

```bash
npm run recover:notion -- --revision GOOD_SHA --all
npm run recover:notion -- --revision GOOD_SHA --all --apply
```

If the working manifest is missing or invalid, the default ownership evidence
is the committed manifest at HEAD. If HEAD's manifest is also corrupt, supply an
explicit reviewed revision representing the current ownership set:

```bash
npm run recover:notion -- --revision GOOD_SHA --all --ownership-revision OWNERSHIP_SHA
npm run recover:notion -- --revision GOOD_SHA --all --ownership-revision OWNERSHIP_SHA --apply
```

Ownership evidence does not authorize overwriting manual files. If no trusted
manifest accounts for the current set, stop and reconcile the ownership evidence
in a separate review. The tool intentionally refuses an unsafe guess. Full mode
may unpublish newer articles absent from the historical snapshot. Review all
planned deletions and do not use it for an isolated missing article.

## Missing or corrupt images (C)

Select the article ID and a commit where its MDX, manifest and local source
images are consistent; use the same article recovery command. Hash verification
catches absent or changed sources. It restores all tracked images in that page's
namespace, including compatibility URLs, rather than choosing a mismatched image
from a different commit. External HTTPS images and sources never committed to
Git cannot be recovered. Re-upload those separately after rights/source review.
The normal build regenerates optimized variants from restored source images.

## Notion access revoked (D)

Published committed content remains recoverable with the offline commands above.
A failed Notion read does not require deleting articles or rolling back a healthy
Pages release. Separately restore the read-content connection to the original
Simpyll Blog database/parent page, rotate `NOTION_API_TOKEN` in Actions secrets
if necessary, and confirm `NOTION_PAGE_ID`. Do not put credentials in Git, shell
history or reports. Run the publisher manually with **dry_run checked**, inspect
the proposed outcome, reconcile recovered articles' Notion status/slugs, then
resume the existing schedule. A Git restoration cannot repair a Notion token or
restore lost Notion drafts.

## Slug/redirect regression and manual conflict (E/F)

Recover by immutable page ID from the known-good routing snapshot. History and
`redirectFrom` travel with that identity. The current redirect registry checks
canonical/alias collisions and duplicate identities before writes. Restoring an
older slug also restores its historical alias set; it cannot infer later aliases
that did not yet exist. Prefer the latest good routing commit. If preserving a
newer public URL requires additional alias reconciliation, do it explicitly in
a reviewed follow-up and align Notion before resuming sync. Never silently merge
incompatible histories or overwrite a manual article to clear a collision.

## Validate, review and publish

```bash
npm run test:notion
npm run test:redirects
npm run test:content
npm run test:images
npm run build
npm run lint
git diff --check
git status --short
# Stage only the specific recovery paths from the reviewed plan:
git add -- .notion/published.json src/content/blog/RESTORED_SLUG.mdx
# If needed, explicitly stage restored image paths and superseded MDX deletions.
git commit -m 'content: restore reviewed Notion publishing snapshot'
git push -u origin HEAD
gh pr create --base main --title 'Restore reviewed Notion publishing snapshot' --body 'Restores the reviewed content snapshot; see recovery plan and validation evidence.'
```

Inspect the full diff, including manual articles staying untouched. Require
successful normal CI and review before merge/deployment. Deployment uses the
existing Pages workflow; verify the release using
[production verification](PRODUCTION-VERIFICATION.md). Recovery itself never
pushes or deploys. Re-enable synchronization only after source status and URLs
agree, or the next successful sync will replace the restored snapshot.

## Monthly integrity drill

`.github/workflows/publishing-recovery.yml` runs **04:17 UTC on day 3 each month**
and supports manual dispatch. It uses read-only contents permission, no persisted
checkout credentials, no Notion secrets, no browsers, no build, and no deployment
or push. A synthetic public Git repository in an OS temporary directory simulates
deleted MDX/images and a corrupt manifest. The drill exercises default dry-run,
explicit full recovery, hashes, identity, alias history, manual-conflict refusal,
and preservation of manual/configuration files. It fingerprints the original
checkout's source bytes before and after and deletes the temporary repository.
Failure exits nonzero and reports diagnostics through the native Actions summary
and GitHub notifications. Unknown checks are unexecuted, never passing evidence.
This proves the recovery mechanism, not the completeness of every remote object.

```bash
npm run drill:recovery
```

Example summary (the real report also includes the tested fixture SHA):

| Check | Result |
| --- | --- |
| Historical article recovered | Passed |
| Manifest restored consistently | Passed |
| Immutable article identity preserved | Passed |
| Historical slug aliases preserved | Passed |
| Publisher-owned images validated | Passed |
| Manual articles protected | Passed |
| Production repository unchanged | Passed |

The weekly publishing audit remains independent and weekly; adding another API
lookback/staleness notification path would duplicate the monthly failure signal.
Check the monthly Actions history directly for missed/disabled schedules. GitHub
can delay or skip schedules; this is not a backup SLA. No extra weekly workflow
or external alerting provider is introduced. Lightweight recovery tests run in
the existing `test:notion` PR step; the monthly drill stays outside the PR path.

## Limits and security

Git history may retain accidentally published sensitive content, and public
caches/forks may retain it after deletion. Removing the latest file does not
erase prior disclosure. This utility never rewrites history or force-pushes.
Use the repository's separate incident response process for sensitive exposure.
Uncommitted content, private Notion drafts, deleted remote assets and absent Git
objects are not backed up here. Recovery refuses symlinks and uses an allowlist
and argument-based Git calls, not shell interpolation. Use a trusted local
checkout under exclusive operator control; filesystem checks are not a defense
against a malicious concurrent process replacing directories during writes.
Writes are planned together and ordinary I/O failures attempt rollback; a power
loss during apply is not an atomic transaction. Re-run the dry-run and inspect
the checkout after interruption before committing anything.

## Implementation validation (October 25, 2026)

- 29 deterministic publisher/recovery checks passed (14 recovery tests, with
  multiple corrupt-snapshot variants), plus 8 redirect, 39 content, 3 image and
  17 weekly-audit checks.
- Local monthly drill passed all seven report checks; the fixture has fixed Git
  author/committer dates. Recovery against current main in dry-run proposed no
  writes/deletions. Apply was exercised only inside synthetic temporary repos.
- Production build/prerender, asset budgets, ESLint, TypeScript, YAML parsing and
  diff whitespace checks passed. A fresh standalone TypeScript invocation needed
  generated data first; the normal build generated it and passed.
- Publisher remains every 15 minutes; audit remains Sunday 09:37 UTC. Monthly
  drill is day 3 at 04:17 UTC, read-only with no secrets/push/deploy. Existing
  accessibility/browser gates are unchanged and will run in PR CI; no local
  browser rerun was needed for this source-tooling-only change.
- No production restoration or deployment was performed.
