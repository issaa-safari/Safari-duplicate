# 3. UI Components

Inventory of reusable components observed, with purpose, states, interactions, validation, and disabled conditions. The original app is a jQuery/server-rendered UI; the rebuild targets React — component names below are proposed for the rebuild.

## 3.1 Buttons
- **Primary (pill):** green fill `#16b408`, white text, radius 15px, padding ~5×22px, weight 600. Used for main actions (Save Request, Next Step, Activate Add-On).
- **Secondary/ghost:** white bg, green text/border, same pill radius. Used for Cancel, tab-level actions.
- **Text/link buttons:** green text, no chrome (Edit, Add line, Add traveler, Add flight).
- **States:** default / hover / active / **disabled** (e.g., "Delete request" disabled with explanatory tooltip; wizard "2 Request Details" disabled until step 1 valid) / loading.
- **Disabled conditions:** unmet prerequisites (quotes exist → no delete; itinerary empty → pricing blocked); add-on-gated actions show "Activate Add-On" instead.

## 3.2 Forms & inputs
- **Text/email/tel inputs:** 30px tall, 1px `#ccc` border, 6px radius, 15px text, floating/inline labels. Required marked with `*`.
- **Autocomplete search inputs:** `<input type=search>` bound via `data-source`; server or client mode; min-length; `data-skipadd` disallows custom values; `data-autoshow` opens list on focus; some allow adding new custom entries (persist to tenant dataset).
- **Selects/comboboxes:** native `<select>` for enumerations (traveler/room amount 1–100, sort options, handled-by).
- **Checkboxes:** custom-styled (`data-style=check`), e.g. Countries Visited (Kenya/Tanzania), notification toggles.
- **Textareas:** request info/notes, quote descriptive text.
- **Date picker:** text input + calendar (`placeholder "Select Date"`), used for start date, request date.
- **File upload:** avatar (`input[type=file]`), Content Library media (images/covers/videos), personal signature.
- **Validation:** required fields, email format, min-length on search; server returns typed error envelope; inline messages.

## 3.3 Tables
- **Requests list:** row = request card (client, tour, travelers, travel date, value, tasks, quote status); rows clickable (`data-href=/request/{id}`, `data-trclass`).
- **Data tables:** Clients (Full name/Email/Phone/Country/Requests), Users (Nr./Account/Type/Activity/Status/Manage), Travelers (Name/Relation/Age/Dietary/Allergies), Flights, Tour Staff, Vehicles.
- **States:** populated / empty ("No flights yet, add one first") / loading.
- **Interactions:** row click → detail; inline row actions (edit/delete); sortable via header selects.

## 3.4 Cards
- **Request cards** (board), **Tour Template cards** (last edit, name, status, actions Edit/Share/Copy/Lock), **Accommodation cards** (name, class, location, favorite, premium badge), **Add-on cards** (name, price, trial, activate), **KPI cards** (Insights).
- **States:** default/hover; status-tinted (draft/sent/confirmed); premium/favorite badges.

## 3.5 Charts
- **Insights:** at least one SVG chart (source/breakdown) plus KPI stat tiles. Lightweight (no heavy charting global detected; likely inline SVG/Lottie). Rebuild: use a React chart lib (Recharts/visx).

## 3.6 Maps
- **Accommodations Map View** toggle: geospatial plotting of properties with radius search around an anchor (city/airport). Rebuild: MapLibre/Google Maps + PostGIS radius query.

## 3.7 Dialogs / Modals
- **Confirm modal:** e.g. "Are you sure you want to archive this Request?" with primary/secondary buttons and explanatory copy. Used for destructive/irreversible actions (archive, cancel account, delete).
- **Picker modals/overlays:** select tour template, select existing client, accommodation/activity pickers.
- **Inline edit popovers:** reference/date/source edits (`actions.*`).

## 3.8 Toasts / Inline feedback
- Success/error feedback after saves (transient). Error pages for hard failures (403/404/500). Field-level inline errors for validation.

## 3.9 Dropdowns / Menus
- **Primary "…" overflow menu** (Clients/Insights).
- **Handled-by / Sort-by** selects.
- **Context actions** on records (archive/delete/status) grouped in a per-record actions menu.

## 3.10 Date pickers
- Calendar widget for start date and request date; long/short formats configurable in System Settings; first-day-of-week configurable.

## 3.11 File uploads
- Avatar, signature, and Content Library media (images/covers/videos per item). Storage capped on Free tier (PRO upsell for unlimited).

## 3.12 Pagination / Infinite scroll
- **Pagination:** Clients uses `?page=` param (classic pagination). Requests/accommodations appear to load per-tab/filtered sets. Rebuild: cursor or page pagination on list endpoints.

## 3.13 Wizards / Steppers
- **Add Request:** 2-step stepper (numbered tabs 1/2, step-2 gated).
- **Quote builder:** 4-step linear wizard (day-by-day → pricing → preview → finish) with "Next Step" progression and step gating.

## 3.14 Tabs
- Status board tabs (with counts), record sub-tabs, Content Library media tabs, Profile tabs — all count-badged where relevant.

## 3.15 Badges / Chips / Indicators
- Plan badge ("Free"), "new" nav badge, quote status chips (draft/sent/confirmed), tasks progress ("0 / 17 Tasks"), premium/favorite badges, account-progress meter (95%).

## 3.16 Tooltips / Help
- `data-content` help tooltips on tabs and disabled actions (e.g. status descriptions, why delete is disabled). Gleap widget for support.

## 3.17 Empty states
- Friendly per-context empty states with a call to action ("No New Requests." + add link; "No flights yet, add one first").
