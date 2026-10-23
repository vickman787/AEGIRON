# AEGIRON — local integration setup

Use Node.js 24.x (tested with 24.15). Run `npm install` and `npm run dev`, then visit http://127.0.0.1:3000/purchase.

Fill in the `.env.local` template in the project root. It is ignored by Git. Never send secrets through chat, add them to screenshots, commit them, or prefix them with NEXT_PUBLIC_. Restart `npm run dev` after changing credentials.

## OpenAI

1. Sign in at https://platform.openai.com/api-keys and create a project API key with Responses API access.
2. Ensure the API project has available API usage quota and access to the configured model. A ChatGPT subscription alone is not API access.
3. Set OPENAI_API_KEY in `.env.local`. OPENAI_MODEL defaults to gpt-4.1-mini; set a compatible Responses/structured-output model you can access if needed.

The server sends buyer-request text when you click “Interpret with AI”; it sends confirmed requirements, merchant offer and checks when you click “Review saved offer with AI.” No payment credentials are sent to OpenAI. The app requests store:false. Use fictional product data.

## PayPal sandbox

1. Sign in to https://developer.paypal.com/dashboard/ and select the **Sandbox** environment.
2. Under Apps & Credentials, create a REST app associated with a sandbox **business** account. Copy its sandbox Client ID and Secret into PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in `.env.local`.
3. Under Testing Tools → Sandbox Accounts, locate that same business account and select ⋮ → View/Edit Account to get its sandbox email/password. Sign in to https://www.sandbox.paypal.com/ with those sandbox business credentials. Open Account Settings → Business information (under Business profile), then copy PayPal Merchant ID into PAYPAL_MERCHANT_ID. This is not the app's Client ID, its email address, or your live account's merchant ID. Official instructions: https://developer.paypal.com/docs/multiparty/seller-onboarding/build-onboarding/.
4. Create or use a separate sandbox **personal/buyer** account. Use its test email/password when redirected to PayPal sandbox. Never use a live account or live credentials. Keep the buyer password outside the code and chat.
5. Set AEGIRON_APP_ORIGIN=http://127.0.0.1:3000 to match the browser URL exactly. For hosting, use the actual HTTPS origin and persistent disk; local SQLite on ephemeral/serverless filesystems will not retain records.

Only https://api-m.sandbox.paypal.com is used by the backend. Orders use AUTHORIZE intent. The app does not implement capture, live payments, or shipment. No webhook setup is required for this version: after returning from PayPal, click “Verify PayPal approval on server.” The server checks the order and authorization directly with PayPal.

Official references:
- https://developer.paypal.com/checkout/delay-capture/
- https://developer.paypal.com/api/orders/v2/orders-create
- https://developer.paypal.com/api/orders/v2/orders-authorize
- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses

## Demonstrate the flow

1. Choose **Product purchase** or **Payment instruction**. Enter a complete request and select “Interpret with AI.” Inspect and confirm the extracted fields.
2. Enter the proposal: product name, quantity, total and named specifications, or the payment beneficiary label, purpose, reference, total and sandbox merchant ID. Save it.
3. Review with AI. Correct any mismatches in both the structured fields and description, save, and review again. Unsupported or unresolved requirements require a complete new request.
4. Confirm checkout consent, create the PayPal sandbox order, and approve it using the sandbox buyer account.
5. Return to AEGIRON, verify the provider outcome, and inspect/export the recorded evidence. A verified authorization is not capture or settlement.

The current scope is USD up to 500, using only the configured PayPal sandbox merchant. Payment amounts must match exactly. Product totals may be below the confirmed budget. No bank transfers or beneficiary identity verification are provided.

For examples without credentials, the product example compares mesh office chairs with a leather offer; the payment example compares reference INV-1042 with INV-1049. The SSD example remains available separately.

Without credentials, choose “Load example without AI” and “Run rules only (no AI).” These are explicitly labeled, do not call an AI model, and cannot fabricate a PayPal authorization. Rules-only mode cannot unlock PayPal checkout; a current AI review is mandatory. The earlier /cases demo remains a separate browser-only simulation.

Records use persistent PostgreSQL when DATABASE_URL is configured, or `data/aegiron.sqlite` for local development by default, scoped to a random HttpOnly browser-session cookie. Data and .env.local are ignored by Git. This is a local prototype: it has no signed-in identity, recovery, immutable audit storage or production access controls. The hosted demo requires an owner-shared access code and PostgreSQL. It remains a sandbox prototype; use fictional data and share access only with invited testers. Closing a private browser, clearing the cookie, or using another browser loses access to that browser's cases.

If an order request times out, retry the same attempt. If authorization was interrupted, use server verification; do not create a second order. The server uses stable PayPal idempotency keys and reconciles existing authorizations first.
