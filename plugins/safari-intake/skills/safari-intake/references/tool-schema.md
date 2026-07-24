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

On success the tool returns the quote number, a **review link** to open in the admin, and a list
of any names that didn't match the content library (kept as typed for the operator to fix). Relay
all three to the operator. The draft is unpriced and unsent by design.
