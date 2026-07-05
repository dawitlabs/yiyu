# Tech Stack — youtube-com

Captured from: https://youtube.com/ on 2026-07-04

---

## Detected Stack

```
Framework:     Polymer 3 / LitElement web components (Google-internal "Kennedy" system) — not React/Next/Vue/Svelte
Styling:       Hand-authored CSS custom properties (~560 --yt-*/--paper-* vars), no utility framework
UI Library:    Google-internal component set (ytd-*, yt-*, tp-yt-paper-*, iron-*) — not a public library
Animation:     CSS transitions only — no Framer Motion / GSAP / Lenis / AOS / Motion One
Scroll:        Native browser scroll
Icons:         Custom SVG icon set via <yt-icon> + iron-iconset-svg, not Phosphor/Heroicons/Lucide/FontAwesome
CMS:           None — dynamic product application
Bundler:       Google-internal (Closure Compiler-based), not Vite/webpack/Turbopack
Hosting:       Google infrastructure
Dark mode:     `dark` boolean attribute on <html> (user-setting driven, not prefers-color-scheme)
```

## Signal Evidence

- `document.querySelector('ytd-app')` truthy → confirms the Polymer/Lit "ytd-app" shell root
- Custom element tags present: `ytd-masthead`, `ytd-mini-guide-renderer`, `yt-icon`, `yt-icon-button`, `tp-yt-paper-tooltip`, `tp-yt-app-drawer`, `iron-iconset-svg`, `iron-media-query`, `yt-button-shape`, `yt-touch-feedback-shape`, `ytd-lottie-player` (Lottie used for a small yoodle/logo animation, not general UI motion)
- `<html>` attributes: `darker-dark-theme`, `system-icons`, `color-version="v2_0"`, `typography`, `typography-spacing` — internal Google feature-flag/build attributes, not framework signals
- Root inline style: `font-size: 62.5%; font-family: Roboto, Arial, sans-serif;` → confirms rem-based 10px root scaling
- 563 CSS custom properties on `:root` matching `--yt-*`/`--paper-*` prefixes → confirms a mature internal design-token system, split between legacy `--yt-deprecated-*` hardcoded values and newer `--yt-sys-color-baseline--*` semantic tokens
- No `window.__NEXT_DATA__`, no Tailwind utility class patterns, no `[data-framer-*]`, no `window.gsap` → rules out the common public-stack signals

## Implications for Applying This Design

- This is **not a stack you can literally npm-install** — there's no public "YouTube design system" package. Treat this archive as a **visual/behavioral reference only**: recreate the tokens, spacing, radii, and motion timing in your own stack (Tailwind `@theme`, CSS variables, etc.) rather than trying to import YouTube's actual components.
- Font: Roboto → `next/font/google` or `@fontsource/roboto`, fallback Arial.
- Color tokens: port the sampled hex/rgba values into your own `@theme`/`:root` block; the accent blue is `#065fd4` (light) — verify a dark-mode equivalent (`#3ea6ff`-family) independently before shipping dark mode, since it wasn't captured live.
- Icons: this uses a bespoke SVG set — substitute Lucide/Heroicons/Phosphor at similar 24px sizing and stroke weight; don't attempt to extract YouTube's actual icon SVGs for reuse (proprietary asset).
- Shape system: circle for icon/avatar-sized elements, full pill for button/input-height elements, `8px` radius for cards — straightforward to replicate with 2–3 radius tokens.
- Motion: CSS-only, 100–300ms, Material's standard/accelerate/decelerate cubic-beziers — no animation library dependency needed to match the feel.
