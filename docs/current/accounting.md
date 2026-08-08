# Trip accounting: services, payments, invoices

How money on a trip is modelled, and why. Three migrations build it:
`group_73` (payments), `group_74` (add-on services), `group_76` (invoices).

## The trip is the unit, not the quote

A trip is reachable by two keys — the quote it was sold from, and the booking it
became — and either may be absent. An accepted quote whose booking creation
failed has no booking; a website booking has no quote. Every money table
therefore carries **both** `quote_id` and `booking_id`, nullable, with a CHECK
that at least one is present, and every read resolves one to the other first
(`resolveTripRef` in `lib/server/accounting.ts`).

This is what `group_73` was for. Money used to live in `quote_payments` and
`booking_payments`, which never reconciled: a trip promoted from a quote got a
row in both, and the receipts screen avoided double-counting only by ignoring
bookings that had a quote behind them.

## What a trip is worth

Three things add up, and they are deliberately separate:

| | where | why separate |
|---|---|---|
| the itinerary | `quote_versions.total_selling_usd`, or `bookings.total_price_usd` | the pricing engine owns it |
| add-on services | `trip_services` | see below |
| what was actually billed | `invoices` + `invoice_lines` | fixed at issue; the others still move |

**Add-ons do not ride on `quote_price_lines`**, for two reasons that are not
obvious from reading the pricing code:

- `save_trip()` starts every save with
  `delete from quote_price_lines where quote_version_id = …`, so an add-on
  written there is destroyed by the next edit of the quote.
- `assert_quote_version_mutable()` blocks any write to an accepted version —
  which is exactly when someone wants to add a visa.

So a service attaches to the *trip* and is summed alongside the itinerary price
rather than inside it. Its name and price are snapshotted onto the attachment, so
re-pricing the catalogue never re-prices a trip that was already sold.

## `invoicedUsd`: which figure wins

`getTripBalance` returns `invoicedBasis`, and the rule is:

- **an issued invoice exists** → the sum of the trip's live invoices. It is a
  figure the client has been given.
- **otherwise** → itinerary price + add-ons. An internal estimate, which can
  still move.

Voided invoices count for nothing. Drafts count for nothing — a draft is not a
claim on anybody.

## Paid is derived, never stored

`invoices.status` is `draft | issued | void`. There is no `paid`.

Whether an invoice is settled is computed against the ledger every time it is
shown, by `invoiceDisplayStatus` in `lib/invoice.ts`, which adds `paid`,
`part-paid` and `overdue` on top of the stored status. A stored flag would be a
second copy of the truth, and `group_73` exists because six divergent copies of
the balance calculation had already been written — three of which handled refunds
and three of which did not, so a refund reduced the balance on some screens and
not others.

All the arithmetic is in two pure, tested modules: `lib/balance.ts` and
`lib/invoice.ts`. Nothing that displays money is allowed its own copy.

### Which payments count towards which invoice

`allocatePayments` (`lib/invoice.ts`):

- a payment naming a live invoice belongs to it;
- one that names nothing — a deposit taken at acceptance, before any invoice
  existed, or anything recorded before `group_76` — falls to the trip's single
  live invoice when there is exactly one;
- with two or more, it stays **unallocated** rather than being guessed at. Money
  silently attributed to the wrong document is worse than money visibly
  attributed to none.

## An issued invoice is frozen, in Postgres

Not in the UI. `group_76` installs four triggers, so the SQL editor cannot do
what the app refuses:

| trigger | what it stops |
|---|---|
| `assert_invoice_lines_mutable` | inserting, editing or deleting lines of a non-draft invoice |
| `assert_invoice_transition` | any status move but draft → issued → void, and edits to number, total, trip, issue date, currency or client name once issued |
| `assert_invoice_deletable` | deleting anything that was ever issued — void it instead |
| `assign_invoice_number` | nothing; it *fills in* number, issue date and due date at the moment of issue |

Correcting an issued invoice means voiding it and issuing another. The void keeps
its number spoken for and its reason on the record.

`invoices.total_usd` is maintained by `sync_invoice_total()` over the lines, so
the header can never disagree with its detail. Discounts are negative lines —
which is why `invoice_lines.unit_price_usd` has no `>= 0` check, unlike
`trip_services.unit_price_usd`, which does.

## Numbering

`next_invoice_number()` draws from `invoice_number_seq` and prefixes it with
`company_settings.invoice_prefix` (falling back to `INV` when unset or blank), so
`SAT-I-0001`. Numbers are drawn **at issue, not at creation**, so an abandoned
draft does not burn one. Due date follows `company_settings.balance_due_days`
unless the draft set one explicitly.

## Where it is in the UI

| screen | what it does |
|---|---|
| `/admin/finance/invoices` | every invoice, with received and balance per row |
| `/admin/finance/invoices/[id]` | edit a draft, issue it, void it |
| `/admin/finance/invoices/[id]/print` | the document — print or save as PDF |
| `/admin/finance/receipts` | per accepted quote: payments, add-ons, invoices |
| `/admin/bookings/[id]` | the same three panels for a direct booking |
| `/admin/content/services` | the add-on catalogue |

`generateInvoice` pre-fills a draft from the trip: the itinerary as one line, each
add-on as its own. The operator edits the draft, then issues it.
