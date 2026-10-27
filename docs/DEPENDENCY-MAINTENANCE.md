# Dependency maintenance and supply-chain runbook

This guide covers third-party npm packages and GitHub Actions used by Simpyll. It complements [the security architecture](security-architecture.md), [Notion publishing guide](NOTION.md), and the separate [Issue #88 rights review](ISSUE-88-RIGHTS-REVIEW.md). A package's license does not license Simpyll's articles, clinical content, logos, screenshots, photographs, or other third-party media.

## Assessment — October 27, 2026

On main `e34aee3502d78331dc7d0237e819383fe3a558bc`, Node 24.22.1 / npm 11.9.0, the full audit reported four moderate package findings, zero high/critical; production-only reported two moderate package findings, zero high/critical. These are three root advisories across two paths, not four independent vulnerabilities. After the proposed updates both audits reported zero findings. Audit results reflect registry data on this date.

| Advisory | Dependency path | Previous version | Final version/disposition | Verification |
| --- | --- | --- | --- | --- |
| [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) | react-router-dom → react-router | 6.30.6 | 7.18.4 | Audit no longer reports path; router journey validation required. |
| [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) | react-router-dom → react-router | 6.30.6 | 7.18.4 | Audit no longer reports path; router journey validation required. |
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | @tailwindcss/typography → postcss-selector-parser (dev) | 6.0.10 | 6.1.5 via scoped override | Audit no longer reports path; generated style and browser validation required. |

The router redirect requires an attacker-controlled destination; content URL validation narrows this exposure. Constructor injection requires data-router SSR error deserialization, which the static `StaticRouter` implementation does not use. Neither observation proves immunity. The parser advisory concerns CPU exhaustion with crafted selectors; typography runs at build time, not in the browser. The vulnerable parser is pinned exactly by typography 0.5.20. The override applies only to that parent and retains parser major version 6; remove it when a compatible upstream typography release resolves to a patched parser, then rerun audits and style checks. The router major upgrade preserves declarative routing and switches the server import to the v7 entry point. It requires Node 20+; CI uses Node 24. Full routing and visual browser validation remains required before merge.

The updated parser, router, and new cookie dependencies carry MIT metadata. The inventory passes, but metadata is not a legal compatibility review or proof of ownership. Source/content boundaries in `LICENSE` and `LICENSING.md` remain unchanged. If regression requires rollback after merge, revert the dependency PR and restore its matching manifest, lockfile and server import together, then rerun the audits, tests, build and deployment checks; the advisories will return and must remain tracked.

Historical measurements below refer to the earlier revision, not the current result.

## Audit baseline

Reviewed on October 26, 2026, against `main` at `ac5d565` before this change:

- No Dependabot or Renovate configuration and no open dependency-update PRs were found. The root `package-lock.json` is committed and CI/publishing use `npm ci`.
- `npm audit` reported **4 moderate vulnerability findings, 0 high, 0 critical** across the full tree. `npm audit --omit=dev` reported **2 moderate, 0 high, 0 critical**; both are React Router advisories inherited by `react-router-dom@6.30.6`: [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) concerns a backslash open-redirect bypass, and [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) concerns constructor injection during React Router SSR hydration. The audit offered `react-router-dom@7.18.4` as a fix, which is a major upgrade. In current source, `ArticleLink` validates URLs and sends same-origin paths through `Link`; the Notion publisher/content validators test unsafe destinations; `RouteNavigation` handles same-origin anchors and the search route uses published slugs. This reduces exposure to attacker-controlled router destinations but does not remove the vulnerable library range. SSR uses `StaticRouter` with `renderToString` for static prerendering and client `hydrateRoot`; no `StaticRouterProvider`, data-router error serialization or `deserializeErrors` use was found, so the constructor-injection precondition was not identified in current code. These are exploitability observations, not proof of immunity. Keep both visible and evaluate them during a separately tested React Router v7 migration; do not silently dismiss or force-upgrade.
- The other 2 advisories are moderate and build/test-only: `@tailwindcss/typography@0.5.20` brings vulnerable `postcss-selector-parser@6.0.10` (GHSA-rj75-hqrm-r3gf). The registry offered a major-version-classified downgrade to `@tailwindcss/typography@0.5.4`; evaluate the package's current release and its regression coverage before changing it.
- The baseline lockfile had 567 package entries with license metadata and no missing/unknown fields. The unused `@fontsource-variable/inter` direct dependency was removed because no source file imported it and the build emitted no font files. The current lockfile has 566 entries and no OFL-1.1 package. Remaining metadata includes MIT, Apache-2.0, BSD, ISC, MPL-2.0, LGPL-3.0-or-later, CC-BY-4.0, Blue Oak, 0BSD and compound expressions. `caniuse-lite` records CC-BY-4.0; build-tool dependencies include MPL-2.0 and platform-specific `sharp` packages include LGPL terms. This is a metadata inventory, not a legal conclusion or proof that every shipped artifact retains required notices. Verify exact package contents and the deployment artifact when redistributing code or fonts.
- The merged #88 rights-review document still says the root `LICENSE` and package license declaration are missing, although #88 is closed and the owner approved MIT for original source code. This #82 change does not add or broaden a license: reconcile #88 tracking and the canonical source license separately. The MIT decision does not grant rights to articles, clinical material or media.
- Existing validation checks TypeScript/build, lint, content and publishing boundaries, SEO, accessibility and browser behavior. The `validate` aggregation job uses `if: always()` and fails unless every required `build`, `browser`, and `fixtures` job succeeds; skipped and cancelled dependencies do not become green. The variable Lighthouse job is deliberately advisory and outside the required aggregation. Deployment and scheduled Notion publishing run only from `main`; their credentials and write permissions are not available to `pull_request` validation.
- Existing workflows already use `npm ci`, explicit permissions, main-only privileged publishers, and no `pull_request_target`. External actions previously used mutable tags. This change pins current action revisions and lets Dependabot update those pins.
- The Playwright browser job uses the versioned image `mcr.microsoft.com/playwright:v1.64.1-noble`, matched to the locked `@playwright/test` version. It is a version tag rather than a digest; the maintenance regression test keeps the versions synchronized. Review image provenance and consider digest pinning if the container registry and Dependabot update path can maintain it without weakening browser reproducibility.
- Recent PR validation runs on `main` passed. The two latest failed Pages runs completed the build, deployment and production HTTP checks, then failed a production Chromium click because `main a[href="/blog/why-simpyll"]` matched two article links. This is a selector ambiguity in production browser verification, not a dependency PR or npm build failure. Keep this baseline regression separate from dependency update validation.

## Update cadence and review policy

Dependabot checks npm dependencies every Monday and GitHub Actions every Tuesday, at 08:00 America/Chicago. Compatible npm minor and patch version updates are grouped separately for production and development dependencies, with a limit of five open PRs for each ecosystem. GitHub Actions updates remain separate by dependency. Major npm updates remain individual PRs. Security update PRs are not grouped with routine version updates and remain separately actionable.

External workflow actions are pinned to full commit SHAs with their human-readable version tags left in comments. The GitHub Actions Dependabot ecosystem updates the immutable references. The Microsoft Playwright container follows the locked Playwright test-tool version and is checked separately by CI.

There is no automatic merge configuration. Review every update and wait for the same required PR validation used for ordinary changes. In particular, manually review major updates to React, React DOM, Vite, TypeScript, Tailwind, MDX, routing, browser tooling, and publishing packages. Read release notes and migration guidance; check type compatibility, build/prerender output, hydration, Notion sync, accessibility, SEO, and production performance. Keep unrelated major migrations in separate PRs.

## Review a dependency PR

1. Confirm the PR comes from Dependabot and the changed ecosystem/package matches the title. For npm, inspect `package.json` and `package-lock.json`; for Actions, inspect every `uses:` reference and confirm the displayed release corresponds to the 40-character commit SHA.
2. For npm changes, inspect the full transitive diff with `npm diff --diff=<package>@<old> --diff=<package>@<new>` when registry metadata is available, and use `npm explain <package>` to see why a transitive package is installed. Review production versus development scope rather than treating every package as runtime code.
3. Check the PR's Dependabot alert/advisory links, affected version range, exploit preconditions, exposure, available patched versions, and whether the package is actually used on the affected path. Run `npm audit` locally for a current full-tree view. Separate production runtime findings from build/test findings. Do not run `npm audit fix --force`.
4. Inspect license metadata changes in the lockfile and run `npm run audit:licenses`. The command inventories each locked package and fails when license metadata is missing. It accepts only exact `package@version` exceptions with a written reason, reviewer and date in `scripts/dependency-license-exceptions.json`. A non-MIT license is not an automatic rejection; examine the upstream license text, package files and whether its code or assets are redistributed. Keep third-party asset/clinical rights review separate under #88.
5. Validate with `npm ci`, `npm run audit:licenses`, `npm audit --audit-level=high`, `npm run test:dependency-maintenance`, `npm run lint`, `npm run build`, then the focused tests relevant to the changed package. The GitHub PR workflow runs the license check, high/critical advisory gate, maintenance tests, complete existing build/lint/fixtures/browser checks and the required `validate` aggregation. Confirm every required check is green; a pending, failed, skipped or cancelled required check is not approval.
6. For a major or security-sensitive change, inspect generated routes and `dist/`, review Pages deployment behavior, and verify the Notion publishing dry-run/tests. Never test with patient or confidential data.

### Vulnerability gate and exceptions

Pull-request CI runs `npm audit --audit-level=high` against the complete lockfile after `npm ci`. **High and critical** findings fail CI; moderate and low findings remain visible in logs and must be triaged and tracked, but do not make CI permanently red while compatibility work is assessed. A finding is not waived by this threshold: record severity, affected dependency/path, runtime/build exposure, exploit preconditions, remediation/version or a dated owner-approved plan. Reassess on every update. The npm advisory database is network-dependent and reflects its state at run time; a registry/audit outage can fail the step and should be retried after service recovery, not bypassed. Do not add broad `|| true`, severity suppressions, or forced upgrades.

For the current React Router advisories, inspect whether the affected APIs and input paths occur in Simpyll, preserve a separate remediation issue/PR, and evaluate a v7 migration in isolation with route, SSR/prerender and hydration regression checks. For the Tailwind typography advisory, evaluate updated or patched versions and CSS output before applying the downgrade suggested by the audit database.

### License inventory and exceptions

`npm run audit:licenses` reads the committed lockfile and reports package/version/license counts. Use `node scripts/dependency-license-inventory.mjs --json > dependency-license-inventory.json` to save the per-package inventory, including direct/transitive, dev/prod, optional and lockfile path fields. A missing license is a review blocker for dependency PRs; if upstream metadata cannot be established promptly, add a narrowly scoped exact-version exception with a dated reason and reviewer, then continue upstream review. Remove the exception when metadata is resolved; the check also fails on stale version-specific exceptions. The check reports SPDX-like metadata as supplied by npm; it does not parse or validate license texts, establish provenance, detect asset rights, or decide legal compatibility. Review upstream license files and required notices for packages or assets included in `dist`.

## GitHub settings the repository cannot declare

Repository owners should verify these in **Settings → Code security and analysis** and **Settings → Rules → Rulesets** (or branch protection):

- Enable the dependency graph, Dependabot alerts and Dependabot security updates. Confirm security update PRs are not disabled by repository policy.
- Require the `Validate Simpyll / validate` check on `main`, require the branch to be up to date if compatible with the repository's merge policy, and prohibit bypass except for a documented emergency. The workflow's aggregate check fails if any required tier fails, is skipped or is cancelled.
- Keep GitHub Actions workflow permissions read-only by default; grant only job-scoped permissions needed by Pages, Notion publishing, editorial PR generation and analytics. Do not grant Dependabot PRs write tokens or repository secrets. Keep **Send write tokens to workflows from pull requests** disabled and do not enable Dependabot access to secrets.
- Keep automatic merge disabled. It is disabled in the repository metadata checked for this audit.
- Confirm GitHub's Pages deployment environment protection and allowed branch policy still restrict deployment to `main`.

The available repository API did not expose the alert state; a direct vulnerability-alert endpoint was not available to the integration, and reading main branch protection returned HTTP 403 for insufficient integration permission. These owner-only settings are therefore unverified; do not treat the PR's passing CI as proof that branch protection is configured.

## Emergency remediation

For a confirmed actively exploited or high/critical issue, identify affected direct and transitive paths with `npm explain`, review the advisory, and prepare the smallest compatible patch update in a dedicated PR. Keep the lockfile change and relevant regression test together. If a release cannot be safely upgraded immediately, document affected production/build paths, compensating controls, an owner and a dated remediation target. Do not weaken CI, conceal alerts, or push a package upgrade directly to `main` to evade review.

## Rollback and recovery

If a merged package or Action update breaks the site:

1. Identify the exact merged commit or merge PR in Git history. Revert that commit on a new branch (`git revert <commit>`); for a merge commit, use the mainline parent appropriate to the repository's merge strategy (`git revert -m 1 <merge-commit>`). Do not delete the lockfile or regenerate the entire dependency tree as a rollback.
2. Restore the matching `package.json` and `package-lock.json` (or action reference) through the revert, preserving unrelated changes. For a partial revert, use `git restore --source=<known-good-commit> -- package.json package-lock.json` only when those files have no later unrelated changes, then create and review the revert commit.
3. Run `npm ci`, the license and advisory checks, tests, lint and build locally; push the rollback branch and wait for the ordinary PR checks. Do not bypass required checks.
4. Merge the rollback through the protected `main` process. GitHub Pages deploys from `main` after deployment validation. Confirm the deployment and production verification workflow succeed, and inspect critical routes and assets.
5. For scheduled Notion publishing, confirm `.github/workflows/notion-publish.yml` still runs on `main`, the publisher secrets remain untouched, and the latest workflow can complete a dry-run. If published content was committed while the broken deployment was active, preserve those content commits; do not reset or force-push `main`. A code rollback should not discard the Notion source or generated article/image history.
6. Reopen the failed update PR or issue with the failure evidence and a corrected compatibility plan. Never merge automatically.

## Ownership

The repository owner reviews dependency and license changes, triages alerts, keeps exact-version license exceptions current, and verifies GitHub security/branch rules. Dependabot proposes changes but does not approve or merge them. Revisit this guide when the npm toolchain, action pinning policy, publishing credentials or repository rules change.
