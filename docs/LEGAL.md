# Legal and transparency maintenance — issue #79

Source audit: October 24, 2026; baseline main `3fe55d5ab08d924f5f71a6f8b3315bc67baedffa`.
All five policy pages were published October 25, 2026 at the owner's direction, with private contact simpyll.com@gmail.com. Publication does not imply attorney review, a jurisdictional legal determination, or verification of provider settings. Issue #88 remains open.

## Architecture and review

`src/content/policies.json` owns copy, slugs and section headings.
`src/pages/Policy.tsx` uses existing Container/SEO and semantic page structure.
App routes, sitemap, content validation and prerender consume the same slugs.
Footer links preserve socials and contextual contributions; policy edits target the JSON.
Git history is the change record. Update the review date only after actual review. The October 25, 2026 publication date records the owner's direction to finalize the documents; it does not establish attorney approval.

Before analytics, forms, newsletters, comments, executable embeds, visitor-facing AI,
clinical tools, new processors or tracking/data-handling changes: repeat source and
network audit, check provider terms/retention and applicable consent/rights requirements,
update disclosures and notices at collection, obtain owner/legal review, then test.
Do not use this document as a legal determination about applicable jurisdictions.

## Data-practices inventory

Active below means implemented in inspected main source/configuration. Production homepage HTTP headers and HTML were retrieved with curl (200, GitHub/ Fastly headers, no Set-Cookie in that response). The homepage and live sitemap contained no policy routes. The search web tool could not retrieve production. Full browser network behavior, deployment parity, provider account settings and individual live legal routes remain unverified.
The five routes were merged in PR #136; deployment status and production parity have not been independently reverified in this update.

| Technology / status | Purpose and potential data | Processing / retention or deletion | Verification / unresolved questions |
| --- | --- | --- | --- |
| GitHub Pages / configured | Serve HTML, scripts, styles and media; connection IP, URL, time, browser and potentially referrer | Third party; no verified site-specific logging retention or deletion schedule | `.github/workflows`, `public/CNAME`, `docs/DEPLOYMENT.md`; provider account/log access and live behavior unknown |
| Theme / active source | Remember light/dark/system choice, `simpyll-theme` | Browser localStorage; no code expiry, browser clearing removes it; not transmitted by app | `src/theme/bootstrap.js` |
| Scroll restoration / active source | Up to 100 history entries: paths, query, fragment, coordinates, history key | Browser sessionStorage `simpyll-scroll-v1`; normal tab-session lifetime, browser restore can extend it | `src/navigation/RouteNavigation.tsx`; do not put secrets in URLs |
| Search / active source | Download public article index, local query matching | Same-origin index fetch; queries in browser memory, no submission endpoint found | `src/lib/search-index.ts`, search components; hosting sees index request |
| Fonts and scripts / active source | Inter, React and application behavior | Bundled first party assets; normal browser cache, no app deletion schedule | `package.json`, `src/main.tsx`, Vite output; no external font service found |
| Images / active source | Local/optimized media; renderer also accepts external HTTPS images | External image hosts can receive request/connection data; third-party retention unknown | `src/components/mdx`, `scripts/images`, blog MDX; re-audit each new media host, no blanket no-third-party claim |
| Embed and social/source links / active source | External navigation, public correction and editing | Current Embed is link only; destination providers process visits under their policies | MDX components, Footer, `src/lib/contributions.ts`; no executable iframe found |
| GitHub issues/PRs / active external channel | Public username, report text, public page URL/title and contributions | GitHub, repository history and public copies; deletion/retention not promised | `.github/ISSUE_TEMPLATE`, CONTRIBUTING; account required, never send patient data or private requests |
| Notion publisher / configured build integration | Editorial content, author metadata, media; credentialed synchronization | Notion and Actions at publishing time, committed public output; Git history persists | `scripts/sync-notion.mjs`, `scripts/notion`, `.github/workflows`; runtime visitor API absent; provider retention not verified |
| GitHub Actions tests / configured | Build, validation, synthetic browser diagnostics | Build-time; test artifacts configured for 14 days, validated build 1 day; repository history separate | `.github/workflows/validate.yml`; not visitor error telemetry |
| Cookies, analytics, contact forms, newsletters, comments, visitor AI, runtime error reporting / absent in inspected application | No active collection feature found | None introduced by #79; cannot rule out host behavior from source alone | Source/dependencies search; #72/#55 and future integrations require review |
| Clinical tool / planned | Educational NIHSS proposal | Not implemented by this work | #70; validation and rights review needed before release |
| Affiliate/sponsor arrangements / unknown off-site | No tracking integration or arrangement established by source audit | Owner must confirm commercial relationships and adjacent disclosures | #79 owner review; absence of source evidence is not proof of no relationships |

GitHub's general privacy statement was consulted on audit date:
https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
It describes provider processing, not a verified site-specific retention guarantee.

## Approval blockers and follow-up

- Private/non-GitHub contact: simpyll.com@gmail.com, provided by the owner October 25, 2026. Public GitHub corrections remain unsuitable for sensitive requests. Public operator identity and request handling procedures should be reviewed as needed (#55/#83).
- Confirm intended audience, actual AI/editorial workflow, source-checking depth,
  correction handling and commercial interests; draft aspirations are not historical claims.
- Determine applicable law/rights with qualified counsel; approve healthcare boundaries,
  permitted use and reasonable disclaimer language. No governing law, arbitration,
  indemnity, address, business entity or liability cap invented.
- Verify production parity, host logs/access/retention and third-party data practices.
  Select actual retention commitments and rights verification/response procedures.
- Resolve software/content licensing and third-party attribution separately (#88).
  Public repository visibility grants no blanket reuse license.
- Confirm GitHub private vulnerability reporting availability before advertising it as
  verified (#78/#83). Existing template destination alone does not prove availability.
  Never redirect sensitive vulnerability reports to public issues.
- #43 was closed at owner direction without a claim that manual AT/device/real zoom review occurred. Read `docs/ACCESSIBILITY.md` for evidence and limitations; historical CI is not certification of this branch.
- #74 controls must precede executable embeds; #72 privacy review precedes analytics;
  #70 needs separate validation/licensing/legal review; #62 owns article update metadata.

## Validation evidence

Record actual commands/results in the PR. `tests/e2e/legal.spec.ts` covers every policy,
metadata, footer navigation/history, hydration errors, automated axe checks, reflow,
no-JS static content and desktop/mobile screenshot attachments. It runs in the existing
browser gate without another build or dependencies. Emulation is not physical-device,
screen-reader or real browser-zoom verification. CI artifacts hold screenshots.
