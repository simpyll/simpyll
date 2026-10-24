# Simpyll brand asset integration

This package preserves the uploaded branding artwork and fixes the misleading dimensions of several favicon-named source images (they were 1536×1536 rather than 16/32/48 px).

## Usage
1. Extract this package.
2. In the **Simpyll repository root**, run `python3 /path/to/simpyll-brand-integration/apply.py`.
3. Run `npm run build`, `npm run lint`, and relevant tests.
4. Inspect browser tab icons, Android and Apple home-screen icons, social previews, and static HTML.
5. Commit to a feature branch and open a pull request.

## Mappings
- `icon.svg`: primary SVG browser icon, replacing the old purple Vite favicon.
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`: legacy/browser fallback icons.
- `apple-touch-icon.png`: 180×180 iOS home-screen icon.
- `android-chrome-*`: 192×192 and 512×512 Android/PWA icons.
- `site.webmanifest`: PWA icon and theme metadata.
- `og-image.png`: 1200×630 default Open Graph/Twitter social preview. Existing per-article custom images remain supported.
- `simpyll-wordmark.jpg`: supplied full horizontal wordmark artwork for editorial or branding usage (not forced into floating navigation).
- `icon-transparent-*`: transparent logo marks for adaptive themes and future UI placement.
- `logo-*-square-*`, `logo-rounded-badge-*`: optional square branded artwork.
- `safari-pinned-tab.svg`: available for Safari pinned-tab usage; inspect color compatibility before wiring.

## Notes
The logo variants are intentionally not all inserted into the header; doing so without adjusting navigation measurements can cause regressions. The supplied 16/32/48 favicon PNGs are downscaled to their correct output dimensions. The source image artwork remains otherwise unmodified. The favicon.ico original is included.
