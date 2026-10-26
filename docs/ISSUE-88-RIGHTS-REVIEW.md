# Issue 88: preliminary rights review

Baseline: main 670f7375f184ecf1d4219c93d5da8d3e08afc1bb, October 26, 2026. This is an incomplete review, not a license grant or a legal conclusion.

## Findings

- Missing: root LICENSE and package license declaration; source license approved by owner is MIT. The copyright notice identity still requires explicit owner confirmation. Repository creation was in 2026.
- Existing: public terms distinguish code, articles, images and third-party material and state that public visibility is not a reuse license; docs/LEGAL.md tracks issue 88. Do not replace these without reconciling their purpose.
- Existing: article metadata identifies David Becker as an author in at least one article; that alone does not establish ownership of all software.
- Editorial text: owner directs all rights reserved for original articles unless a work explicitly states otherwise. An individual exception requires the relevant rights holder's explicit authorization; citations and links do not grant reproduction rights.
- NIHSS: issue #70 is a planned tool. No blanket license or public-domain conclusion is established. Review each instrument, text, diagram and training asset and obtain a rights basis before reuse. Distinguish facts from expression; do not infer fair use.
- Brand family under public/: public/README.md describes uploaded branding artwork and derived favicons, OG image and logos. Origin, creator, permission, redistribution and AI provenance remain unverified; public/ files are copied as static assets in normal Vite builds. Do not label them MIT.
- Notion image files under public/images/notion/: local redistribution via public build; creator, source, permission, attribution and license not established. Review article source and permissions.
- public/images/simpyll-architecture.svg and .png, src/assets/hero.png, other site imagery, generated images, screenshots in docs/ and any external article images: provenance and rights need review. Build inclusion must be verified for each; do not infer it from a path.
- src/assets/react.svg and vite.svg appear to depict third-party marks. Their provenance, license and any trademark conditions need verification, including whether included in a build.
- Inter is a dependency in package.json; license text and redistribution notices need verification against the installed package and authoritative upstream. No determination for the remaining dependency tree has been made.
- The Notion publisher can bring external content and media into a public repository; publication status, citation or attribution is not evidence of rights. Review each item before publication.

## Remaining work

Confirm the copyright identity; audit the full asset and dependency inventories and existing article licenses; implement canonical MIT text with a precise scope explanation, package metadata, contributor terms, public policy and attribution; add targeted tests and run the complete validation and CI. Document unresolved permissions and avoid closing issue 88 until reviewed. Related: #70, #79, #82, #89.
