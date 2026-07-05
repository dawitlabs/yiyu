---
slug: youtube-com
source_url: https://youtube.com/
captured_at: 2026-07-04
framework: Polymer 3 / Lit web components (Google internal "Kennedy" design system)
css: Custom CSS variables (--yt-sys-color-*, --paper-*), no Tailwind/Bootstrap
icons: Custom SVGs (YouTube icon set, via yt-icon/iron-iconset-svg)
animation_lib: CSS-only (no Framer/GSAP/Lenis detected)
---

# YouTube

> **Source:** https://youtube.com/
> **Captured:** 2026-07-04
> **Routes captured:** 2 (home, shorts) — logged-out state

## Aesthetic

YouTube's logged-out shell is aggressively minimal and utilitarian: a pure white (`#fff`)/off-white (`#f9f9f9`) canvas, near-black text (`#0f0f0f`, not true black) and a single saturated accent — the signature red on the logo mark plus a cobalt blue (`#065fd4`) reserved for links, focus rings, and the subscribe/primary-action state. There is no gradient, no drop-shadow bravado, no decorative color anywhere in the chrome — every ounce of visual interest is deliberately pushed down into the thumbnail/video content itself, so the UI reads as an invisible frame.

Typography is system-first: Roboto with Arial fallback, sized off a `62.5%` root (`10px` = `1rem`), so every component author works in clean `1.4rem`/`1.6rem` steps rather than raw pixels — a classic large-scale-web-app trick for consistent rem-based scaling across a codebase this old. Weight stays at 400 almost everywhere; hierarchy comes from size and color-on-white contrast, not boldness.

Shape language is pill-and-circle: avatars and icon buttons are `border-radius: 50%`, search bars and CTAs round to `20px`–`40px` (fully pill at their height), and cards/thumbnails get a modest `8px`. Elevation is used sparingly and only for transient surfaces — dropdown menus and the mini-player get a soft `0 8px 23px rgba(0,0,0,.2)`, everything else sits flat with a hairline `#eee` border instead of a shadow. Motion is fast and utilitarian: 100–250ms opacity/color/transform transitions on cubic-bezier easing, no springy overshoot — built for a UI where thousands of rows repaint per session, not for cinematic flourish. The overall tone is "get out of the way of the video": an editorially neutral, high-density, extremely well-worn system optimized for information scanning rather than brand theater.

## Quick Facts

| Property | Value |
|---|---|
| Framework | Polymer 3 / LitElement web components (`ytd-*`, `yt-*`, `tp-yt-*`, `iron-*` custom elements) |
| CSS | Hand-rolled CSS custom properties, ~560 `--yt-*`/`--paper-*` tokens, no utility framework |
| UI Library | Google's internal "Kennedy"/Material-derived component set (not public shadcn/MUI/Chakra) |
| Icons | Custom SVG icon set via `<yt-icon>` / `iron-iconset-svg`, no Phosphor/Heroicons/Lucide |
| Animation | CSS transitions only — no Framer Motion / GSAP / Lenis / AOS detected |
| Scroll | Native scroll, no scroll-hijack library |
| CMS | None (product app, not a marketing CMS site) |
| Bundler | Google internal (closure-compiled), not Vite/webpack/Turbopack |
| Dark Mode | `dark` attribute on `<html>` (toggled by user setting; not `prefers-color-scheme` driven) |
| Routes captured | 2 (`/` home feed, `/shorts` vertical player) — logged out, no personalized/account content |
| Screenshots | Home: desktop + attempted mobile (viewport override did not take — see note); Shorts: desktop |

## Archive Contents

- [`design-system.md`](design-system.md) — Colors, typography, spacing, radii, shadows
- [`components.md`](components.md) — Component pattern recipes (masthead, search, sidebar, shorts player)
- [`animations.md`](animations.md) — Motion patterns and timings
- [`tech-stack.md`](tech-stack.md) — Full technical stack report
- [`routes.md`](routes.md) — Discovered/captured routes
- `screenshots/` — Desktop captures per route
- `raw/` — Full HTML + CSS snapshot of the home route (large: ~1MB HTML, ~3.7MB CSS — forensic reference only)

## Capture Notes / Limitations

- Captured logged-out. The home feed shows no video recommendations in this state ("Try searching to get started") — this is expected and does not affect the design-system extraction, which targets chrome (masthead, nav, search, cards), not content.
- `/feed/subscriptions` and `/feed/you` require sign-in and were not captured (would just show a login wall, no design signal).
- Mobile viewport override (`375×812`) did not apply via the browser tool's `extraArgs`; only desktop (1280px) screenshots were captured. Re-run with a tool that supports explicit viewport resize if mobile-specific layout is needed — YouTube's actual mobile web experience (`m.youtube.com`) uses a materially different single-column layout not captured here.
- Route discovery capped at what's reachable from the logged-out home page (4 links found; 2 captured, 2 gated behind auth).

## Apply This Design

Run `/design` in any project, search for `youtube-com`, and apply.
