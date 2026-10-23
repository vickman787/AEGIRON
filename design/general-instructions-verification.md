# Broader instructions — 17 October 2026

The integrated workspace supports product purchases with named text/numeric requirements and payment instructions with exact amounts, beneficiary labels, purposes, references and a server-bound sandbox merchant. Existing SSD cases retain their original behavior. New requests start blank; examples are explicit actions.

Server checks cannot be waived by AI. Matching payment labels do not establish identity or bank ownership. Only the configured PayPal sandbox merchant is available, in USD up to 500. No bank transfers, capture or settlement were added.

Validation includes 32 server tests and six browser scenarios across the original and new flows. Generic product tests cover missing specifications, material/quantity/warranty mismatches, decimal boundaries and invalid operators. Payment tests cover reference and amount mismatches, recipient substitution, revision locks, AI-required checkout and a synthetic gateway authorization. Browser tests use example/rules-only mode and create no PayPal orders.

Live OpenAI checks accepted matching keyboard and payment proposals and rejected colour/reference mismatches. These checks made no PayPal transactions. The previously user-completed SSD sandbox authorization is separate evidence.

The production build, TypeScript and ESLint passed. Eight axe scans reported zero violations, including product/payment forms, mobile layouts, comparison, approval and evidence. No browser page errors were recorded; mobile pages had no horizontal document overflow. Results: `qa/general-accessibility.json`. Screenshots: `qa/general-*.png`. Automated accessibility checks do not replace manual assistive-technology review.

Payment approval and evidence summaries show the proposed beneficiary label, purpose, reference and merchant ID. Full revision snapshots remain exportable. SQLite records are not immutable or independently certified.
