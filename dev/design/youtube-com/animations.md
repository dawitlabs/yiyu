# Animations — youtube-com

---

## Libraries Detected

| Library | Detected | Evidence |
|---|---|---|
| Framer Motion | no | no `[data-framer-*]` attributes |
| GSAP | no | `window.gsap` absent |
| Lenis | no | no `[data-lenis-prevent]` |
| AOS | no | no `[data-aos]` |
| Motion One | no | no `[data-motion]` |
| CSS-only | yes | all detected motion is plain CSS `transition`, no JS animation library |

YouTube's shell ships zero third-party animation libraries — everything is native CSS transitions authored directly in the Polymer/Lit component styles.

---

## Transition Patterns (top by frequency, sampled across buttons/links/thumbnails)

| Property | Value | Count | Used on |
|---|---|---|---|
| all | `all` (unspecified duration, inherited/legacy) | 138 | broad reset on many interactive elements — not a real animation, mostly a no-op base style |
| opacity | `0.1s cubic-bezier(0.4, 0, 1, 1)` | 22 | icon buttons, hover fade |
| color | `0.1s cubic-bezier(0, 0, 0.2, 1)` | 16 | link/text hover color change |
| opacity + background-color + transform (+ webkit) + width | `0.25s / 0.1s / 0.2s`, `cubic-bezier(0.05, 0, 0, 1)` | 4 | expanding search box / pill button press |
| opacity + background-color + transform (+ webkit) + width | `0.25s / 0.1s / 0.2s`, `cubic-bezier(0.4, 0, 1, 1 → 0.2)` | 4 | same family, reverse/collapse direction |
| box-shadow | `0.28s cubic-bezier(0.4, 0, 0.2, 1)` | 4 | card/menu elevation on hover or open |
| opacity | `0.25s cubic-bezier(0, 0, 0.2, 1)` | 3 | fade-in overlays |
| fill + fill-opacity | `0.1s cubic-bezier(0.4, 0, 1, 1)` | 2 | SVG icon color/state change |
| top + opacity + visibility | `0.3s linear` | 2 | tooltip/menu show-hide |

Easing vocabulary is essentially Material Design's standard curve set: `cubic-bezier(0.4, 0, 0.2, 1)` (standard), `cubic-bezier(0.4, 0, 1, 1)` (accelerate/exit), `cubic-bezier(0, 0, 0.2, 1)` (decelerate/enter) — consistent with the Polymer/Material lineage of the codebase.

## Animation Keyframes

None captured with distinct `@keyframes` names in the sampled sheets — motion is transition-based, not keyframe-based, at this shell level. (The player itself uses canvas/video rendering, not CSS keyframes.)

---

## Per-Element Motion Patterns

### Page / Route Mount
- No detected page-transition animation — Polymer SPA navigation swaps content with a near-instant opacity fade if any, not a designed enter animation.

### Card / Icon Hover
- Duration: ~100ms
- Effect: opacity fade + color shift (not scale/translate) — very restrained, no lift/scale-up like typical marketing-site card hovers

### Button Interaction
- Press/expand: 100–250ms, opacity + background-color + transform, decelerate curve
- Hover: 100ms color/opacity fade
- No visible scale-down "press" effect on standard buttons — feedback is color/opacity only

### Navigation
- No slide/drawer animation detected in the logged-out mini-guide (icon rail is always-visible, not a toggled drawer at this breakpoint)

### Scroll Reveals
- None — no IntersectionObserver-driven reveal library; content renders eagerly

### Tooltip / Menu
- Enter/exit: 300ms linear, animates `top`, `opacity`, `visibility` together — a simple linear fade+position swap, not eased

---

## Reduced Motion
- Honors `prefers-reduced-motion`: **yes**
- Evidence: `prefers-reduced-motion` media query found in the collected stylesheets
