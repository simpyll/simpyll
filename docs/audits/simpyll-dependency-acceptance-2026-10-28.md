# Issue #82 dependency reassessment — October 28, 2026

## Scope and result

Audited latest main `37b3b97691f246bc9915465bd288891316bd9bc9` using Node 24.22.1 / npm 11.9.0. Read #82 and its comments, roadmap #89, merged remediation #196, earlier automation #173 in repository history, dependency manifests, scoped override, license inventory, Dependabot and validation/publishing workflows. Initial open PR inventory contained only unrelated article-series PR #197; a second check before PR creation found no competing open remediation PR. #197 merged while this audit ran; the follow-up was rebased onto latest main `4d0265aa3a7f3da9ced34a0c8e3cb1f3a363008b` and clean install, build, lint, license, unit, Notion and SEO checks were repeated successfully. The dependency lockfile did not change between these main revisions. #196 cannot be reused because it is already merged.

**No current advisory requires another dependency change.** Keep the already-remediated dependency and lockfile versions. This follow-up restores a missing offline SEO CI check discovered during verification and reconciles acceptance documentation. It does not repeat the router major upgrade, refresh unrelated packages, or change application behavior.

| Audit scope | Historical lockfile e34aee3, re-audited today | Current main, initial | Final branch |
| --- | --- | --- | --- |
| Full tree | 0 info / 0 low / 4 moderate / 0 high / 0 critical | All zero | All zero |
| Production (`--omit=dev`) | 0 info / 0 low / 2 moderate / 0 high / 0 critical | All zero | All zero |

These are npm package findings: the historical four entries represent three root advisories, with parent packages also counted. Registry data is time-dependent; zero findings is not proof of absence of unknown vulnerabilities.

## Advisory disposition and reachability

| Advisory / npm source ID | Exact installed path before #196 | Affected range from refreshed audit | Patched option and installed disposition | Scope / exploit preconditions |
| --- | --- | --- | --- | --- |
| [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) / 1124268 | `react-router-dom@6.30.6 → react-router@6.30.6` (`node_modules/react-router`) | `>=6.0.0 <7.18.0` | Fixed range begins 7.18.0; already installed 7.18.4, outside affected range. Today's historical audit suggests direct 7.18.5. | Production router code; open redirect requires attacker-controlled Link/useNavigate destination with backslashes. ArticleLink/content/Notion URL validation reduces exposure but is not a substitute for the fix. |
| [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) / 1124272 | Same router path and versions | `>=6.4.0 <7.18.0` | Fixed range begins 7.18.0; already installed 7.18.4. | Production dependency; constructor injection requires data-router SSR error deserialization. `src/entry-server.tsx` uses declarative StaticRouter and renderToString; no StaticRouterProvider/createBrowserRouter/deserializeErrors use was found in src. Affected API precondition not identified; dependency still remediated. |
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) / 1243379 | `@tailwindcss/typography@0.5.20 → postcss-selector-parser@6.0.10` (`node_modules/postcss-selector-parser`) | `<6.1.5` | Already installed 6.1.5 through parent-scoped override. Historical audit suggests typography 0.5.4 (major-classified downgrade); retaining parser major 6 avoids that downgrade. | Dev/build dependency, not browser parser. Crafted selectors can cause quadratic CPU exhaustion. Typography consumes repository-controlled styles during builds; publishing/build input still warrants validation. |

The prior router major upgrade was already merged, so this task introduces no new breaking upgrade. React 19, TypeScript 6, Vite 8, Tailwind 4 and MDX remain intact. `npm explain` confirms router-dom → router 7.18.4 and typography → overridden parser 6.1.5. Removed historical `@remix-run/router@1.23.4` and added cookie 1.1.1 / set-cookie-parser 2.7.3 were part of #196, not this follow-up.

`npm outdated --json` returned status 1, listing @types/node (26.6.5), lighthouse (13.6.0), motion (14.7.1), react-router-dom (7.18.5), typescript (7.0.2), typescript-eslint (8.72.1), and vite (8.3.5). None is reported vulnerable in the fresh locked-tree audit. Leave routine updates to Dependabot and avoid unnecessary major versions. `npm ls --all` exited 0; it lists platform-specific unmet optional packages and optional sharp WASM entries marked extraneous, without a required-dependency failure. No lockfile drift occurred after npm ci.

