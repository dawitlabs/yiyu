---
slug: youtube-com
applied_at: 2026-07-04
applied_to: yiyu (web/, Next.js 16 App Router)
framework: Next.js 16 (App Router) + Tailwind v4
---

# Applied: youtube-com Design

**Source:** https://youtube.com/
**Applied:** 2026-07-04
**Project:** /home/dave/go/yiyu

## What was applied

- [x] CSS tokens → `web/src/app/globals.css` (block `/* === youtube-com design tokens === */`) — background/foreground/border/accent/muted-foreground, light + dark, plus `--radius-pill` / `--radius-card`
- [x] Font: Roboto via `next/font/google`, replacing the unused Geist Sans/Mono pair in `web/src/app/layout.tsx` (Geist Mono had zero `font-mono` usages in the codebase — removed rather than left dead)
- [ ] framer-motion — not applicable, youtube-com uses CSS-only transitions, nothing to install
- [ ] Separate `components/youtube-com/` recipes — **skipped, see below**

## Why component recipes were skipped

`components.md` describes masthead/nav, subscribe pill, and video-card patterns — but this project already has real, in-use equivalents (`nav.tsx`, `subscribe-button.tsx`, `video-grid.tsx`). Writing parallel `components/youtube-com/*.tsx` files nobody imports would just be dead scaffolding. Instead, retrofitted the real components directly to the new shape language:

- `web/src/components/nav.tsx` — search input and "Sign up" CTA: `rounded-md` → `rounded-full` (pill)
- `web/src/components/subscribe-button.tsx` — `rounded-md` → `rounded-full`, added `font-medium`
- `web/src/components/video-grid.tsx` — thumbnail: `rounded-md` (6px) → `rounded-lg` (8px), matching the captured card radius

The `--accent` (`#065fd4` light / `#3ea6ff` dark) token is defined but intentionally **not** wired into any component yet — YouTube's own aesthetic uses it sparingly (links/focus/one primary action), and the existing red-600 semantic (errors, delete, LIVE badge) already covers this app's one accent use case. Wire `--accent` in when there's a concrete need (e.g. a focus-ring pass) rather than force it in now.

## How to remove

1. Delete the `/* === youtube-com design tokens === */` block from `web/src/app/globals.css`
2. Revert `web/src/app/layout.tsx` to the Geist font import (or pick a new one)
3. Revert the `rounded-full`/`rounded-lg` changes in `nav.tsx`, `subscribe-button.tsx`, `video-grid.tsx`
4. Delete this file: `dev/design/youtube-com/APPLIED.md`
