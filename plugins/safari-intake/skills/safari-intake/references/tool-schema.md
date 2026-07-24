# `create_safari_draft` — input schema

Call this once, after the interview is complete and the operator confirms. All names are free
text — the server matches them to the content library and reports anything it couldn't match.

```jsonc
{
  "guest": {
    "name": "string (required — lead guest full name)",
    "email": "string (optional)",
    "phone": "string (optional)",
    "country": "string (optional)",
    "language": "string (optional — 'en' or 'ar')"
  },
  "adults": 2,                       // integer ≥ 1
  "childAges": [8, 3],               // one age per child, 0–17; omit or [] if none
  "startDate": "2026-07-20",         // YYYY-MM-DD (optional but strongly preferred)
  "endDate": "2026-07-27",           // YYYY-MM-DD
  "title": "string (optional short title)",
  "budgetNote": "string (optional — budget/style/preferences for the operator)",
  "days": [                          // one entry per day, in order
    {
      "destination": "Masai Mara",   // required per day
      "accommodation": "Mara Serena Lodge",  // optional (omit for a transit day)
      "activities": ["Game drive"],  // optional
      "meals": ["B", "L", "D"],      // optional — any of B (breakfast), L (lunch), D (dinner)
      "notes": "string (optional)"
    }
  ]
}
```

## Result

On success the tool returns the quote number and its **review link**, the CRM **request link**, and
a list of any names that didn't match the content library (kept as typed for the operator to fix).
Relay them to the operator. The draft is unpriced and unsent by design.

---

# `add_content_item` — add a missing library entry

Call this **only after the operator confirms**, when a destination / lodge / activity from the
enquiry isn't in the library yet. Idempotent — an existing name is returned, never duplicated. After
adding, re-run `create_safari_draft` so the name matches.

```jsonc
{
  "kind": "accommodation",        // "destination" | "accommodation" | "activity"
  "name": "Angama Mara",          // required — exact name to store
  "destination": "Masai Mara",    // optional — for an accommodation/activity
  "tier": "ultra",                // optional — for an accommodation: budget | midrange | luxury | ultra
  "country": "Kenya"              // optional — for a destination (defaults to Kenya)
}
```
