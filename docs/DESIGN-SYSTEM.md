# Simpyll design system

[← README](../README.md)

## Scope and audit (issue #52)

The existing editorial dark/mint identity is the baseline. This change reuses
Tailwind v4's CSS-first architecture and existing components; no dependency,
route, rendering, publishing, or deployment change is needed.

| Area | Existing pattern | Decision |
| --- | --- | --- |
| Colors | Canvas `#090b10`, surface `#12151c`, hover `#1b1f28`, mint `#9be8cb` / `#b5f5dc` | Preserve; move values into semantic `--ui-*` roles |
| Text | Foreground `#f5f5f4`, muted `#a1a1aa`, subtle `#71717a` | Preserve first two; raise subtle to `#8b8b95` for small text on all three surfaces |
| Borders | Decorative outline `#292d36` | Preserve; use separate `control-outline` `#71717a` for control boundaries |
| Typography | Inter/system fallback, display and sans families; Tailwind size/weight/line-height scale | Retain; name repeated tracking values and hero line height |
| Spacing | Tailwind's 4px base; container 24/32/48px gutters; sections 96/128px | Preserve; avoid a parallel spacing scale |
| Radii | Buttons 8px, code 12px, cards 16px, badges fully rounded | Explicit `lg` / `xl` / `2xl` theme values; keep `full` |
| Shadows | None in the live UI | Add no elevation or shadow scale until a use case exists |
| Responsive | `sm` 640px, `md` 768px, `lg` 1024px | Keep default rem breakpoints; header gap shrinks only below 360px to fit 320px |
| Motion | 200ms button/prose, 300ms navigation/card; Reveal 0.6s; distinct spring/scroll animations | Share CSS recipe timings; retain existing Motion parameters/staggers |
| Focus | Global 2px mint outline, 4px offset; skip link | Preserve and tokenize; native links/buttons retain keyboard order |
| Components | Button/Card unused; repeated card/tag markup; inline header links | Use Card for project panels, Badge in three locations, NavigationLink in header; retain Container/Reveal |
| Legacy CSS | `src/App.css` is unused Vite starter styling with old variables | Leave outside this system; do not import it |

The intentional visible changes are brighter secondary text and stronger borders
on the existing secondary Button (currently unused on public pages), plus header
spacing below 360px. Layout, sizes, project spring motion, and prose remain intact.

## Tokens and naming

`src/index.css` is the source of truth. `:root` owns semantic role values;
`@theme inline` maps them to Tailwind utilities. Use roles, not palette names:

| Role / CSS property | Utility examples | Meaning |
| --- | --- | --- |
| `--ui-canvas` | `bg-canvas` | Page background |
| `--ui-surface`, `--ui-surface-hover` | `bg-surface`, `hover:bg-surface-hover` | Panels and interactive surface states |
| `--ui-foreground`, `--ui-muted`, `--ui-subtle` | `text-foreground`, `text-muted`, `text-subtle` | Primary, supporting, and secondary text |
| `--ui-outline` | `border-outline`, `divide-outline` | Decorative separators; not sufficient alone to identify a control |
| `--ui-control-outline` | `border-control-outline` | Visible control boundary |
| `--ui-accent`, `--ui-accent-hover` | `text-accent`, `hover:bg-accent-hover` | Brand emphasis and action states |
| `--ui-on-accent` | `text-on-accent` | Text on filled mint actions; independent of page background |
| `--ui-focus` | `outline-focus` | Keyboard focus indicator |

Use `var(--ui-...)` in ordinary CSS, including typography plugin overrides.
The inline aliases intentionally do not promise emitted `--color-*` variables.
Opacity modifiers such as `bg-canvas/85` and `border-accent/50` still work.
Keep foreground/background pairs together when proposing future role changes.

Non-color tokens live in `@theme`: `font-sans`, `font-display`, the standard
spacing/breakpoint/radius scales, `tracking-display` (-0.05em),
`tracking-heading` (-0.04em), `tracking-eyebrow` (0.2em), and `leading-hero` (1.05).
Use Tailwind's existing text sizes (`text-xs` through `text-8xl`) and weights;
new size aliases are unnecessary. Prose retains its existing heading tracking.

