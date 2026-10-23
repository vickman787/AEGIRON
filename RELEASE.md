# Release status — 23 October 2026

- Public source: https://github.com/vickman787/AEGIRON (MIT application code).
- Vercel production project: `aegiron`, Node.js 24.x, explicitly configured as Next.js.
- Assigned domain: https://getaegiron.xyz. Registration and Vercel DNS are configured; public DNS propagation was still pending at the release check. Do not interpret an assigned alias as proof of public reachability.
- Hosted storage: persistent Neon PostgreSQL. Local SQLite records stay local.
- Access: a private demo code is required. The project owner keeps it outside source control and shares it privately with invited testers/judges.
- Server integrations: OpenAI and PayPal sandbox configured. Only sandbox authorization is implemented; no capture or settlement.

Verification passed: 36 unit tests, four live PostgreSQL integration tests, nine browser scenarios, TypeScript, ESLint, production build, dependency audit and GitHub Actions. The isolated demo-access test passed origin checks, denied invalid/forged access, enforced login limits, checked browser isolation, and found no accessibility or mobile-overflow violations.

Hosted smoke checks on the production Vercel alias confirmed the access gate, PostgreSQL storage selection, product/payment example creation, buyer confirmation, mandatory mismatch blocking, checkout denial and persistence across fresh requests. These checks used the configured origin header and did not call OpenAI or perform PayPal operations. Normal browser use should use the assigned custom domain once it resolves. The creator's earlier local PayPal sandbox authorizations are separate from this hosted smoke check.

Remaining entrant work: verify the public domain after DNS propagation, privately share demo access, rehearse a buyer-approved sandbox authorization on the hosted domain, record/upload the under-three-minute YouTube demo, confirm eligibility and submit Devpost before the event deadline.
