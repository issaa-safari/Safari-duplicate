# Quote Builder implementation plan

## Agreed product rules

- Two modes: custom safari and fixed departure.
- Customer-facing prices are USD per person for the whole trip.
- Primary room prices are sharing and single; the single supplement is their difference.
- Traveller age bands are configurable and snapshotted into each quote version.
- Seasonal supplier rates are reusable, with audited manual overrides.
- A quote has a default markup with optional category-level overrides.
- Discounts may be percentage or fixed and require an internal reason.
- Sent versions are immutable; editing creates a new version.
- Default validity is 14 days, overridable per version.
- Delivery supports PDF, email, and a secure share link.
- Acceptance locks the version and later creates a provisional booking.
- Finance, invoicing, and payments are not part of this phase.

## Build sequence

1. **Quote list and creation**
   - Start from a request/client.
   - Choose custom safari or fixed departure.
   - Create quote and version 1 as a draft.

2. **Trip and travellers**
   - Dates, language, validity, traveller ages, and room arrangements.
   - Resolve configurable age bands using age on the travel start date.

3. **Day-by-day itinerary**
   - Copy from a tour template or build custom days.
   - Fixed departures copy and lock the published itinerary.
   - Save content snapshots alongside source IDs.

4. **Reusable rates**
   - Manage seasonal rate cards and rate rows.
   - Match by date, entity, traveller/room category, residency, and group size.
   - Allow a manual override only with a reason.

5. **Pricing engine**
   - Convert supplier costs to USD using snapshotted exchange rates.
   - Allocate group costs across paying travellers.
   - Apply category markup override, otherwise quote default markup.
   - Apply taxes/fees when introduced, then discounts.
   - Produce sharing and single per-person trip prices and margin.

6. **Review and versioning**
   - Preview client-facing EN/AR content without internal costs.
   - Lock a version when sent.
   - Clone the complete snapshot when revising a sent version.

7. **Delivery and acceptance**
   - Generate PDF, send through Resend, and create expiring share links.
   - Track first/last viewed timestamps and view count.
   - Record acceptance name, checkbox, timestamp, IP, and user agent.
   - Booking conversion is implemented after its transaction rules are reviewed.

## Explicitly deferred

- Invoices and payment schedules
- Stripe or Pesapal
- Supplier expenses and reconciliation
- Actual-versus-quoted margin reporting
- Refunds and credit notes
