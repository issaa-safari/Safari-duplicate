# 1. Information Architecture

## 1.1 App shell & navigation hierarchy

Two-tier top navigation inside a fixed app shell (no left sidebar except inside Settings and Accommodations):

- **Utility bar (top-right):** brand/logo (links home), plan badge ("Free"), **Settings** (avatar → `/profile`).
- **Primary nav (main menu):**
  1. Requests — `/requests`
  2. Tour Templates — `/templates`
  3. Accommodations — `/accommodations` (badged "new")
  4. Content Library — `/contentlibrary`
  5. **…** overflow menu (icon-dots) → **Clients** `/clients`, **Insights** `/insights`
  6. Add-on Store — `/addons`

Settings is its own area with a **left sidebar** grouped into: *Your User Account*, *Subscriptions & User Accounts*, *Marketing*, *Tour & Quote Settings*, *Request Settings*, *Administration*.

```mermaid
graph TD
  Shell[App Shell] --> Req[Requests /requests]
  Shell --> Tpl[Tour Templates /templates]
  Shell --> Acc[Accommodations /accommodations]
  Shell --> CL[Content Library /contentlibrary]
  Shell --> More[… overflow]
  More --> Cli[Clients /clients]
  More --> Ins[Insights /insights]
  Shell --> Store[Add-on Store /addons]
  Shell --> Set[Settings /profile]

  Req --> RBoard[Status board: New/WorkingOn/Open/PreBooked/Booked/Completed/NotBooked/Archive/Running]
  Req --> RAdd[Add Request #add wizard]
  RBoard --> RDetail[Request detail #tab-{status}-{id}-tour]
  RDetail --> Quote[Quote builder /quote/{req}-{quote}/{section}]
  Quote --> QDay[day-by-day] --> QPrice[pricing] --> QPrev[preview] --> QFin[finish]
  QFin --> Pub[(Published PDF + Digital on {tenant}.safarioffice.app)]

  CL --> CLd[/contentlibrary/destination/]
  CL --> CLa[/contentlibrary/accommodation/]
  CL --> CLact[/contentlibrary/activity/]
  CL --> CLt[/contentlibrary/theme/]
  CL --> CLc[/contentlibrary/country/]
  CL --> CLv[/contentlibrary/vehicles/]
  CL --> CLs[/contentlibrary/tourstaff/]
  CL --> CLset[/contentlibrary/settings/]

  Set --> Prof[/profile]
  Set --> Subs[/subscriptions]
  Set --> Users[/users]
  Set --> Comp[/company]
  Set --> Bill[/billing]
  Set --> Sys[/settings]
  Set --> Store
```

## 1.2 Route table

| Route | Title | Type | Notes |
|---|---|---|---|
| `/signin` | Sign In | Public | Email+password; auto-redirects to `/requests` when authenticated |
| `/requests` | Requests | App | Status board; default landing page |
| `/requests#add` | Add New Request | App (hash) | 2-step wizard (Client Information → Request Details) |
| `/requests#tab-{status}` | Requests / {status} | App (hash) | Board tab: `new`, `workingon`, `open`, `prebooked`, `booked`, `completed`, `notbooked`, `archive`, `running` |
| `/requests#tab-{status}-{id}-tour` | Request/Booking detail | App (hash) | Loads server fragment `GET /request/{id}?tab=tour` |
| `/request/{id}` | (deep link) | Guarded | 403 "You are not authorized" on direct hit; only reachable via in-app XHR |
| `/quote/new/{request_id}/start` | Quote bootstrap | App | Creates a quote, redirects to `/quote/{req}-{quote}/day-by-day` |
| `/quote/{req}-{quote}/day-by-day` | Quote builder — itinerary | App | Per-day program builder |
| `/quote/{req}-{quote}/pricing` | Quote builder — pricing | App | Errors if itinerary incomplete |
| `/quote/{req}-{quote}/preview` | Quote builder — preview & edit | App | Edit text/images, preview digital page |
| `/quote/{req}-{quote}/finish` | Quote builder — finish | App | Generate/send PDF + digital |
| `/templates` | Quote Templates | App | Grid of reusable tour templates |
| `/accommodations` | Accommodations | App | Faceted directory; filter state base64-encoded in `#filters=` |
| `/contentlibrary` | Your Content Library | App | Hub with sub-sections |
| `/contentlibrary/{type}` | Library section | App | `destination\|accommodation\|activity\|theme\|country\|vehicles\|tourstaff\|settings` |
| `/contentlibrary/{type}/{id}#tab-{description\|images\|covers\|videos}` | Library item | App | Per-item media tabs |
| `/contentlibrary/upload/{type}` | Add content | App | Upload/create form |
| `/clients` | Clients | App | CRM list (paginated, searchable) |
| `/insights` | Insights | App | Analytics dashboard |
| `/addons` | Add-on Store | Settings | Marketplace + user account context |
| `/addons/{slug}` | Add-on detail | Settings | `language-pack`, `safaribuddy`, `share-tours`, `content-library` |
| `/profile` | User Account | Settings | Profile, signature, 2FA, notifications, account progress |
| `/profile#tab-{personal\|signature\|2fa}` | Profile tabs | Settings (hash) | |
| `/subscriptions` | Subscriptions | Settings | Plan/subscription management |
| `/users` | Manage Users | Settings | User accounts (invite/roles/2FA/lifecycle) |
| `/company` | Contact Information | Settings | Company profile |
| `/billing` | Billing Information | Settings | Billing details |
| `/settings` | System Settings | Settings | Currencies, date formats, refno numbering, quote versioning |
| `/subscription-agreement/` | Subscription T&C | Public-ish | Legal |

