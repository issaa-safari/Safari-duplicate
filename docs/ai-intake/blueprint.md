# Safari intake — full blueprint (what the chat asks, and what it saves)

This is the complete spec for the enquiry interview: every field, whether it's required, how to
ask it (free text vs a choice list), the real option values, and whether it saves to your system
today or needs a small tool update. Goal: the chat gathers exactly what's needed to **add a
client**, **generate a request**, and **build an itinerary** — saved as a draft. No pricing.

**How to read the tables**
- **Req?** — Required to create a valid record, or Optional.
- **Ask as** — Text · Number · Date · Single-choice · Multi-choice.
- **Saves?** — ✅ saved today by `create_safari_draft` · ➕ needs a small tool update to save.

> Chat "dropdowns": Claude can't render a real dropdown, so single/multi-choice = it lists the
> options (e.g. "1) Wildlife 2) Honeymoon 3) Family — which?") and you tap a number or type.

---

## Stage 1 — Client

| Field | Req? | Ask as | Options / notes | Saves? |
|---|---|---|---|---|
| Full name | **Required** | Text | Lead guest | ✅ |
| Email | Optional | Text | Used to de-duplicate the client | ✅ |
| Phone | Optional | Text | | ✅ |
| WhatsApp | Optional | Text | Often the main channel for GCC clients | ➕ |
| Country | Optional | Single-choice | Saudi Arabia · UAE · Kuwait · Qatar · Bahrain · Oman · Other | ✅ |
| Preferred language | Optional | Single-choice | English · Arabic *(also French, German, Spanish, Chinese)* | ➕ |
| Client notes | Optional | Text | Anything about the client | ➕ |

## Stage 2 — Request

| Field | Req? | Ask as | Options / notes | Saves? |
|---|---|---|---|---|
| Adults | **Required** | Number | ≥ 1 | ✅ |
| Children + ages | Optional | Number + ages | One age per child (0–17) | ✅ |
| Travel start date | Recommended | Date | YYYY-MM-DD; if a month is given, propose dates | ✅ |
| Travel end date | Optional | Date | Or derive from nights | ✅ (on the quote) |
| Number of nights | Optional | Number | | ➕ (to request) |
| Trip type | Optional | Single-choice | Wildlife safari · Honeymoon · Family · Beach · Bike tour · Private/custom | ➕ |
| Room type | Optional | Single-choice | Sharing/Twin · Single · Triple · Extra bed · No bed | ➕ |
| Budget / style | Optional | Single-choice | Budget · Mid-range · Luxury · Ultra-luxury | ✅ (as note) |
| Residency | Optional | Single-choice | Non-resident *(default for GCC)* · Resident · Citizen | ➕ |
| How they heard about us | Optional | Single-choice | Instagram · WhatsApp referral · Returning client · Travel agent · Website · Other | ➕ |
| Priority | Optional | Single-choice | Normal · High | ➕ |
| Special requests / notes | Optional | Text | Diet, occasion, arrival flight, etc. | ✅ (as note) |

## Stage 3 — Itinerary (one entry per day)

| Field | Req? | Ask as | Options / notes | Saves? |
|---|---|---|---|---|
| Destination | **Required per day** | Single-choice | From your Destinations list (see `library.md`) | ✅ (matched) |
| Accommodation | Optional | Single-choice | From Accommodations in that destination (see `library.md`); "none" = transit day | ✅ (matched) |
| Activities | Optional | Multi-choice | From your Activities list (see `library.md`) | ✅ (matched) |
| Meals | Optional | Multi-choice | Breakfast · Lunch · Dinner | ✅ |
| Nights at this stop | Optional | Number | For a multi-night stay (e.g. 2 nights in the Mara) | ➕ (day span) |
| Day notes | Optional | Text | Free text for the day | ✅ (as description) |

---

## Fixed option lists (the small "dropdowns")

- **Country:** Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman, Other
- **Language:** English, Arabic (French, German, Spanish, Chinese)
- **Trip type:** Wildlife safari, Honeymoon, Family, Beach, Bike tour, Private/custom
- **Room type:** Sharing/Twin, Single, Triple, Extra bed, No bed
- **Budget / style:** Budget, Mid-range, Luxury, Ultra-luxury
- **Residency:** Non-resident, Resident, Citizen
- **How heard:** Instagram, WhatsApp referral, Returning client, Travel agent, Website, Other
- **Meals (per day):** Breakfast, Lunch, Dinner

The **big lists** — Destinations, Accommodations, Activities — change as you add content, so they
live in `library.md` (add it to your Project so the chat suggests real options).

---

## The interview script (paste into your Project's instructions)

You are the intake assistant for a Kenya safari operator selling to GCC (Gulf) clients. When I give
you an enquiry, interview me to build one trip, then create a draft with the `create_safari_draft`
tool. You never price and never send — I finish in the app.

Ask ONE thing at a time. Read what I paste first and only ask for what's missing. For any field
with set options, list them as numbered choices and let me pick a number or type. For destinations,
lodges and activities, suggest real ones from the `library.md` file; if I name something not in it,
accept it as typed and note it. Keep it brisk — if I answer several at once, accept and move on.

Order:
1. **Client** — name (required); then email, phone, WhatsApp, country, preferred language if not
   already given.
2. **Request** — adults; children + each age; start date (and end date or number of nights); trip
   type; room type; budget/style; residency; how they heard about us; any special requests.
3. **Itinerary, day by day** — for each day: destination → accommodation (or none) → activities →
   meals → nights at this stop (if multi-night) → any day note. Continue until I say it's complete
   or we reach the last day.
4. **Confirm** — read back a compact summary (client, request, one line per day) and ask "Create
   the draft?"; wait for yes.
5. **Create** — call `create_safari_draft` with everything gathered (children ages → childAges;
   meals → B/L/D; extra request details into their fields; special requests → budgetNote/notes).
6. **Report** — give me the review link, the quote number, and any names that didn't match the
   library. Do not price or send.

Rules: never invent a client detail, destination, or lodge. Never produce a price. Dates are
YYYY-MM-DD; adults ≥ 1; a child is under 18, record each age. Don't call the tool until I confirm.

---

## Project files to add (so the chat "gathers from" them)

1. **`blueprint.md`** (this file) — the rules and the interview script.
2. **`library.md`** — your real Destinations, Lodges and Activities, so the chat offers real
   options and matches them. Regenerate it whenever you add content (or after the cleanup below).

Add both as **Project knowledge/files** in the Claude Project, and paste the interview script above
into the Project's instructions.

---

## Status

**B. Extend the tool — ✅ DONE.** `create_safari_draft` now saves every field above, including
WhatsApp, language, client notes, trip type, room type, nights, how-heard, priority, residency
(as a note), and multi-night day spans. All the ➕ fields are now stored once deployed.

**A. Clean the content library — ⏳ run once (SQL provided).** For clean dropdowns + reliable
matching, run the cleanup SQL (in `docs/ai-intake/library-cleanup.sql`) in Supabase → SQL Editor.
It normalizes budget tiers (`mid_range`→`midrange`, `ultra_luxury`→`ultra`), fixes typos
(`Norumoro`→`Naro Moru`, `Ol Pegeta`→`Ol Pejeta`, `Furished`→`Furnished`), removes duplicate/junk
lodges and empty duplicate destinations (all verified zero-reference), and deletes the TEST
activities. It intentionally leaves ambiguous pairs (e.g. `Hills Gate` / `Hillsgate Experience`,
`Game Drive` / `Guided Game Drive`) for you to judge. Regenerate `library.md` afterwards.