## Verification

Commands ran locally against the unchanged main application/dependency tree, followed by the final workflow change where relevant:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 481 installed packages. Manifest and lockfile unchanged. |
| `npm audit --json`, `npm audit --omit=dev --json`, `npm audit`, `npm audit --audit-level=high` | Passed; zero findings. |
| `npm outdated --json`; `npm ls --all` | Completed; statuses 1 (updates available) and 0 respectively; observations above. |
| `npm run build` | Passed client/server TypeScript/Vite, static prerender, article/image/search/redirect/sitemap/RSS generation, asset budgets and SEO. 24 pages, zero SEO errors, seven existing editorial warnings. |
| `npm run lint`; `npm run audit:licenses` | Passed; 567 locked packages, no missing license metadata. Metadata is not a legal rights determination. |
| `npm run test:unit` | Initially 378 passed; final rebased branch 381 passed, zero failed. Includes publishing health, dependency maintenance, content/security, MDX, search, navigation and LipidPath contracts. |
| `npm run test:notion` | 65 passed, zero failed. |
| `node --test scripts/images/*.test.mjs scripts/smoke/*.test.mjs scripts/analytics/*.test.mjs scripts/lipidpath-ui.test.mjs scripts/ci-workflows.test.mjs scripts/rss.test.mjs scripts/seo-audit.test.mjs scripts/performance/*.test.mjs` | Initially 85 passed / 1 failed. Failure was a preexisting workflow omission: SEO test expected CI to invoke `npm run test:seo`. Restored that existing check in validate.yml; no test/assertion was weakened. Final rebased branch rerun: all 86 passed, zero failed. |
| `npm run test:seo` | After workflow fix: 25 passed, zero failed. |
| `node --test scripts/ci-workflows.test.mjs scripts/dependency-maintenance.test.mjs` | After workflow fix: 9 passed, zero failed. |
| `npm run test:e2e:built -- --project=desktop-firefox --project=desktop-webkit --project=mobile-webkit --workers=2 --max-failures=1` | Blocked before page content: Firefox `browserContext.newPage: Target crashed`; 1 failed, 1 interrupted, 154 not run. Early stop avoids repeating environment failures and does not change required CI coverage. Not an application assertion failure or a passing browser result. |

Historical audits used a separate temporary directory containing package.json and package-lock.json from e34aee3; no old application was installed or deployed. Raw audit snapshots accompany this report in `dependency-82/`.

## Outstanding acceptance, ownership and rollback

Chromium v1248 downloads returned truncated/invalid ZIP files from the default source; an official alternate-host attempt also failed. Firefox/WebKit binaries downloaded via fallback hosts, but the host reports missing shared libraries. `npx playwright install-deps chromium firefox webkit` failed because apt could not change group/user IDs in this environment; a root-user apt retry also encountered archive-cache permission failures. No browser assertions are waived or marked passed. The GitHub connector has no workflow-dispatch action, and the available browser is signed out, so no full hosted run was dispatched. Normal PR validation intentionally skips exhaustive browsers and fixtures.

**Keep #82 open.** The repository owner owns the remaining full manual Validate Simpyll run (`full_matrix: true`) at the final revision and inspection of browser/fixture results, routing/history/redirects, hydration, search, accessibility, LipidPath and representative article typography in light/dark and narrow layouts. Fix any demonstrated regressions before closure. This follow-up is reviewable but not certified ready to merge based only on fast checks. No unresolved npm advisory or accepted vulnerability deferral is claimed.

Retain weekly Dependabot, SHA-pinned Actions, the full-tree high/critical gate, license inventory and publishing security controls. Owner should remove the scoped parser override only when a compatible typography release supplies a patched parser, then repeat audit/build/style checks. GitHub alert/security-update and required-check settings remain unverified by these checks; existing #133 operational acceptance remains separate. #67 publishing/recovery acceptance is the next active stabilization item under #89, subject to its remaining operational evidence; #43 remains owner-deferred and #184 not planned.

Rollback this follow-up by reverting its workflow/documentation commit; dependency versions do not change. Rolling back #196 separately restores the old vulnerable router/parser and must reopen advisory tracking; restore matching manifest, lockfile and server import together and rerun checks as described in the dependency runbook. No automatic merge or deployment was performed by this task.
