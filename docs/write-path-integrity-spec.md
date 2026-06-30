# Write-Path Integrity Fix — Build Spec

**Objective:** Every funnel write reliably sets its links (`client_id`, `quote_id`,
`source`, `tour_id`) so the database never accumulates orphan/"unknown" rows again.
This is the code-side partner to migration `group_28` (the DB teeth).

**The rule:** A *mandatory* link is resolved **before** the insert. If it can't be
resolved, the operation **returns a clear error** instead of inserting a half-linked
row. Only genuinely-optional side effects (totals refresh, finance stub) stay in
best-effort try/catch.

**Deploy ordering (must hold):**
1. Ship this code fix.
2. Then apply `group_28` **Tier 2** (the `NOT NULL` + delete-rule teeth).
Doing it in this order means the teeth only ever catch a real bug, never normal traffic.

---

## Work items

### 1. Harden the client resolver — `lib/server/clients.ts`
`findOrCreateClientByEmail` is the foundation; make it deterministic.
- Normalise the email: `trim()` + `toLowerCase()` before lookup and insert.
- Look up existing client by normalised email; if found, return its id (and update
  blank name/phone fields if the new data fills them).
- If not found, insert and return the new id.
- **Throw** on a hard DB failure — do not return `null`/undefined silently.
- Keep `refreshClientTotals` best-effort (it's a convenience, not a link).
- **Acceptance:** submitting the same email twice (different casing/whitespace) yields
  **one** client, not two.

### 2. Website booking — `app/api/departures/[id]/book/route.ts`
Currently creates a booking but no request and no source, and links the client
best-effort. Reorder so links are guaranteed:
1. Resolve the departure and its `tour_id` first.
2. Resolve the client via the hardened resolver (lead traveller's email).
   **If this throws, return 400/500 and do not create a booking.**
3. Create a **tracked request** for attribution: `source='website'`,
   `client_id`, `tour_id`, `stage='Booked'`, `travelers_adults` = group size.
4. Create the booking with `client_id` **and** `departure_id` set (satisfies the new
   `bookings_traceable_chk`).
5. Insert `booking_travellers` (unchanged).
6. Update `departures.booked_seats` reliably.
- Remove the silent try/catch around client linking — it's now required.
- Keep the `booking_payments` finance stub and `refreshClientTotals` best-effort.
- **Acceptance:** a website booking produces a `request` (source=`website`), a `booking`
  linked to that client + departure, and correct `booked_seats`.

### 3. Quote acceptance → booking — `app/api/quote/accept/route.ts`
- The created booking must always carry `client_id` (from the quote's client) and
  `quote_id`. Resolve the client id before insert; fail if absent.
- Keep idempotency (one booking per quote) and the seat reservation when a departure
  exists.
- Move any `redirect()` outside try/catch (existing project rule).
- **Acceptance:** accepting a quote yields a booking with both `client_id` and
  `quote_id` non-null, and re-accepting does not create a second booking.

### 4. Capture intake source on the public enquiry / quote-request form
- Ensure the form's submit path stores `requests.source` (`'website'` by default).
- Add a required group-size input if not already captured (`travelers_adults`).
- **Optional refinement (recommended, not required):** add a *separate*
  `requests.heard_about_us` column for the user-reported "Where did you hear about
  us?" (Google / Instagram / WhatsApp / Referral / Returning / Other). Keep `source`
  as the system intake channel — don't overwrite one with the other; they answer
  different questions. (Small migration `group_29` if you take this.)

---

## Guardrails (existing project conventions — keep)
- All writes go through `createAdminClient()` (service role); the session client is only
  the auth gate.
- `redirect()` always outside try/catch.
- Public **reads** keep using the normal client + public-read RLS — this spec touches
  write routes only; don't change public read access.
- Use the existing `toWhatsAppLink()` helper where numbers are involved.
- No new `any`; reuse `lib/types.ts`.

## Explicitly OUT OF SCOPE (deliberately deferred — do not bundle)
- Payment gateway (Stripe/Pesapal/M-Pesa) — later, by decision.
- Deposit-gating & expiring seat holds — still on the list, but a **separate** change;
  this spec keeps current confirm-on-book behaviour. Don't let it silently absorb here.
- Dropping orphan tables (`booking_travelers`, `quote_lines`) and the missing
  `quote_payments` table — handled separately.

---

## Paste into Claude Code
> Implement the Write-Path Integrity Fix in `docs/write-path-integrity-spec.md`. Work on a
> branch and commit first. Do items 1–4 in order. The governing rule: resolve mandatory
> links (client_id, quote_id, source, tour_id) before insert and fail the operation with a
> clear error if a mandatory link can't be set — never insert a half-linked row. Keep
> refreshClientTotals and the booking_payments stub best-effort. All writes via
> createAdminClient; redirect() outside try/catch; don't touch public read access; no new
> `any`. Out of scope: payment gateway, deposit-gating/seat-holds, dropping orphan tables.
> Before coding, show me the files you'll change and confirm the exact path of the public
> enquiry/quote-request form's submit handler.
