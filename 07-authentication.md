# 7. Authentication & Authorization

## 7.1 Flow
```mermaid
sequenceDiagram
  participant U as User
  participant App as app.safarioffice.com (jQuery shell)
  participant API as api.safarioffice.com
  U->>App: GET /signin
  U->>API: POST /internal/v1/signin (multipart email+password)
  API-->>U: 401 (first attempt, challenge/priming) 
  U->>API: POST /internal/v1/signin (retry)
  API-->>App: 200 {success:true}; Set-Cookie apitoken, XSRF-TOKEN, sodi, ula…; expose refresh_token
  App->>API: GET /versions, /search/*, /labeloverrides (Authorization: Bearer <token>)
  API-->>App: reference data (cached to localStorage)
  App-->>U: redirect /requests
```
A **401→200 retry** on sign-in was observed; treat sign-in as potentially two-phase (e.g. credential check then token issuance, or an optional 2FA challenge).

## 7.2 Tokens & session
- **Bearer token** required on every API call (`Authorization: Bearer …`); missing/expired → `401 error_code 2001 "Token missing"`.
- **Token storage:** `apitoken` cookie (JS-readable — appears in `document.cookie`). The app reads it and sets the Authorization header on XHRs.
- **Refresh token:** exposed via `Access-Control-Expose-Headers: refresh_token` → a refresh mechanism exists to mint new access tokens without re-login.
- **CSRF:** Laravel-style `XSRF-TOKEN` cookie + `csrf-token` `<meta>` for state-changing requests on the app host.
- **Other cookies observed:** `sodi`, `ula`, `cip` (session/identity), `_ga`,`_ga_*` (GA), `_hjSession*` (Hotjar), `session-…` (Gleap). (Values redacted.)

## 7.3 Authorization / roles
- **Account types:** **Admin** (full access incl. `/users`, `/billing`, `/settings`), **User** (standard operator), **No Access** (deactivated seat).
- **Per-record ownership:** requests have an *assigned/handled-by* user; boards filter by handled-by; but all company users can view company data (team model, not strict per-record ACL).
- **Tenant isolation:** every entity is scoped to the Company; the API returns only that tenant's data plus **global shared** resources (the cross-tenant Accommodations directory).
- **2FA:** optional per-user TOTP (enable requires password + code; disable requires password). Surfaced in `/users` and `/profile`.

## 7.4 Guards observed
- Direct deep-links to detail routes (`/request/{id}`) return **403 "You are not authorized"** — detail is only served to the authenticated in-app XHR context.
- Unauthenticated app access → redirect to `/signin`.
- Seat limits gate user invites; plan gates feature access.

## 7.5 Rebuild recommendation
- **Access + refresh JWTs**: short-lived access token (httpOnly cookie preferred over JS-readable), rotating refresh token; CSRF protection for cookie-based auth.
- **RBAC**: roles `owner/admin/member/viewer` + capability checks; per-tenant scoping enforced in a middleware/guard on every query.
- **2FA (TOTP)** with recovery codes; optional SSO later.
- **Tenant resolution** by subdomain for published proposals; app under a single app domain with tenant claim in the token.
