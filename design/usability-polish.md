# Purchase guidance — 22 October 2026

The workspace now gives the next action for confirming requirements, entering or correcting a proposal, requesting fresh AI review, approving in PayPal and exporting evidence. Messages distinguish buyer requirements from the merchant's offered values. Active and authorized checkout revisions explain that they are locked; interrupted order creation points to the existing retry action.

Fresh empty proposals open their form automatically. The matrix shows an awaiting-proposal message instead of a discrepancy warning until a total has been saved. Empty specification values display as not entered. Offer fields have placeholders, matching requirement reminders and amount guidance; the description explains that it must agree with the structured values. Unsaved and saved form messages explain when to save and review. Request examples are explicitly labeled as fictional test cases. Generic cases show their actual item/instruction title in the Cases list.

Payment authorization and verification policy are unchanged. No new provider orders were created during these checks.

Verification: six purchase browser scenarios passed; the fresh-offer rendering check verified automatic opening, blank fields, unsaved-change guidance and no document overflow at 1440 and 375 pixels. Eight product/payment axe scans returned zero violations with no browser page errors. TypeScript, ESLint and the production build passed. The final matrix wording was also checked with the targeted product/payment browser scenarios and a production rebuild. Screenshots are in `qa/general-*.png` and `qa/usability-empty-offer-*.png`; the empty-offer screenshots precede the final awaiting-proposal wording correction.

These checks verify rendering and workflow behavior. They do not substitute for observing a first-time user completing the revised flow without assistance.

## Separate dependency finding

The final build completed on retry after Next.js displayed a security upgrade reminder. A production-only npm audit confirmed a critical advisory group affecting installed Next.js 16.4.0 and reported a non-major fix at 16.4.2. Advisories: https://github.com/advisories/GHSA-2464-fhr4-w9xw, https://github.com/advisories/GHSA-p3m5-59mp-jv5r, https://github.com/advisories/GHSA-673q-mjm6-r5xr. This usability change does not upgrade dependencies. Upgrade and regression verification remain necessary before publishing.
