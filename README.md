# AEGIRON — the final check before an agent buys

AEGIRON checks proposed products and payment instructions against buyer-confirmed requirements, blocks mandatory mismatches, and requires buyer approval before PayPal sandbox authorization. Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/); see [HACKATHON.md](HACKATHON.md).

Release and deployment status: [RELEASE.md](RELEASE.md).

## Run locally

Requires **Node.js 24.x** (tested with 24.15) and npm. Local SQLite development also needs a writable disk.

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:3000/** for the brand homepage from Canva page 1, then choose **Enter workspace** for the overview. The integrated workspace separates instruction, comparison, buyer approval and evidence into navigable screens. Header links show server-stored cases, rules and activity. Older `/cases` screens remain separate browser-only demonstrations.

Copy `.env.example` to the ignored `.env.local` and fill in: OPENAI_API_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_MERCHANT_ID. Use only PayPal sandbox credentials and a separate sandbox buyer account. Restart the server after changing configuration. Never commit or share secrets. Full setup and walkthrough: [public/SETUP.md](public/SETUP.md), served at `/SETUP.md`.

The interpreter and reviewer use OpenAI Responses with validated structured output. OPENAI_MODEL defaults to gpt-4.1-mini. Configured means variables are present, not that provider access has been tested.

Without credentials, choose **Load example without AI** and **Run rules only (no AI)**. They exercise actual server storage and deterministic rules, without fabricating AI inference or PayPal success.

## Main flow

1. Choose **Product purchase** or **Payment instruction**, enter a complete request and interpret it with AI. Inspect and explicitly confirm the structured requirements.
2. Enter the proposed product specifications or payment details, save them, and review with AI. Mandatory mismatches block checkout.
3. Correct the proposal and description, save, and re-run review on the new revision.
4. Confirm the exact case, revision and amount. Create a sandbox order and approve it using the sandbox buyer account.
5. Return and verify the provider outcome on the server; inspect or export evidence.

PayPal uses AUTHORIZE intent. Test authorization is distinct from capture and settlement. No capture, live-money endpoint, shipping or goods fulfillment is implemented. The server directly checks the provider order and authorization against the case/revision, currency, amount and configured merchant. A return URL or client flag is never proof.

## Supported instructions

- **Products:** item/model, quantity, total budget and up to 16 named requirements. Text values use normalized exact matching; numeric values support equal, minimum or maximum comparisons with matching units. Examples include office chairs, keyboards and storage devices. No automatic unit conversion is performed.
- **Payment instructions:** exact amount, beneficiary label, purpose, reference and the configured PayPal sandbox merchant ID. A different reference, recipient or amount blocks approval, including an amount below the instructed amount. Labels are compared; this does not authenticate beneficiary identity or bank ownership.

Both flows currently use **USD, up to USD 500**, and the configured sandbox merchant only. There are no bank transfers, third-party payouts, live product search, capture or settlement. Existing SSD cases remain usable. New requests start blank; examples load only when selected.

For a credential-free product test, load the office-chair example: mesh is required but leather is offered. For a payment test, select Payment instruction and load its example: INV-1042 is required but INV-1049 is proposed. Correct the proposal and run rules again. A current AI review is still required to unlock sandbox checkout.

## Enforcement and limitations

AI cannot waive failed mandatory rules. Actual PayPal checkout additionally requires a current AI review with a match verdict; rules-only mode cannot unlock payments. Unsupported requirements and clarification questions block checkout. Editing a saved offer or policy creates a new revision and invalidates checks. In-progress checkout locks edits; authorized cases cannot be rewritten. Stable request IDs support retries; ambiguous authorization is reconciled before another operation.

Local development stores cases and revision snapshots in ignored `data/aegiron.sqlite`. Setting DATABASE_URL selects persistent PostgreSQL; Vercel refuses to fall back to an ephemeral SQLite file. A random HttpOnly/SameSite cookie scopes access to one browser. POST requests require the configured origin; request sizes and AI volume are bounded. Cookie loss removes browser access. This is ordinary database storage, not immutable evidence.

**Local prototype:** OpenAI extraction/review and PayPal sandbox authentication were tested with configured credentials. The user completed a sandbox authorization and shared the server-verified success screen. Synthetic automated tests are separate from that observed transaction. Offers are supplied test data, not authenticated inventory or live product search. Use fictional data. There is no signed-in identity, account recovery, webhook lifecycle monitoring, or production access/retention design. Hosted sandbox access requires an owner-shared demo code, HTTPS and persistent PostgreSQL. This is a limited demo gate, not a signed-in identity or production financial service. Shared AI quotas also bound usage across sessions.

## Hosted sandbox setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel CLI workflow. The hosted workspace requires DATABASE_URL, AEGIRON_DEMO_ACCESS_CODE (at least 16 characters), the exact HTTPS AEGIRON_APP_ORIGIN, and the server-side integration credentials. Never commit those values. Share demo access privately with invited testers and judges.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run start
```

Browser tests use installed Microsoft Edge and start the dev server if necessary. Server tests inject fake provider transports; browser tests use example/rules-only mode and make no external payments.

Design and verification notes are in `design/`. Generated QA images and original Canva exports stay local and are excluded from the public repository. The integrated UI uses the approved Canva composition: condensed headings, thin rules, instruction constraints, a comparison matrix, a blocked checkout and an authorization receipt. Option 06 uses the recovered 810×220 Canva logo, with the original background/platform assets and PayPal mark. CSS uses an available condensed system font as an adaptation. Manual screen-reader review remains outstanding.

Original application code is MIT licensed; see [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).

