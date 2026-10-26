# Internal link editorial workflow

## Architecture and audit

Issue #152 uses `collectArticles`/`resolveRegistry` from the existing identity/redirect pipeline, literal MDX metadata, and validated public case-study routes from the project registry. There is no second maintained article registry. Notion owns and replaces its generated MDX; decisions live separately in `content/internal-links`. The shared Vite remark plugin runs before reading-time/heading/rich-content transforms in both client and server builds. Links therefore exist in static HTML and the same React tree during hydration, with existing anchor accessibility and print styles.

Current main already implements related-article ranking (shared tags ×3 and category ×1), revision metadata, citations, static prerendering, SEO audit and browser gates. This feature uses the same tag/category signals but requires an exact destination phrase and paragraph topic overlap rather than related-card fallback. Pending PR #164 touches only GA consent tests and is left intact. Existing deployment runs build, SEO, lint and browser checks; there is no new browser matrix or scheduled job. Discovery is offline and tiny for the current six-article corpus; historical Actions durations were not measured locally.

## Everyday review

1. Publish through Notion, or merge article edits. The existing publisher calls discovery because token-authored content pushes do not trigger a separate push workflow. Human content pushes trigger the same discovery adapter.
2. Open **Editorial Review: Internal Linking Suggestions**. Read `content/internal-links/report.md`: each entry shows its ID, exact before/after passage, source, target, score, explanation, existing body links and target inbound count.
3. Use GitHub’s file editor on `content/internal-links/review.json`. Change only that entry’s `decision` to `approved`, `rejected`, or `pending` (defer). Commit the edit to the review branch. No application code edits are needed.
4. Merge the review PR. This does **not** activate any link.
5. The repository owner runs **Authorize internal links** from Actions, selecting **main**. Approve the protected environment deployment. This signs the exact manifest and records owner identity, main commit, run URL and date.
6. Review and merge the resulting **Apply owner-authorized internal links** PR. Normal deployment applies only signed approvals whose exact paragraph fingerprint and stable target identity are still valid.
7. Delete the completed `editorial/internal-links` branch. A subsequent content change or manual discovery run generates the next batch. Existing review branches are retained to protect owner edits; fresh batches wait until that branch is deleted. No force-push occurs.

Rejecting persists by stable suggestion ID. Pending entries remain deferred. Reverse an approval by changing it to rejected or pending in review.json, merging, and rerunning authorization. Reauthorization always replaces the entire signed decision set. Review the full manifest before signing.

A changed or moved paragraph makes an approval stale. Rendering leaves content untouched, and coverage reports explain stale/invalid outcomes. Run `node scripts/internal-links/cli.mjs` to regenerate reports. A new context gets a new ID and needs fresh approval. Stable article identity follows canonical slug migrations; unpublished/noindex destinations disappear. Notion resync requires no special steps.

## Required security configuration (fail closed until complete)

Generate an Ed25519 key pair locally:

```sh
openssl genpkey -algorithm ED25519 -out internal-links-private.pem
openssl pkey -in internal-links-private.pem -pubout -out internal-links-public.pem
```

Commit only the public key as `content/internal-links/public-key.pem`. Store the private PEM as environment secret `INTERNAL_LINKS_PRIVATE_KEY` in GitHub environment **internal-link-editorial**. Delete the local private key after secure storage. Never commit it.

Configure that environment for main only with the repository owner as required reviewer. Restrict changes to the public key, workflows, engine and decision registry using a main ruleset/branch protection and owner review (CODEOWNERS or equivalent). Disallow direct pushes/bypasses by other maintainers. Treat these files as trusted application code: someone allowed to replace the verifier or signing workflow can replace the security boundary. Enable **Allow GitHub Actions to create and approve pull requests** (the workflows create PRs, never approve or merge them). Enable automatic head-branch deletion or delete review branches manually.

Only an individual repository owner can authorize in v1; organization repositories and delegated maintainer approval fail closed. Both trusted event actor and live repository-owner API response must match. No PR code or artifacts are executed with elevated credentials. Signing runs only trusted main. Builds verify Ed25519 signatures offline; unsigned nonempty registries, changed decisions and missing keys fail. Merely merging a manifest or spoofing reviewer fields cannot activate links. The empty initial registry works without a key. If environment protection is unavailable, retain owner-only workflow dispatch and main write restrictions; if those cannot be enforced, keep decisions empty and author links manually in Notion instead.

## Scoring and conservative scope

Candidate anchors are existing multiword titles/tags, at least eight characters, bounded by Unicode word boundaries. Require at least two passage/topic terms and score ≥0.73. Score = 0.45 + up to five topic matches ×0.06 + up to two shared tags ×0.08 + matching category ×0.05, capped at 0.99. This is an explainable heuristic, not a probability. High confidence starts at 0.85. Stable hash tie-breaking; maximum five suggestions, one per paragraph and destination, no adjacent selected paragraphs. Zero is valid.

Only plain root Markdown paragraphs and plain publisher `<p>` JSON-string paragraphs qualify. Mixed formatting, JSX, HTML, headings, references, footnotes, images, code and clinical trigger words are withheld. No prose is invented. This intentionally misses opportunities; it is not semantic or clinical validation. Targets include published case studies; project body rewriting is outside the MDX pipeline. Existing body links are counted separately from navigation/cards. Coverage includes orphans, one-inbound pages, approved/pending/rejected counts and invalid/stale approvals; publication dates remain in registry metadata for older-to-newer inspection.

## Example review

> **source → /blog/hydration-guide** · high (0.91)
>
> Before: React hydration mismatch analysis requires stable rendering.
>
> After: React [hydration mismatch analysis](/blog/hydration-guide) requires stable rendering.
>
> Decision: pending. Change only this entry to approved or rejected.

Core `discover`, `validateManifest`, `apply`, and coverage JSON are reusable without GitHub or a browser. A future dashboard can submit the same manifest to an authorization adapter. Optional reranking can consume candidate scores without changing approval identity or signatures; no AI calls or keys exist today.
