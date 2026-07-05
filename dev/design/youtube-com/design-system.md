# Design System — youtube-com

Captured from: https://youtube.com/ on 2026-07-04 (logged-out home + shorts)

---

## Color Palette

### Light Mode (by frequency, logged-out home)

| Color | Hex | Frequency | Role |
|---|---|---|---|
| rgb(238, 238, 238) | #eeeeee | 90 | border / divider / hairline |
| rgb(15, 15, 15) | #0f0f0f | 69 | primary text (near-black, not pure black) |
| rgb(0, 0, 0) | #000000 | 36 | logo mark / icon fills |
| rgba(0, 0, 0, 0.3) | — | 6 | scrim / overlay |
| rgb(6, 95, 212) | #065fd4 | 4 | accent — links, focus, primary action |
| rgb(239, 239, 239) | #efefef | 4 | secondary surface / hover background |
| rgba(0, 0, 0, 0.6) | — | 4 | secondary text on media |
| rgba(0, 0, 0, 0.2) | — | 2 | subtle overlay |
| rgba(0, 0, 0, 0.05) | — | 1 | tonal rim / inset border |
| rgb(248, 248, 248) | #f8f8f8 | 1 | page background variant |
| rgb(211, 211, 211) | #d3d3d3 | 1 | disabled border |
| rgb(102, 102, 102) | #666666 | 1 | tertiary/muted text |

### Dark Mode

Not captured this run (site was in light mode; toggling requires an authenticated account menu). YouTube's known dark palette uses `#0f0f0f` background / `#f1f1f1` text / same `#065fd4`-family accent — verify live if dark mode is required.

### CSS Custom Properties (sampled from :root — 563 total, this is a representative slice)

```css
:root {
  --paper-checkbox-checked-color: #065fd4;
  --paper-input-container-focus-color: #065fd4;
  --paper-spinner-layer-4-color: #606060;
  --yt-deprecated-black-1-alpha-95: rgba(40,40,40,0.95);
  --yt-deprecated-general-background-b: #fff;
  --yt-deprecated-opalescence-grey: hsl(0,0%,53.3%);
  --yt-deprecated-red-70: #990412;
  --yt-deprecated-white-2: #f9f9f9;
  --yt-deprecated-white-opacity-lighten-1: hsla(0,0%,100%,0.8);
  --yt-deprecated-white-opacity-lighten-4: hsla(0,0%,100%,0.2);
  --yt-live-chat-count-color-early-warning: hsl(40,76%,55%);
  --yt-live-chat-disabled-button-text-color: hsla(0,0%,6.7%,0.4);
  --yt-live-chat-slider-markers-color: #505050;
  --yt-live-chat-tertiary-text-color-inverse: rgba(255,255,255,0.3);
  --yt-live-chat-toast-action-color: #2196f3;
  --yt-live-chat-toast-background-color: hsl(0,0%,20%);
  --yt-sys-color-baseline--assistive-feed-themed-gradient-2: #ffdeff;
  --yt-sys-color-baseline--feed-vibrant-gradient1: #007a65;
  --yt-sys-color-baseline--keyboard-background-emoji: #fff;
  --yt-sys-color-baseline--keyboard-background-key-alt: #dbe2fc;
  --yt-sys-color-baseline--overlay-background-medium-light: rgba(0,0,0,0.3);
  --yt-sys-color-baseline--overlay-solid-wash-inverse: rgba(255,255,255,0.2);
  --yt-sys-color-baseline--overlay-text-primary-inverse: #030303;
  --yt-sys-color-baseline--overlay-tonal-wash: rgba(255,255,255,0.15);
  --yt-sys-color-baseline--raised-background: #fff;
  --yt-sys-color-baseline--static-dark-grey: #333;
  --yt-sys-color-baseline--tonal-rim: rgba(0,0,0,0.05);
  --ytd-grid-2-columns-width: 428px;
  --ytd-neg-margin-10x: -40px;
  --ytd-tab-system-font-size: 1.4rem;
}
```

Note: naming shows two token generations coexisting — legacy `--yt-deprecated-*`/`--paper-*` (Polymer-era, hardcoded hex/hsl) and a newer `--yt-sys-color-baseline--*` semantic system (design-token-style, still light-only values here). Full 563-variable dump is not reproduced; re-run the color extractor `getComputedStyle(document.documentElement)` loop if the complete set is needed.

### Semantic Mapping

