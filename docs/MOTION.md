# Motion design system

Motion supports state, hierarchy and feedback without changing Simpyll's visual identity.
`src/index.css` is the source of truth. CSS is the default; the existing Reveal
uses a small WAAPI enhancement in `src/motion/reveal.ts`. No dependency was added.
The installed `motion` dependency is retained for compatibility but no longer
ships in the current application bundle because these simple effects use native APIs.

## Audit and reference

At baseline `61ed6b6`, #52 supplies semantic UI recipes and #7 supplies a synchronous
head bootstrap plus a React external store for Light/Dark/System. Neither needs
replacement. React Router v6 has no transition wrapper. Vite builds client and SSR
bundles, then prerenders every MDX route and the 404 for GitHub Pages.

Previously: CSS used 200/300ms with generic `ease`; Reveal had a hidden server
initial state, 600ms entrance and per-call delays; project/hero hover used different
300-stiffness springs (22/18 damping); a scroll arrow looped forever. Links animated
`gap`, and some arrows used `transition-all`. App.css is unimported Vite starter
CSS, not part of the live design system. There is no code-highlighting animation.
Existing tests cover production routing, keyboard controls, themes, content and SSR.

Reference studied: [Eric Wu's motion module](https://github.com/itsEricWu/ericwu.me/blob/2275b3d02b398359e30d90b997e22e1ab2396174/lib/motion.ts),
[site navigation](https://github.com/itsEricWu/ericwu.me/blob/2275b3d02b398359e30d90b997e22e1ab2396174/components/nav/site-nav.tsx)
and [theme transition](https://github.com/itsEricWu/ericwu.me/blob/2275b3d02b398359e30d90b997e22e1ab2396174/lib/theme-transition.ts).
It groups spring physics by feedback/layout/expressive intent, generates sampled
CSS linear() curves, and uses WAAPI for indicator transforms. Simpyll adapts the
shared vocabulary and native animation approach with a restrained spring-inspired
Bezier. It does not copy liquid stretch, drag behavior, runtime physics generation,
or the Next.js architecture. The live reference URL could not be retrieved in this
environment; observations above are from source, not a visual inspection.

## Tokens

| CSS variable | Value | Use |
| --- | --- | --- |
| `--ui-duration-instant` | 0ms | Essential state / fallback |
| `--ui-duration-fast` | 160ms | Hover, press, color |
| `--ui-duration-normal` | 240ms | Controls, menus |
| `--ui-duration-deliberate` | 360ms | Cards, navigation |
| `--ui-duration-expressive` | 600ms | Selected content entrances |
| `--ui-ease-standard` | (0.2, 0, 0, 1) | General feedback |
| `--ui-ease-emphasized` | (0.65, 0, 0.35, 1) | Intentional showcase change |
| `--ui-ease-entrance` | (0.22, 1, 0.36, 1) | Incoming content |
| `--ui-ease-exit` | (0.4, 0, 1, 1) | Departing content |
| `--ui-ease-decelerate` | (0, 0, 0.2, 1) | Smooth settling |
| `--ui-ease-spring` | (0.2, 0.9, 0.25, 1.05) | Restrained spatial overshoot |
| `--ui-motion-lift` | -4px | Existing card/hero lift |
| `--ui-motion-press` | 0.98 | Native button press |
| `--ui-motion-reveal` | 24px | Existing entrance distance |
| `--ui-motion-stagger` | 120ms | Bounded group timing |

All easing tuples are cubic-bezier(). Spring is an approximation, not a physical
simulation: use it for transforms, not opacity. Legacy `--ui-ease` remains an alias.
Tailwind's default transition duration/easing reference semantic tokens; named
`ease-standard`, `ease-emphasized`, `ease-entrance`, `ease-exit`, `ease-spring`
utilities are available. Use `duration-(--ui-duration-normal)` for explicit intent.

## Recipes

- Button: native `Button` retains focus, disabled/form semantics, immediate outline
  and a small active scale. No hover-only information or keyboard delay.
- Card: `Card hoverable` uses translate, border and background, without moving the
  layout box. Lift is limited to fine-pointer hover. A card remains a container;
  only add focusability when it has an actual semantic action.
- Navigation: `.ui-nav-link` animates its underline with spring-inspired transform;
  `aria-current="page"` keeps it visible for active links. Existing section anchors
  stay native. There is no route tracking or floating shared pill in this change.
- Entrance: `<Reveal staggerIndex={index}>…</Reveal>` retains the existing once-only
  viewport behavior. Index is clamped to 0–4 (maximum 480ms stagger). Legacy delay
  accepts seconds for compatibility; new callers should use index. Server markup
  has no hidden style. WAAPI applies backwards fill only during the finite entrance,
  then returns to visible base styles. Missing APIs or thrown animation calls leave
  content visible. Each existing wrapper owns one observer, disconnected on reveal
  or unmount; media-query listener and in-flight animation are cleaned up on unmount.
- Links: animate explicit properties. Use color feedback rather than animating gap
  or dimensions. Do not add permanent `will-change` layers.

## Accessibility and performance

Reduced motion zeroes duration, distance, stagger and press tokens, disables CSS
animations/transitions and smooth scrolling, and preserves immediate focus/state
feedback. JS reads the preference before starting; live changes cancel pending and
active reveals. Switching back does not replay a cancelled reveal. Do not rely on
animation completion to reveal content, navigate, focus, or save preferences. CSS
base styles must always describe the usable final state. Test unavailable APIs,
JavaScript disabled, keyboard, touch and live preference changes.

Use CSS for state feedback and simple transforms/opacity; WAAPI only for imperative
keyframes or cancellation. Read timing/easing from computed tokens at invocation,
never cache them across preference changes. An existing library is justified only
for actual layout orchestration, not a single hover. Avoid layout animation,
continuous RAF loops, unbounded stagger and global theme-color fades. A restrained
one-time entrance is appropriate; looping decorative motion or animating all article
headings is not. Visual transforms do not alter document flow.

## Integration contract for future issues

| Issue | Reuse and boundaries |
| --- | --- |
| #19 bento | Card tokens and bounded stagger; preserve DOM reading order; FLIP only for actual user-driven layout changes. |
| #21 cards | Existing lift/press vocabulary; future tilt must be capped, fine-pointer only, cancellable and absent under reduced motion. |
| #22 pages | Progressive native View Transitions; unique stable shared names on matching elements only; keep history, focus, scroll and instant fallback. |
| #23 scroll | Extend the existing Reveal, rather than stacking observers; no new text-splitting or scroll timeline engine here. |
| #51 navigation | Reuse deliberate/spring for a future active indicator; preserve aria-current, touch targets, drawer focus and Escape. |
| #93 themes | Keep #7 bootstrap/store; expressive/emphasized is available for a future reveal; reduced motion and unsupported browsers apply state instantly. |

Do not assign view-transition-name globally or start view transitions in this
foundation. #22 and #93 should coordinate a single owner for document transitions,
settle/skip an in-flight transition before starting another, handle ready/finished
rejections, and apply state even on failure. Route shared names must not collide
with the theme root snapshot. Avoid snapshots during initial hydration. Theme
bootstrap remains synchronous and never waits for an animation. These are conventions,
not an unneeded transition manager ahead of those implementations.

## Validation and bundle impact

- Production build, TypeScript and static prerender: passed (five routes + 404).
- ESLint: passed. Node suite: 64 passed, including five reveal lifecycle/fallback tests.
- Full desktop/Pixel 7 Playwright suite: 64 passed, including 10 motion cases.
- Browser checks cover full/reduced motion, live preference changes, no-JS visible
  HTML, missing APIs, hydration, unchanged sibling layout, keyboard focus, themes
  and existing routing. Node checks cover listener/observer/animation cleanup.
- Pinned Chromium 156 download was truncated. Local tests used Chromium 153 from
  a temporary serverless package with video disabled; no local workaround or new
  dependency is committed. CI retains the repository's pinned browser settings.

Same Node 24/Vite 8 production builds of baseline `61ed6b6` and this change:

| Asset | Before | After | Gzip before | Gzip after |
| --- | ---: | ---: | ---: | ---: |
| Client JS | 423.97 KB | 292.53 KB | 134.02 KB | 91.10 KB |
| CSS | 41.14 KB | 42.74 KB | 7.69 KB | 8.05 KB |

This reduces compressed initial JS by 42.92 KB (~32%). Transform/opacity entrances
have no persistent fill or layers; observers disconnect once used. Sibling layout
is unchanged by card lift. These are bundle and browser-layout measurements, not
field Core Web Vitals or a claim about every device's frame rate. Real-device
profiling remains appropriate when the deferred immersive features are added.

Visual review: [desktop card hover](motion/desktop-card-hover.png),
[mobile reduced motion](motion/mobile-reduced-motion.png). Static screenshots show
appearance at rest/hover; automated checks exercise timing and reduced motion.
