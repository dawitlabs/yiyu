# Routes — youtube-com

2 routes captured (logged-out state). Route discovery from the home page's DOM links found 4 same-origin paths; 2 require sign-in and were not captured.

| Route | Slug | Title | Description |
|---|---|---|---|
| `/` | `home` | YouTube | Logged-out home shell: masthead, mini-guide rail, empty "Try searching to get started" feed state (no video grid without an account/session) |
| `/shorts` | `shorts` | YouTube | Vertical Shorts player: full-height 9:16 video surface, floating right-side action rail (like/comment/share/remix), bottom overlay with channel handle + pill Subscribe button |

## Skipped Routes (auth-gated)

| Route | Reason |
|---|---|
| `/feed/subscriptions` | Requires sign-in — redirects to login, no design signal beyond the login wall |
| `/feed/you` | Requires sign-in — same as above |

## Not Attempted

Marketing/corporate pages (`/about`, `/premium`, `/creators`, etc.) were not discovered via the logged-out home page's link graph and were out of scope for this capture — they typically live on a separate marketing stack (e.g. Next.js on a subdomain) with a materially different design system than the product app captured here. Re-run `/fromurl` targeting those URLs directly if that marketing design is needed.
