---
description: Start a guided safari enquiry — interview a client message into a draft quote.
---

Start a new safari enquiry using the **safari-intake** skill.

If the operator pasted an enquiry or client message below, use it as the starting point and only
ask for what's missing. Otherwise, ask for the client's enquiry to begin.

Follow the skill: interview one question at a time (client → dates → travellers → day-by-day),
confirm a summary, then create the draft with `create_safari_draft` and return the review link.

$ARGUMENTS