## 1.3 Routing mechanics
- **Hash-based in-app routing** for the Requests area: the board, its status tabs, the add-wizard, and record detail are all driven by `#…` fragments while the browser stays on `/requests`. Detail content is fetched as a **server-rendered HTML fragment** (`GET /request/{id}?tab=tour`) and injected — direct top-level navigation to `/request/{id}` is blocked (403), so deep-linking requires the app shell + bearer token.
- **Path-based routing** for standalone areas: `/templates`, `/accommodations`, `/contentlibrary/*`, `/clients`, `/insights`, `/quote/*`, and all Settings pages are distinct server-rendered pages.
- **The quote builder** is a linear 4-step wizard keyed by a composite id `{request_id}-{quote_id}`: `day-by-day → pricing → preview → finish`. Steps gate on prior completion (Pricing 500s if the itinerary is empty).
- **Filter/state serialization:** the Accommodations page encodes its entire filter object as **base64 JSON in the URL hash** (`#filters=…`), making views shareable/bookmarkable. Decoded schema:
  ```json
  {"countries":[2,5],"types":[],"classes":[],"facilities":[],"acco_facilities":[],
   "acco_amenities":[],"acco_locations":[],"room_types":[],"search":"",
   "anchor_type":null,"anchor_id":null,"radius_km":null,"anchor_country_id":null,"map":true}
  ```

## 1.4 Breadcrumbs, tabs, back-navigation
- No classic breadcrumb trail. Context is conveyed by the **status board tabs** (with live counts) and a **Back** control (`requests.close()`) on detail views.
- **Record-level sub-tabs** on a request/booking: *Request Information*, *Quotes (n)*, *Tour Information*, *Tasks (n)*, *Notes (n)* — the booked view adds Travelers/Flights/Staff/Vehicles panels under Tour Information.
- **Content Library item sub-tabs:** Description / Images / Covers / Videos (each with a count).
- **Profile sub-tabs:** Personal / Signature / 2FA.

## 1.5 Hidden / non-obvious pages
- **Clients** and **Insights** are hidden behind the "…" overflow menu (not primary nav).
- **System Settings** (`/settings`) is separate from **Profile** (`/profile`); easy to miss.
- Error pages observed: **404** "Nothing to See Here", **403** "You are not authorized", **500** "Something Went Wrong".
- **Published proposal host:** `https://{tenant}.safarioffice.app/{hash}.pdf` and `/{hash}/online` — a separate public delivery domain, per tenant (e.g. `alamoudygroup.safarioffice.app`).
- **Reference-data API** `/internal/v1/search/{name}` (~45 datasets) — not a page, but the backbone of every autocomplete.

## 1.6 Navigation strategy used for this analysis
The crawl (objective 14) traversed the app by: loading `/requests`; clicking each status tab; opening the Add-Request wizard and both steps; clicking a booked record to reach the detail + sub-tabs; visiting `/templates`, `/accommodations` (and decoding its filter hash), `/contentlibrary` and enumerating its section links, `/addons`, `/profile`, `/settings`, `/users`; expanding the "…" menu to discover `/clients` and `/insights`; and finally creating one throwaway request to walk `Create Quote → day-by-day → pricing/preview/finish`, then archiving it. Destructive actions (deleting real records, changing account settings, sending quotes) were avoided.