CSS recipes use `--ui-duration-fast` (200ms), `--ui-duration-normal` (300ms),
`--ui-ease`, `--ui-focus-width`, and `--ui-focus-offset`. Existing isolated
Motion animations keep numeric seconds/spring settings in their components.
Reduced-motion rules disable transitions/animations and reveal transforms;
hover translation utilities explicitly opt out with `motion-reduce:translate-none`.

### Theme preferences (issue #7)

See [theme architecture, testing and screenshots](THEMES.md). The existing dark
roles remain unchanged; light overrides reuse the same utilities and prose roles.

## Component conventions

Use native elements and native props. Components accept `className` to extend
layout and native attributes (including React 19's `ref` prop). Shared `ui-*`
recipes live in `@layer components`, allowing Tailwind utilities to override
layout. Prefer a named variant for repeated styling rather than conflicting
utility strings. Do not add tab stops or button roles to presentational cards
or badges. A click action belongs in a button; navigation belongs in a link.

```tsx
import { Button } from './components/Button'
import { Card } from './components/Card'
import { Badge } from './components/Badge'
import { NavigationLink } from './components/NavigationLink'

<Button onClick={save}>Save</Button>
<Button variant="secondary" disabled={saving}>Cancel</Button>
<Button type="submit">Publish</Button>

<Card padding="roomy" className="h-full">
  <h2 className="text-2xl font-semibold tracking-tight">Project</h2>
  <Badge>React</Badge>
</Card>

<NavigationLink href="/#work">Projects</NavigationLink>
```

- **Button:** primary/secondary, defaults to `type="button"`; forwards native
  disabled/form/accessibility props. Disabled buttons neither receive Tab focus
  nor acquire active hover fills. Keep accessible names for icon-only uses.
- **Card:** noninteractive `div`, default 24/32px padding; `padding="roomy"`
  preserves project panels' 32/40px spacing. `hoverable` is an optional visual
  treatment, not a claim that the panel is a control. React 19 refs allow
  `motion.create(Card)` without a wrapper or duplicated panel styling.
- **Badge:** noninteractive span for article/project metadata; not a filter or
  status announcement. No extra keyboard stop.
- **NavigationLink:** native document/section anchor with shared underline,
  focus-visible, and hover treatment. Continue using React Router `Link` for
  existing client-side journal navigation; do not replace routing behavior.
- **Container / Reveal:** retain existing APIs and responsive/motion behavior.
- **Input / modal:** no current use case. Add a complete primitive when a real
  feature needs it (input labels/descriptions/errors; modal naming, focus entry,
  trap/restoration, Escape, and scroll behavior), with keyboard tests then.

Do not remove global focus-visible outlines, encode meaning only through color,
or apply opacity to ordinary text. Decorative borders are intentionally subtle;
control boundaries and focus require stronger contrast. Text roles meet 4.5:1
against the supported solid surfaces, and action text meets 4.5:1 against both
accent fills. These checks do not claim conformance for arbitrary translucent
backgrounds or future themes.

## Validation

Run `npm run lint`, `npm run build`, and `npm test`. The production browser
suite runs on desktop and Pixel 7 emulation. `tests/e2e/design-system.spec.ts`
checks contrast pairs, native Button keyboard/form behavior, disabled state,
focus styling, runtime semantic-role propagation (including prose), a 320px
header, and reduced-motion hover behavior. It renders actual primitives into a
test-only fixture; no showcase route or demo content is shipped. Existing tests
cover direct static URLs, hydration/runtime errors, navigation, mobile overflow,
MDX content, and JavaScript-disabled pages.

### Visual comparisons

Captured from production builds at base commit `c09c051` and this branch with
reduced motion and device scale 1. Both versions have identical full-page
geometry: 1440×3291 desktop and 390×4226 mobile. The changed pixels (about 0.15%
desktop / 0.42% mobile) correspond to the secondary text contrast adjustment;
these are review evidence, not a screenshot snapshot test.

| Viewport | Before | After |
| --- | --- | --- |
| Desktop 1440px | [Before](design-system/desktop-before.png) | [After](design-system/desktop-after.png) |
| Mobile 390px | [Before](design-system/mobile-before.png) | [After](design-system/mobile-after.png) |

Local browser validation used temporary Chromium 153 and system ffmpeg because
the pinned Playwright Chromium 156 download returned an invalid archive in the
execution environment. No browser workaround or dependency was added to the
repository; CI retains its pinned Playwright install and configuration.

Motion tokens, progressive entrances and future transition conventions are documented in [MOTION.md](MOTION.md).
