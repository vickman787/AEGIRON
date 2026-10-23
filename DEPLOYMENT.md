# Vercel deployment

Use Node.js 24.x. The server remains PayPal sandbox only. A domain purchase and an application deployment are separate actions.

## Persistent storage

Provision a **free Neon PostgreSQL** integration in the Vercel project. Use a pooled TLS connection string as DATABASE_URL. The application creates its namespaced tables on first use under a database advisory lock. Mutations lock the case row in a transaction; case-count and multi-bucket request limits are also enforced transactionally across instances.

Vercel refuses to use local SQLite when DATABASE_URL is missing. Existing local SQLite cases are not automatically uploaded or migrated. Export any local records you want to keep. Use fictional data for hosted testing.

## Required server environment

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Persistent PostgreSQL; supplied by the Neon integration |
| AEGIRON_APP_ORIGIN | Exact HTTPS origin, with no path/query; set to the final domain before testing PayPal redirects |
| AEGIRON_DEMO_ACCESS_CODE | Private, random demo code of at least 16 characters; required on Vercel |
| OPENAI_API_KEY | OpenAI API access; never use a NEXT_PUBLIC prefix |
| OPENAI_MODEL | Compatible Responses structured-output model; defaults to gpt-4.1-mini |
| PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET | Sandbox app credentials |
| PAYPAL_MERCHANT_ID | Sandbox business merchant associated with that app |

Set secrets with Vercel environment management using stdin or its dashboard. Keep .env.local and .env.release ignored, and never put values in command-line arguments, screenshots or public Git history. Use separate preview/development database branches when available. Configure the exact origin for each environment; do not reuse a production origin when testing a different preview URL.

The demo code issues an eight-hour HttpOnly/SameSite cookie and does not identify a buyer. Case access uses a separate random browser cookie. Share demo access privately with invited judges and testers. Clearing the browser cookie removes access to that browser's existing cases; account recovery is not implemented.

## Release checks

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

For a dedicated PostgreSQL test connection, put its URL in ignored .env.release and run `npm run test:postgres`. This integration test creates unique test owners and deletes only their records. It verifies committed persistence, owner isolation, concurrent stale revisions, rollback, case limits and atomic quotas. Do not point it at an unrelated database.

After building, `node scripts/check-demo-access.mjs` starts an isolated production server on an unused localhost port with fictional credentials and a temporary local database. It checks the access form, cookies, denial paths and accessibility without calling payment or AI providers. It chooses an unused port to avoid interfering with other local apps.

## Publish sequence

1. Verify the source contains no secrets, runtime database, session evidence or private logs. Push the reviewed source and license to GitHub.
2. Purchase the chosen domain after confirming its current registration and renewal price.
3. Link the intended Vercel project with `vercel link`; connect the database and set the environment above.
4. Deploy using `vercel --prod`. Connect/verify the purchased domain and update AEGIRON_APP_ORIGIN to the exact HTTPS origin. Redeploy after environment changes.
5. Verify the deployed access gate, example flow, evidence persistence and configured origin. Rehearse one explicit buyer-approved sandbox authorization; never claim success from a browser return alone.

Shared AI limits are 8 requests/minute and 50/day per browser session, and 60/minute and 200/day across the demo. Login attempts are limited to 30/minute across the demo. The access gate and quotas are limited prototype controls, not a production identity/compliance design. Monitor provider usage and database capacity.
