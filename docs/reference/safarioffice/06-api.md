# 6. API Analysis

Captured via Playwright network inspection. **No credentials, tokens, or cookie values are reproduced here.**

## 6.1 Shape & conventions
- **Base URL:** `https://api.safarioffice.com/internal/v1/` (separate host from the app `https://app.safarioffice.com`).
- **Style:** REST + JSON. **Success envelope:** `{ "success": true, "result": <data|array> }`. **Error envelope:** `{ "success": false, "error": "...", "error_msg": "...", "error_code": <int>, "error_additional": "..." }` (e.g. `error_code: 2001` = "Token missing").
- **Auth:** `Authorization: Bearer <token>` (required — cookie alone returns 401 "No authorization bearer token found in header"). Token sourced from the `apitoken` cookie; `refresh_token` returned via `Access-Control-Expose-Headers`. Laravel-style CSRF (`XSRF-TOKEN` cookie + `csrf-token` meta) for the app host.
- **CORS:** `Access-Control-Allow-Origin: https://app.safarioffice.com`, `Access-Control-Allow-Credentials: true` — locked to the app origin.
- **Infra headers:** `server: nginx`, `x-server: so-eu-web{1,4}` (EU region, multiple web nodes), `content-encoding: gzip`, `strict-transport-security`, `x-content-type-options: nosniff`, `x-xss-protection`, plus perf instrumentation `x-render-time`, `x-db-queries`, `x-cache-queries-*`.
- **Client-side caching:** reference datasets cached in `localStorage` and invalidated using a `versions` map (each dataset has a numeric/semver version; the client refetches only when the version changes).

## 6.2 Endpoint catalogue (observed)

| Method | Path | Params | Purpose | Response |
|---|---|---|---|---|
| POST | `/signin` | multipart: email, password | Authenticate | token; sets cookies; exposes `refresh_token` |
| GET | `/versions` | — | Cache-version map for all datasets | `{success, result:{dataset:version,…}}` |
| GET | `/labeloverrides` | — | White-label UI term overrides | `{success, result:{client,clients,…}, version}` |
| GET | `/requests/status/{status}` | status ∈ new/workingon/open/prebooked/booked/completed/notbooked/archive/running | List requests by pipeline status | `{success, result:[Request,…]}` |
| GET | `/request/{id}` | `?tab=tour` (app host, HTML fragment) | Request/booking detail view | HTML fragment (needs bearer) |
| GET | `/clients` | `?page=&search=` | Paginated + searchable client list | `{success, result:[Client,…]}` |
| GET | `/accommodations` | `?countries=2,5` | Accommodation directory (filtered) | list |
| GET | `/destinations` | `?countries=2,5` | Destination list | list |
| GET | `/search/activity` | `?countries=2,5` | Activity search dataset | list |
| GET | `/search/{dataset}` | — | Reference/enum dataset (see below) | `{success, result:[…]}` |
| (app) | `/quote/new/{request_id}/start` | — | Create quote, redirect to builder | 302 → `/quote/{req}-{quote}/day-by-day` |
| (app) | `/quote/{req}-{quote}/{section}` | section ∈ day-by-day/pricing/preview/finish | Quote builder steps (server-rendered) | HTML |

**`/search/{dataset}` datasets (~45):** `acco_contact_subject, activity, airlines, airports, allergies, association, attachmentcategory, availabilities, classtype, companyvehicles, countries, destinationcountries, dietary, doctypes, exclusion, group, inclusion, leadsource, linktracking, meal, moment, notbooked, option, optionaltunit, optionbook, optionunit, package, pricing, relationtobooker, role, room, salutation, taskstatus, tasktype, tccategory, templatestatus, theme, tourlength, tourtype, transfertime, vehicle, vehicletype`.

## 6.3 Sample payloads (redacted)
**`GET /requests/status/booked`** (one record):
```json
{"success":true,"result":[{
  "request_id":731769,"status":"booked","refno":"2026-0019",
  "request_value":"35000.00","request_currency":"USD",
  "name":"…","email":"…","template_name":"7-Day Magical Kenya Safari Experience",
  "quotetemplate_id":108582,"user_id":6316,"sent_quotes":1,"draft_quotes":0,
  "booked_date":"2026-04-24 16:32:25","start_date":null,"tasks_done":0,
  "assigned":1,"cr_date":"2026-04-24 16:30:52","update_date":"2026-04-24 16:32:25"
}]}
```
**`GET /versions`:** `{"success":true,"result":{"accommodations":"9147.47","destinations":"5195.35","search_countries":1,"search_pricing":"3.2",…}}` — mixed integer/semver dataset versions.
**`GET /labeloverrides`:** `{"success":true,"result":{"client":"Client","proposals":"Proposals","request":"Request",…},"version":1}`.
**Error:** `{"success":false,"error":"Token missing","error_msg":"No authorization bearer token found in header","error_code":2001,"error_additional":""}`.

## 6.4 Pagination / filtering / sorting
- **Pagination:** `?page=` (clients). Rebuild: add `page`/`per_page` or cursor across all list endpoints.
- **Filtering:** query params (`countries=2,5`), search (`q`/`search`), and for accommodations a rich filter object (countries, types, classes, facilities, amenities, room types, location, geo anchor + radius) — in the UI serialized as base64 JSON in the URL hash; on the API expressed as query/body params.
- **Sorting:** driven client-side by the board's Sort-by selects (Date received/Start date/Last edit/Date last sent/Date booked/Date last opened); rebuild should accept `sort`/`order` params.

## 6.5 Upload endpoints
- Media upload under Content Library (`/contentlibrary/upload/{type}` on the app host) for images/covers/videos; avatar and signature uploads on `/profile`. Storage-quota enforced by plan. Rebuild: presigned S3 uploads.

## 6.6 Notes for the rebuild API
- Keep a **stable success/error envelope** with typed `error_code`s.
- Provide a **`/versions` + `/reference/{dataset}`** pattern so clients can cache enums aggressively.
- Support **white-label label overrides** per tenant.
- Namespace under `/api/v1`; enforce **tenant scoping** on every query; return only tenant-owned + global (shared accommodation) data.
See [specs/openapi.yaml](specs/openapi.yaml) for the proposed contract.
