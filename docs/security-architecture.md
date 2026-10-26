# Security architecture and outstanding work

Audit baseline: main at 9a0cd0c, 26 October 2026. This is a partial audit, not a certification. Issue #78 remains open until the remaining checks below are completed.

## Trust boundaries and controls

Repository-authored MDX is trusted executable build input; review changes before merge. Notion data crosses a separate boundary: the publisher escapes text into MDX expressions, validates URLs, limits recursive blocks, rejects private nested pages and unsupported blocks, and validates generated output before committing publisher-owned paths. Its tests cover unsafe rich blocks, links, redirects and recovery. Published content is public; never enter patient information or secrets in content. Draft preview is local-only, isolated in a temporary copy, uses a loopback server and sets its own CSP, no-store and noindex headers. Review the preview and publisher tests when changing these boundaries.

The MDX link component validates protocols and applies `noopener noreferrer` to new-tab links. JSON embedded by Explore and Pulse escapes `<` before insertion. Contact posts to the public Formspree endpoint; it is not a secret. The form warns against patient data and passwords. The honeypot discards locally and reports an error instead of claiming submission. Formspree and email recipients receive submitted data. Formshield may silently classify submissions as spam; HTTP success is not proof of delivery. CAPTCHA has not been verified end-to-end for the current AJAX integration; a real controlled owner test is needed. Avoid logging message bodies or provider responses.

Workflows use explicit permissions and the Notion job restricts publishing to main and commits designated paths. Third-party actions are referenced by mutable version tags rather than full commit SHAs; review pinning and automated dependency updates alongside #82. A complete workflow privilege, artifact and cache audit remains necessary. Never put integration tokens in browser variables, committed files, or artifacts.

## Hosting and CSP

An HTTPS HEAD request to https://simpyll.com on 26 October returned no CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, Cross-Origin-Opener-Policy or Cross-Origin-Resource-Policy headers. This observation covers that response only; verify other routes and redirects independently. GitHub Pages does not offer arbitrary response header configuration; a `_headers` file would not enforce these controls. A programmable proxy or different host could provide them, at the cost of infrastructure, configuration and operational complexity. No migration is proposed here.

A CSP meta tag can enforce supported directives after the browser encounters it, but cannot supply frame-ancestors, sandbox, reporting or report-only policy. It cannot replace HSTS, X-Content-Type-Options, Permissions-Policy, COOP, CORP or X-Frame-Options. No production CSP is deployed by this change. A safe candidate needs a production asset inventory and browser verification: the theme bootstrap is inline, structured data and JSON are embedded, style attributes and external images exist, and Formspree and analytics must remain functional. Static hashes can cover stable inline scripts, but per-response nonces require a server that generates fresh values. Test prerendered routes, 404, themes, navigation, hydration, Formspree and all integrations before enforcing any policy; a restrictive policy without these tests can break the site. Frame embedding protection requires an HTTP response header.

## Residual verification

- Audit every untrusted data flow, generated artifact and workflow, including secret and draft exclusion; existing tests do not prove all possible inputs safe.
- Verify the live Formspree CAPTCHA and actual delivery in a controlled owner test without patient or confidential data. Investigate failed submissions and spam filtering without publishing message contents.
- Inventory actual external request origins and inline execution/style requirements; test a proposed CSP in a representative browser before deployment.
- Run the complete CI, production build and browser suites; check final results and investigate failures. Check production response headers after deployment changes.
- Review infrastructure-based headers and action SHA pinning as separate changes, with ownership and update procedures.
