# Fresh typed test: wireless keyboard

Open http://127.0.0.1:3000/purchase?view=instruction and select **Product purchase**.

## Buyer request

Paste this into **Buyer request**, choose **Interpret with AI**, inspect the interpretation and confirm the requirements:

> Buy one wireless keyboard in black with an ANSI US layout and at least 24 hours of battery life. The total must be no more than USD 80 including all charges.

Expected interpretation: one wireless keyboard; black; ANSI US; battery life at least 24 hours; maximum all-in USD 80. The exact specification row names may vary. If anything important is missing or changed, do not confirm it: correct the structured fields first. Unresolved questions require a complete new request.

## Enter the offer

On Comparison, open **Edit merchant test offer**. Fill all blank required fields:

| Field | Value |
| --- | --- |
| Offered item / model | Copy the confirmed item name exactly |
| Offered quantity | 1 |
| Proposed total (USD) | 65.00 |
| Colour specification value | white |
| Layout specification value | ANSI US |
| Battery-life specification value | 30 |
| Battery-life unit | Use the same unit as the confirmed requirement, normally hours |

Keep the specification names from the interpretation. If wireless connectivity was extracted as its own row, supply the matching value too. Use the exact declared units; automatic unit conversion is not supported.

**Proposal description:**

> One white wireless keyboard with ANSI US layout and 30 hours of battery life. All-in total USD 65. Fictional sandbox test offer; no goods supplied.

Save and choose **Review saved offer with AI**.

Expected: the colour mismatch blocks checkout despite the acceptable quantity, price and battery life.

## Correct and recheck

Change the offered colour to **black** and change **white** to **black** in the description. Save and review with AI again.

Expected: the new revision passes the mandatory checks and receives an AI match if the description and every required specification agree. Buyer approval becomes available. No order or authorization should exist merely because review passed.

## Optional PayPal rehearsal

Continue only when deliberately rehearsing the sandbox authorization. Inspect case/revision, merchant and USD 65.00; tick explicit consent, create the sandbox order and approve with the separate sandbox buyer account. Return and verify on the server. Expect a verified test authorization with order/authorization IDs, with no capture or settlement. Export evidence.

Never paste credentials into the request, offer, recording or evidence shared publicly.

## Record the result

- [ ] Interpretation retained all requested requirements.
- [ ] White offer was blocked.
- [ ] Black offer passed fresh AI review and server rules.
- [ ] Saving an edit cleared the old review.
- [ ] Optional: buyer-approved USD 65 sandbox authorization was server-verified.

This is a test procedure, not a claim that this new manual run has already passed.
