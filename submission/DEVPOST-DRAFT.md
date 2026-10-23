# AEGIRON — submission draft

Status: local draft. No repository publication, video upload or Devpost submission is represented as complete.

## Tagline

Verify intent. Protect every payment.

## What it does

AEGIRON checks a proposed product purchase or payment instruction against buyer-confirmed intent before PayPal sandbox authorization. It is designed for people reviewing AI-assisted purchases and payment proposals who need to see discrepancies and retain final approval.

A buyer writes a request in plain language. OpenAI extracts structured requirements, which the buyer inspects and confirms. The proposal is compared with that policy: product quantity, budget and named specifications, or exact payment amount, beneficiary label, purpose, reference and configured sandbox recipient. AI explains the offer and discrepancies. Mandatory rules run on the server and cannot be overridden by an AI match.

Editing an instruction or offer creates a new revision and invalidates old reviews. Checkout requires a current AI match, passing rules and explicit buyer consent. AEGIRON creates a PayPal sandbox order using AUTHORIZE intent. The buyer approves in PayPal; AEGIRON then verifies the provider order and authorization against the case, revision, amount, currency and merchant. A return URL alone never establishes success.

## How it is built

Next.js, React and TypeScript provide the interface and server routes. OpenAI Responses with validated structured output supports request interpretation and offer review. Merchant descriptions are treated as untrusted data. Persistent PostgreSQL stores hosted cases and revision evidence; local development uses SQLite. PayPal sandbox REST APIs provide order creation, buyer approval and authorization verification, with stable request identifiers and reconciliation of ambiguous responses. No capture endpoint is implemented.

The interface adapts the creator's Canva designs into navigable instruction, comparison, approval and evidence screens. Evidence can be exported as JSON.

## Technical work to highlight

- Converting free text into an explicit buyer-confirmed policy rather than allowing an AI response to authorize checkout.
- Keeping every review and authorization bound to a case revision, including stale-client and edited-offer handling.
- Comparing decimal amounts and numeric specifications without floating-point rounding.
- Distinguishing browser returns, buyer approval and provider-verified sandbox authorization.

## Validation so far

The latest regression run passed 36 unit tests, four live PostgreSQL integration tests and nine browser scenarios, along with TypeScript, ESLint and the production build. Eight accessibility scans of the broader instruction flow reported no violations. Live OpenAI checks accepted matching proposals and rejected mismatches. The creator previously completed a server-verified PayPal sandbox authorization for an SSD case. The creator also completed the keyboard mismatch, correction and server-verified sandbox authorization rehearsal.

## Current limits

This prototype uses USD totals up to 500 and one configured PayPal sandbox merchant. Product offers and beneficiary labels are declared test data; AEGIRON does not authenticate inventory, identity or bank ownership. It does not search live shops, supply goods, transfer to bank accounts, capture or settle payments. Database evidence is not immutable. Hosted access uses a private demo code and request quotas with persistent PostgreSQL; buyer identity, account recovery and a production retention design remain outside this prototype.

## Tools

Next.js; React; TypeScript; OpenAI Responses API; PayPal sandbox REST APIs; SQLite; Tailwind CSS; Lucide; Playwright; axe-core; Canva; Codex. Check this list against the final build before submission. The configured AI model is documented in setup; the submission should disclose the actual model/service used even though model identifiers are omitted from the product UI.

## Links to fill after preparation

- Public source repository: pending.
- License: MIT for application code; see THIRD_PARTY_NOTICES.md for assets and trademarks.
- Publicly visible YouTube demo: pending.
- Judge setup: README.md and public/SETUP.md in the final public repository.
- Hosted demo: optional; no deployment is currently claimed.

## Submission checklist

- [x] Complete the typed keyboard rehearsal (creator screenshots show the mismatch, correction and verified authorization).
- [ ] Rehearse and record the functioning app and actual sandbox flow in under three minutes.
- [ ] Review eligibility and register/join the event using the entrant's own details.
- [x] Add the MIT application-code license and third-party notices.
- [ ] Confirm rights and attribution for included source, Canva assets, fonts and branding.
- [ ] Create/review a clean public repository containing all required source, assets and setup. Exclude .env.local, data, private logs, credentials and session evidence.
- [ ] Verify setup from a clean checkout with the documented Node version, example flow and separately configured integration credentials.
- [ ] Upload the reviewed video to publicly visible YouTube.
- [ ] Fill every required Devpost field and verify public links/access.
- [ ] Review and submit before **12 November 2026, 21:00 WAT (20:00 UTC / noon PST)**.

Source: [event overview](https://paypalaihackathon.devpost.com/) and [official rules](https://paypalaihackathon.devpost.com/rules), checked 22 October 2026. Official rules govern. The checklist does not establish personal eligibility or asset permissions.

