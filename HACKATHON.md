# AEGIRON — PayPal AI Hackathon alignment

Verified 16 October 2026 against the [event overview](https://paypalaihackathon.devpost.com/) and [official rules](https://paypalaihackathon.devpost.com/rules). These sources resolve the previously missing event context in AEGIRON_PROJECT.md. Recheck for changes before submission.

## Verified requirements

- Submission deadline: 12 November 2026, noon PST / 20:00 UTC / **21:00 WAT (Africa/Lagos)**.
- Integrate PayPal's developer platform using its free sandbox, together with an AI tool/model/platform. PayPal must be central to the product. Sponsor tools are optional.
- Provide a functioning project, feature description, and judge access through complete setup instructions or a hosted demo.
- Supply a public GitHub/GitLab/Bitbucket repository with necessary source, assets, instructions, and an open-source license.
- Provide a publicly visible YouTube demo under three minutes. Submission materials must be English or include English translations.
- Judging first checks baseline viability/API fit; eligible projects then receive equal weighting for technical implementation, design, potential impact, innovation, and presentation.
- Individuals must meet their local age of majority; location, affiliation, and conflict exclusions also apply. Individual/team eligibility has not been confirmed.

There are no prescribed tracks. Agentic Commerce is a special award, not a mandatory track. The full official rules control eligibility, participation, access, and submissions.

## Current implementation — 22 October 2026

The integrated workspace uses OpenAI Responses for interpretation and review, deterministic server rules, persistent PostgreSQL on Vercel and session-scoped local SQLite, and PayPal sandbox AUTHORIZE with server-side provider verification. It supports generic products and payment instructions; the older browser-only /cases demo remains separate. The user previously completed an actual sandbox authorization. The latest completed automated run passed 36 unit tests and four live PostgreSQL integration tests, nine browser scenarios, TypeScript, ESLint and the production build. Public source and a Vercel production deployment are now available; see RELEASE.md for domain status and the exact verification boundary. No Devpost submission is claimed.

Both flows are limited to USD up to 500 and the configured sandbox merchant. There is no capture, settlement, bank transfer, product authenticity or beneficiary identity verification. Evidence is ordinary server storage, not immutable certification.

## Submission preparation

Requirements were rechecked against the official sources on 22 October 2026. Complete local setup is an accepted judge-access option; hosting is optional. Deadline remains **12 November 2026, 21:00 WAT**. The public licensed repository and publicly visible YouTube demonstration under three minutes remain required.

Prepared local drafts:

- [Typed keyboard rehearsal](submission/MANUAL-TEST.md)
- [Demo script](submission/DEMO-SCRIPT.md)
- [Devpost copy and readiness checklist](submission/DEVPOST-DRAFT.md)

The keyboard rehearsal is complete, MIT application-code licensing is in place, and the clean public repository is published. Next: verify the hosted domain after DNS propagation, review asset rights and entrant eligibility, record/upload the video, and complete submission fields. Registration, eligibility, video and final submission remain unconfirmed. Keep secrets, database records and private evidence out of public source.


