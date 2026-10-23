# Integration verification — 16 October 2026

The new `/purchase` workspace is separate from the earlier browser-only `/cases` demonstration.

Verified locally:

- Production build and TypeScript validation passed, without the earlier dynamic-filesystem tracing warning. Runtime mutable storage is excluded from source tracing.
- ESLint passed with no errors or warnings.
- 26 unit/service tests passed. AI/PayPal responses in these tests are synthetic injected transports, never real-provider proof.
- Six browser scenarios passed across the legacy and server-backed flows. The server-backed tests were rerun after requiring AI review for checkout. Coverage includes mismatch/correction, server persistence after clearing localStorage, evidence export, session isolation, stale revisions, rejected foreign origins, oversized bodies, and forged authorization flags.
- Server tests cover consent, review gates, exact amount comparisons, merchant/revision mismatches, duplicate orders/verification, canceled/expired attempts, ambiguous provider responses, revoked authorizations, output validation, AI request quotas, and enforcement that rules-only review cannot unlock PayPal.
- New-workspace axe scans reported zero violations in three states: unconfirmed example, blocked capacity mismatch, and mobile blocked case. No browser page errors were reported. Results: `qa/purchase-accessibility.json`.
- Desktop workspace and requirements/offer screenshots were visually inspected. Additional blocked-checkout and mobile images are in `qa/`.
- The running dev server returned HTTP 200 for `/purchase`.

Real-provider checks after local credentials were configured:

- All four credential fields are present; values were not printed. The running app reports both integrations configured.
- PayPal sandbox OAuth authentication returned HTTP 200. Merchant ownership, buyer approval and authorization remain unverified.
- Live OpenAI extraction returned the expected 512GB, USB-C, 24-month warranty and USD 100 total budget, with no unsupported requirements or questions. An initial false unsupported classification of “including all charges” was corrected by clarifying the extraction prompt's total-budget semantics.
- Live OpenAI review rejected the 256GB offer and accepted the corrected 512GB offer. These are individual observed responses, not a general quality guarantee.
- All 26 unit/service tests passed again after the prompt adjustment.

Still requires real account testing:

- Broader OpenAI extraction/review quality and adversarial scenarios.
- PayPal merchant ID, separate sandbox buyer account, approval redirect and actual server-verified authorization.
- Real provider negative scenarios and account-specific limitations.

The app reports both integrations configured. It never fabricates PayPal success in this workspace. Setup: `public/SETUP.md`; local secrets template: `.env.local`. No payment order, authorization, capture, public deployment, or hackathon submission was performed during these credential checks. Manual screen-reader review and actual browser 200% zoom remain unverified.