| Token | Light Value | Dark Value |
|---|---|---|
| Background | #ffffff / #f9f9f9 | #0f0f0f (per YouTube's known dark theme; not captured live) |
| Foreground | #0f0f0f | #f1f1f1 (not captured live) |
| Primary / Accent | #065fd4 | #3ea6ff (not captured live) |
| Border | #eeeeee | not captured |
| Muted | #666666 | not captured |

---

## Typography

### Font Families

- **Primary:** Roboto (Google Font, self-hosted) — falls back to Arial, sans-serif
- **Fallback/legacy:** Arial (used directly on some legacy button internals)
- **Emoji/CJK:** "YouTube Noto" (custom-named Noto fallback stack)

### Root Scaling

`html { font-size: 62.5%; font-family: Roboto, Arial, sans-serif; }` → `1rem = 10px`. Components then size in rem (e.g. `1.4rem` = 14px body, `1.6rem` = 16px search input) for a consistent app-wide type scale independent of browser zoom quirks.

### Type Scale (sampled)

| Role | Font | Size | Weight | Line Height | Color |
|---|---|---|---|---|---|
| Search input | Roboto, Arial | 16px (1.6rem) | 400 | normal | #0f0f0f |
| Nav / masthead links | Roboto, Arial | 14px (1.4rem) base | 400 | normal | #0f0f0f |
| Button (legacy internals) | Arial | 13.3px | 400 | 0 (icon-only contexts) | #0f0f0f |
| Tab system font | Roboto, Arial | 1.4rem (14px) | 400 | normal | #0f0f0f |

Most weight variation in the live product comes from `font-weight: 500` on titles/emphasis — not surfaced on this logged-out shell since no video cards rendered. Assume 400 body / 500 emphasis / no italic use.

---

## Spacing Scale

Top values by frequency (from layout containers, div/section level):

`8px` (×13), `0px 8px` (×9), `20px 0 0` (×4), `24px 0 0` (×3), `12px 0 0` (×3), `4px 0 0` (×3), `0px 16px` (×3), `0 0 0 4px` (×3), `0 0 0 16px` (×2), `0 0 12px` (×2)

Reads as an 4/8px base grid: 4, 8, 12, 16, 20, 24 — standard 4px-increment spacing, no oddball values.

---

## Border Radii

| Value | Usage count | Used on |
|---|---|---|
| 50% | 9 | avatars, icon buttons, circular action buttons |
| 40px | 2 | pill buttons / search bar (height-matched full pill) |
| 28px | 2 | mid-size pill buttons (chips, filter pills) |
| 20px | 2 | subscribe button, smaller pills |
| 8px | 2 | cards, thumbnails, dropdown menus |
| 6px | 1 | small chips |
| 4px | 1 | tooltips |
| 2px | 3 | inputs, minor controls |

Shape language: perfect circle for anything icon/avatar-sized, full pill for anything button/input-height-sized, `8px` for anything card/thumbnail-sized. No sharp corners anywhere in the chrome.

---

## Shadows

```css
/* Shadow scale (by frequency) */
rgba(0,0,0,0.2) 0 8px 23px 0;                                            /* 2 uses — dropdown menus, mini-player (largest elevation) */
rgba(0,0,0,0.16) 0 2px 5px 0, rgba(0,0,0,0.2) 0 3px 6px 0;               /* 1 use  — floating action surface */
rgb(238,238,238) 0 1px 2px 0 inset;                                       /* 1 use  — inset hairline (search bar depression) */
rgba(0,0,0,0.2) 0 2px 4px 0;                                              /* 1 use  — low elevation card */
rgba(0,0,0,0.14) 0 2px 2px 0, rgba(0,0,0,0.12) 0 1px 5px 0, rgba(0,0,0,0.2) 0 3px 1px -2px; /* 1 use — Material-style triple-layer shadow (legacy paper-elevation) */
```

Shadows are reserved for transient/floating surfaces only (menus, mini-player, tooltips). Cards and the main grid use a flat `1px solid #eee` border instead — zero elevation for persistent content.

---

## Layout Patterns

- **Container max-width:** full-bleed grid, no centered max-width container (uses `--ytd-grid-2-columns-width: 428px` per-column sizing instead)
- **Column system:** CSS Grid-driven video grid with named width tokens per column count (`--ytd-grid-2-columns-width`, etc. — implies 1–6 column responsive breakpoints)
- **Gutter:** 16px typical between grid items
- **Page padding:** left rail (mini-guide) is a fixed ~72px icon-only column at this breakpoint; content area is fluid
- **Section padding (vertical):** 20–24px between stacked sections
