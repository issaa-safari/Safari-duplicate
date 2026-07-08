# 4. Forms

Field naming in the original uses PHP nested-array convention (`client[email]`, `settings[tour_name]`, `groupsize[amount][]`). Autocomplete fields reference `data-source` datasets (see [06-api.md](06-api.md) reference data).

## 4.1 Sign In (`/signin`)
| Field | Type | Required | Notes |
|---|---|---|---|
| Email | email | yes | format-validated |
| Password | password | yes | |
| (2FA code) | text | conditional | shown when 2FA enabled |
- **Submit:** multipart POST `…/internal/v1/signin`. **Success:** token + redirect `/requests`. **Error:** 401 envelope, inline message.

## 4.2 Add New Request — Step 1 · Client Information
| Label | Field | Type | Required | Source/Notes |
|---|---|---|---|---|
| Communication With Client In | `language_id` | select | yes | English; others need Language Pack |
| Email | `client[email]` | email | **yes** | format |
| Last Name | `client[lastname]` | text | **yes** | |
| First Name | `client[firstname]` | text | no | |
| Salutation | `client[salutation]` | autocomplete | no | `search_salutation` |
| Country | `client[country]` | autocomplete | no | `search_countries`, skipadd |
| Phone | `client[phone]` | text | no | |
| (existing client) | `clientid` | hidden | — | set via "Select existing client" |
| Lead Source | `source` | autocomplete | no | `search_leadsource` |
- **Submit:** "Next - Request Details" → persists draft, assigns `refno`, opens step 2 (gated on email+lastname).

## 4.3 Add New Request — Step 2 · Request Details
| Label | Field | Type | Source/Notes |
|---|---|---|---|
| Reference | `refno` | inline-edit | auto `YYYY-NNNN` |
| Date received | `settings[date]` | date | default today |
| Source | `settings[leadsource]` | inline-edit | |
| Tour Title | `settings[tour_name]` | text | |
| Tour Type | `settings[tour_type]` | autocomplete | `search_tourtype` |
| Tour Length | `settings[no_of_days]` | autocomplete | `search_tourlength` |
| Countries Visited | `settings[countries][2]`, `[5]` | checkbox | Kenya / Tanzania |
| Start Destination | `settings[start_destination]` | autocomplete | `destinations` (City\|Airport) |
| End Destination | `settings[end_destination]` | autocomplete | `destinations` |
| Start Date | `settings[start_date]` | date | "Select Date" |
| Tour template | `quotetemplate_id` | hidden/picker | "Select tour template" |
| Travelers | `groupsize[name][]` + `groupsize[amount][]` | autocomplete + select(1–100) | repeatable ("Add line"); default 2× |
| Standard Room Settings | `roomsetting[name][]` + `roomsetting[amount][]` | autocomplete + select(1–100) | repeatable; default 1× |
| Request Information / Question | `requestinfo` | textarea | |
- **Submit:** "Save Request". **Success:** request detail view. **Validation:** server envelope errors; required tour fields optional at this stage.

## 4.4 Quote builder forms
- **Day-by-day:** per-day accommodation picker, activities picker, meal plan, drinks/options, day notes; add/copy/clear/delete-day controls; country selection.
- **Pricing:** rate/position rows, currency, margins, per-person pricing, "Add Missing Positions".
- **Preview & edit:** rich text for descriptions, image selection/upload per day/section.
- **Finish:** send options (recipient, message, language), generate PDF / publish digital.

## 4.5 Traveler form (per request/booking)
| Field | Type | Source |
|---|---|---|
| Full Name | text | |
| Relation | autocomplete | `search_relationtobooker` (Wife/Husband/Partner/…); Main Booker flag |
| Age | number/date | Adult vs child (pricing tiers via `search_pricing`) |
| Dietary Requirements | autocomplete | `search_dietary` |
| Allergies | autocomplete | `search_allergies` |

## 4.6 Flight form
| Field | Type |
|---|---|
| Airline | autocomplete (`search_airlines`) |
| Flight no. / times | text |
| From / To airport | autocomplete (`search_airports`, IATA) |
| Travelers on flight | multi-select |

## 4.7 Task form
| Field | Type | Source |
|---|---|---|
| Type | autocomplete | `search_tasktype` (Follow up/Accommodation/Activity/Payment/Document/Other) |
| Status | autocomplete | `search_taskstatus` (To do/Sent/Received/…) |
| Due date | date | |
| Description | text | |

## 4.8 Profile forms (`/profile`)
| Field | Type | Required |
|---|---|---|
| `user_firstname`, `user_lastname` | text | yes |
| `user_email` | email | yes |
| `user_role` | text | |
| `avatar` | file | no |
| `oldpassword`, `newpassword`, `newpassword2` | password | for password change |
| `password-set2fa`, `code-set2fa` | password/text | enable 2FA |
| `password-remove2fa` | password | disable 2FA |
| Notification prefs | checkboxes | |
- **Validation:** old password required to change; 2FA enable requires password + valid TOTP code; new-password confirmation must match.

## 4.9 System Settings (`/settings`) — tenant config
Currencies, Default Currency, Date Format (Long/Short), First Day of the Week, reference **Prefix / Numbering / Starting Number / Letters of Last Name**, **Quote Version per Request**.

## 4.10 Content Library upload (`/contentlibrary/upload/{type}`)
Per content type (destination/accommodation/activity/theme/country/vehicle/tourstaff): name, description (rich text), country/destination association, and media tabs (Images / Covers / Videos). Tour Staff adds role (`search_role`), phone, email; Vehicles add type/seats (`search_vehicletype`, `search_vehicle`).

## 4.11 Client form (`/clients`)
Full name, Email, Phone, Country, salutation — Add/Edit; a client aggregates many requests.

## 4.12 Cross-cutting form rules
- **Required:** email + last name (request), user name/email (profile).
- **Formats:** email RFC-ish; dates per tenant format; phone free-text; IATA codes for airports.
- **Errors:** typed envelope `{success:false,error,error_msg,error_code,error_additional}` surfaced inline.
- **Success:** optimistic UI update + persisted state; wizards advance; lists refresh.
- **Autocomplete "add new":** unless `data-skipadd`, users can add custom values that persist to the tenant dataset (bumps the `versions` cache key).
