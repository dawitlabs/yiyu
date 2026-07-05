# Component Patterns — youtube-com

Extracted from the live site (logged-out). YouTube's actual markup is deep Shadow DOM
(Polymer/Lit custom elements), so computed styles on host elements often read as
transparent/inherited — the real paint happens inside each component's shadow root.
Values below are cross-checked against the rendered screenshots.

---

## Navigation / Masthead

**Detected selector:** `ytd-masthead`
**Position:** static (not sticky at this breakpoint in logged-out state — product build typically makes it sticky/fixed once scrolled)
**Background:** `#fff` (light)
**Height:** 56px
**Border:** none on the host; a 1px `#eee` hairline renders at the shadow-root level under the masthead in the live product

**Child structure:**
```
ytd-masthead
├── div (start) — hamburger menu button + logo
│   ├── button (hamburger, ☰) — 24px icon, circular hover state
│   └── ytd-topbar-logo-renderer > ytd-logo — YouTube wordmark, red play-icon mark
├── div (center) — search
│   ├── ytd-searchbox
│   │   ├── input#search — 16px text, transparent bg, no border on host
│   │   └── button (search submit) — light grey pill, right-rounded
│   └── button (mic / voice search) — circular grey chip, 40px
└── div (end) — actions
    ├── button (create / +) 
    ├── ytd-topbar-menu-button-renderer (apps grid, notifications)
    └── "Sign in" pill button — 1px #065fd4 border, blue text, rounded-full, icon + label
```

**Key computed styles:**
```css
ytd-masthead {
  height: 56px;
  background-color: transparent; /* actual white paint is on an inner shadow div */
}
input#search {
  font-size: 16px;
  height: 22px;
  border: none; /* border lives on the wrapping pill container, ~1px #ccc, radius ~20px 0 0 20px */
}
```

---

## Left Rail / Mini Guide

**Detected selector:** `ytd-mini-guide-renderer` (icon-only collapsed sidebar, logged-out default)
**Width:** ~72px (icon + label stacked)
**Background:** transparent host / `#fff` effective

**Child structure:**
```
ytd-mini-guide-renderer
├── ytd-mini-guide-entry-renderer (Home)   — house icon, 24px, label 10px below
├── ytd-mini-guide-entry-renderer (Shorts) — bolt/shorts icon
├── ytd-mini-guide-entry-renderer (Subscriptions) — subscriptions icon
└── ytd-mini-guide-entry-renderer (You)    — circular profile icon
```

Each entry: icon centered, 24px, label in 10px Roboto below, active state = filled icon variant, hover = full-width light-grey (`#eee`-family) rounded rect behind icon+label.

---

## Home Feed / Content Area (logged-out)

**Detected selector:** `#content` main region
**State captured:** empty feed — "Try searching to get started" card (no video grid rendered without an account signal)

**Structure:**
```
#content
└── card (centered, ~700px wide, white bg, subtle shadow, ~8px radius)
    ├── h1-equivalent — "Try searching to get started", ~20px, weight 500/600, #0f0f0f
    └── p — "Start watching videos to help us build a feed of videos you'll love.", ~14px, #606060
```

This is an empty-state pattern, not the real video grid — flag this if reusing: the actual authenticated home feed is a CSS-grid of `ytd-rich-item-renderer` cards (16:9 thumbnail, `8px` radius, channel avatar circle 24–32px, two-line title at 14px/500, metadata line at 12px/#606060).

---

## Shorts Player (`/shorts`)

**Detected via screenshot** (vertical player is heavily canvas/video-rendered, most styling in shadow DOM)

**Structure:**
```
shorts player (full-height column, ~9:16 aspect video centered)
├── video surface — rounded ~12px corners, black letterbox either side on wide viewports
├── right-side action rail (floating, transparent bg, stacked)
│   ├── circular avatar (channel), ~48px
│   ├── like button — circle icon + count label below (14px, white-on-dark context / #0f0f0f on light chrome)
│   ├── comment button — circle icon + count
│   ├── share button — circle icon, label "Share"
│   └── "Remix" — circle icon, label "Remix"
├── bottom-left overlay — @handle + pill "Subscribe" button (black bg, white text, full pill, ~14px/500) + title line
└── bottom-right / center — floating "↓" scroll-to-next chip, circular, light-grey bg, subtle shadow
```

Action buttons follow the same circle-icon + text-label-below pattern as the mini-guide — a consistent "icon on top, tiny label under" convention reused across the whole product (nav rail, shorts actions, masthead icon buttons).

---

## Buttons — General Recipe (cross-referenced from radii/shadow data)

| Variant | Shape | Example |
|---|---|---|
| Primary / Subscribe | Full pill (`20–40px` radius matching height), solid `#0f0f0f` bg, white text, 500 weight | Subscribe (Shorts), Sign in outline variant on masthead |
| Icon-only | Perfect circle (`50%`), transparent bg, `#eee`-family hover fill | Hamburger, mic, notifications, avatar |
| Chip / filter pill | `20–28px` radius, light-grey bg, dark text | Search suggestions, filter chips (product-wide, not on captured routes) |
| Card / thumbnail | `8px` radius, no shadow, optional `1px #eee` border | Video cards, dropdown menus |
