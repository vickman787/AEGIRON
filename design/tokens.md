# Web tokens

All CSS tokens are **provisional**, adapted from visual inspection of the Canva overview preview. No exact element color/font measurement is claimed.

| Token | Value | Use |
| --- | --- | --- |
| background | #f7f6f2 | Warm workspace background |
| surface | #fffefa | Forms, panels, header |
| foreground | #222a26 | Main text |
| muted | #60695f | Secondary copy (darkened after axe contrast findings) |
| border | #d9ddd5 | Decorative separators |
| accent | #244e3d | Primary actions and active navigation |
| success | #286247 | Passed demo states |
| warning | #785415 | Pending review |
| danger | #a23b32 | Blocked states and field errors |
| input border | #7e8b78 | Interactive boundaries adapted for 3:1 contrast |
| technical text | #56674d | Revision steps, rule numbers, required labels (contrast adaptation) |
| card radius | 5px | Panels |
| button radius | 4px | Controls |
| font | Arial / Helvetica / sans-serif | Body and headings, local fallback |
| technical labels | monospace | IDs, revision labels, small uppercase labels |

Layouts use approximately 4/8/12/16/20/24/32/48 pixel spacing. Desktop sidebar 224px, topbar 86px, content capped at 1640px. Heading scale is intentionally adapted to the browser rather than copying presentation units. Status labels include text, not just color; controls have visible focus and reduced-motion styles.

Fine decorative separators may have lower contrast than interactive boundaries; they convey no essential state. Automated/browser contrast checks and visual review are recorded in verification notes. Replace accessible token values only after inspecting exact approved controls.
