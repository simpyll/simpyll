# Issue #64 implementation audit

Audited main `a3b6b51eab2980225191e73dce59affa239e2cd9` (October 26, 2026).
Issue #64 remains open. GitHub PR searches for issue number/title/preview and
local merged history/affected-file history found no implementation of private
draft preview. The open-PR query returned no results at audit time.

Reused merged #167/#65 block safety and image accessibility, #166/#84 recovery,
#105 shared rich MDX rendering, and the existing identity/slug registry, content
validator, image optimizer, public generators and prerenderer. Inspected
sync-notion, publisher/manifest/ownership/recovery, Notion build fixtures,
validate-content, prerender, source article content, BlogPost/shared mapping,
Vite/MDX configuration and NOTION/MDX/IMAGES/recovery documentation.

The publisher already queries Published only, skips Draft/Ready/archived/trashed
pages and rechecks authorized status/revision after reading blocks. Preview calls
only GET page/block endpoints and never invokes synchronize. Existing production
manifest/ownership/recovery contracts remain unchanged. The only publisher change
exports the existing image-host predicate to prevent duplicating its rules.

Audited all workflow files for secret access, content commits, upload paths,
caches, branch triggers and manual dispatch. No real preview job is introduced.
notion-publish already has a main-only gate, main checkout and explicit dry-run
manual default. PR validation has read-only permissions and synthetic fixtures;
its artifact/cache paths are repository build/test paths, not OS temporary
preview workspaces. Deploy previously accepted manual feature-branch dispatch;
its build now requires the main ref and verifies checkout ancestry against
origin/main, including reusable-workflow input revisions. Deployment/upload jobs
already depend on successful build. No workflow consumes preview artifacts.

Architecture: create owner-only OS temporary workspace; clone independent local
Git history; copy trusted production inputs/dependencies without source content
symlinks; fetch one explicitly selected active Draft/Ready page; apply existing
metadata, route conflict checks and escaped converter; recheck revision/status;
write private-only MDX/media; run exact production build with a stripped child
environment; serve dist with a loopback-only static server. The preview indicator
is inserted into the copied article shell so SSR and hydration agree; no production
UI/component is modified. Cleanup owns the workspace across success/failure and
signals. See NOTION.md for residual crash/browser/OS limitations.

Validation includes deterministic access/status/escaping/unsafe URL/invalid slug,
manifest/content preservation, server traversal/host/method restrictions,
owner-only directory permissions, cleanup and main/CI gate tests. The real build
fixture hashes source inputs, media, public registries and dist before and after
private generation; these remain identical. It verifies real prerendered article
metadata, body, heading, optimized image/caption and preview indicator.

Local production build, TypeScript, lint and focused regression suites passed.
The real private-build fixture passed. The first isolation run overlapped a normal
production build, correctly detected those concurrent output writes, and was
rerun after the normal build completed. The test now runs serially in the CI
fixture job. No assertions or rules were disabled.

Remaining manual verification: live authorized Notion page/token (no live private
content was accessed), physical mobile/SSH review, screen reader and browser
hydration/print review of the new local preview server. Browser binaries are not
installed in this environment. Existing production renderer browser suites remain
in CI; no passing CI results are claimed before the dedicated PR runs. Build
errors intentionally withhold raw output to protect private prose; detailed
line-level draft diagnostics are a known limitation. These gaps are why this PR
references rather than closes #64.
