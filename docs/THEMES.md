# Theme support

The header offers a 44px one-click sun/moon toggle. The footer's **Use system
theme** button restores OS tracking. See [circular toggle](THEME-TOGGLE.md) for
animation architecture, reference findings, fallbacks and validation.

## Architecture

- `src/theme/bootstrap.js` is the single controller. Vite embeds it inline after
  the charset declaration, before styles and module scripts. Prerendering copies
  this head into every route and 404 document. There is no network dependency or
  async initialization before theme resolution.
- The controller sets `html[data-theme]` to the resolved light/dark palette and
  `data-theme-preference` to light/dark/system. New visitors default to System;
  invalid saved values also fall back to System. Explicit choices (including
  System) use the `simpyll-theme` localStorage key.
- `matchMedia` updates System live. Local storage events synchronize other tabs,
  including key removal and clear; sessionStorage events are ignored. Reads and
  writes tolerate blocked storage and keep selections in memory for the session.
- `src/theme/store.ts` exposes `useTheme` through React's external-store API.
  A deterministic System server snapshot matches the first hydration render;
  React reconciles the controls after hydration. Colors initialize independently
  outside the hydrated root. Browser APIs are never called by server rendering.
- `src/index.css` owns both palettes. The original dark/mint values are retained;
  the light theme uses pale neutral surfaces and a darker green accent. All live
  components already use semantic tokens. Prose no longer forces inverted roles.
  Current code blocks have no syntax-highlighting engine; code inherits semantic
  foreground/surface colors, preserving readability without adding a dependency.
- Deliberate toggle activations progressively enhance with a circular native view
  transition. Initialization, OS changes and cross-tab updates remain immediate.
  Reduced motion, WebKit and missing APIs also switch immediately.


Without JavaScript, CSS follows the operating system; saved preferences and the
selector require JavaScript. Future charts, dialogs or third-party embeds must
consume these tokens or receive the resolved theme explicitly; none currently
exist in the live app. Native option-popup appearance is platform controlled.
If a Content Security Policy is introduced, allow this inline bootstrap with a
build-generated hash. Do not defer or move it into the React bundle.

## Validation

- `npm run lint` and full production build (including TypeScript) passed.
- 59 Node tests passed: publisher, content, Notion fixture build and prerender/SEO.
- 54 Playwright tests passed across desktop Chromium and Pixel 7 emulation.
- Both palettes pass automated AA text/action contrast and 3:1 focus/control
  boundary checks on canvas, surface and hover surface.
- Theme tests withhold the React bundle on a direct article URL and verify its
  actual background and code-block colors. Additional tests cover persistence,
  OS updates, tabs, invalid values, blocked storage, keyboard, 320px mobile fit,
  reduced motion, layout stability and hydration errors. Existing journeys cover
  published Notion images, MDX, navigation and JavaScript-disabled static routes.

Local validation used available Chromium 153 and system ffmpeg because the pinned
Chromium 156 download returned a truncated archive. No workaround changes the
repository configuration; CI continues using the pinned Playwright browser.

## Screenshots

| View | Light | Dark |
| --- | --- | --- |
| Desktop home | [Light](themes/desktop-light.png) | [Dark](themes/desktop-dark.png) |
| Mobile home | [Light](themes/mobile-light.png) | [Dark](themes/mobile-dark.png) |
| Desktop article/code | [Light](themes/desktop-article-light.png) | [Dark](themes/desktop-article-dark.png) |
| Mobile article/code | [Light](themes/mobile-article-light.png) | [Dark](themes/mobile-article-dark.png) |
