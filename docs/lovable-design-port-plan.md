# Port the Lovable design into the admin system

## Context

The Lovable companion project (commit `e8e2a9e`, see `docs/lovable-enhancement.md`) established a
new design for the SafariOffice-style platform: a safari-green oklch palette, Inter (UI) +
Playfair Display (headings), white cards on a green-tinted background, a top-nav app shell with
utility bar + underline navigation, and per-stage pipeline status colors. The user wants that
design implemented in the production Next.js app in this repo.

Constraints discovered:
- The **public site shares tokens** with the admin: `:root` defines `--olive`, `--sand`, `--bush`,
  `--background`, and `--font-display` (Readex Pro) used by `app/(public)` pages. The new design
  must therefore be **scoped to the admin area** (a `.admin-theme` wrapper class) so the marketing
  site is untouched.
- Admin pages style themselves via Tailwind utilities generated from tokens (`bg-olive`,
  `text-olive-dk` — 38 usages) plus `var(--admin-*)` inline styles (4 files) plus static
  `gray-*`/`bg-white` utilities (81 files). Because Tailwind v4 `@theme inline` utilities resolve
  `var(--…)` at the element, **re-pointing `--olive` and `--admin-*` inside `.admin-theme`
  re-skins every admin page at once**; the static grays/whites already match the Lovable
  neutrals (white cards, near-gray text).

## Changes

### 1. Design tokens — `app/globals.css` (ALREADY APPLIED, pre-plan-mode)

An edit already landed adding: a `@theme inline` block mapping new color utilities
(`primary`, `brand-ink`, `brand-text`, `surface`, `surface-alt`, `muted(-foreground)`, `accent`,
`border`, `ring`, `destructive`, `warning`, and 8 `status-*` pipeline colors), and an
`.admin-theme` scope that (a) defines the Lovable oklch palette, (b) re-points legacy
`--admin-*` / `--olive` / `--sand` / `--bush` tokens to the green system, (c) sets Inter as the
body font and Playfair Display for `h1` and a `.font-display` helper class (via new
`--font-admin-sans` / `--font-admin-display` vars to avoid colliding with the public site's
`--font-display`). Keep as-is; review during verification.

### 2. Fonts — `app/layout.tsx`

Add `Inter` and `Playfair_Display` from `next/font/google` with variables
`--font-admin-sans` and `--font-admin-display`; append both to the `<html>` className alongside
the existing font variables. Public fonts (Readex Pro, IBM Plex) unchanged.

### 3. Theme scope — `app/admin/layout.tsx`

Add `admin-theme` to the wrapper div (`<div className="admin-theme min-h-screen" …>`); drop the
inline `backgroundColor` in favor of the scoped `--admin-bg`. Also wrap the unauthenticated
pass-through (`login` page) children in a plain fragment as today — login stays unthemed.

### 4. App shell — rewrite `app/admin/sidebar.tsx` (~273 lines)

Port the Lovable `AppShell.tsx` design onto the existing component, keeping all current
behavior (`SearchModal`, ⌘K shortcut, Supabase logout, `usePathname` active detection,
`fullName`/`role` props, same `NAV_ITEMS` routes):

- **Utility bar** (h-11, `bg-surface`, bottom border): left "Alamoudy Group · Safari Adventure
  Riders"; right: user's full name + role badge (`bg-primary/10 text-brand-text` pill).
- **Primary nav** (sticky, h-16, `bg-surface/95 backdrop-blur`, bottom border):
  - Brand mark: green rounded square with Playfair "S", wordmark "Safari Adventure Tours" +
    "TOUR OPERATOR SUITE" tagline, links to `/admin/dashboard`.
  - Text-only nav links with the Lovable active treatment (green `text-brand-ink` + 2px
    `bg-primary` underline pinned to the header's bottom edge). Primary items: Dashboard,
    Requests, Quotes, Trip Builder, Bookings, Clients, Finance. Overflow "…" dropdown
    (simple `useState` + click-outside, no new deps): Tour Templates, Content, Departures,
    Suppliers, Analytics.
  - Right side: search trigger styled as the Lovable search input (magnifier icon,
    "Search requests, clients, lodges…", ⌘K kbd) that opens the existing `SearchModal`;
    avatar circle with initials (`bg-primary text-primary-foreground`) + dropdown containing
    Settings link and Log out.
- `SearchModal` needs no restyle — it consumes `var(--admin-*)` which are re-pointed.

### 5. Pipeline status colors — `app/admin/requests/page.tsx`

The page defines a `STAGES` list (new / working_on / open / pre_booked / booked / completed /
not_booked). Map each stage chip/column indicator to its `--status-*` token (dot + tinted pill,
as in the Lovable board) instead of the current generic styling. Small, contained edit.

### 6. Documentation — `docs/lovable-enhancement.md`

Append an "Implementation" section noting the design was ported into the Next.js admin
(scoped tokens, fonts, shell) on this branch.

## Verification

1. `npm run build` — must compile clean (Tailwind v4 token usage, new fonts, rewritten shell).
2. `npm run test` — existing vitest suite stays green.
3. `npm run lint`.
4. Visual: start `next dev` and load `/admin/dashboard` and `/admin/requests` with Playwright
   (Chromium is pre-installed). If Supabase env creds for a session aren't available locally,
   fall back to reviewing the login redirect page chrome + static inspection of rendered CSS
   variables; core signal is the green build.
5. Confirm the public site is unaffected: load `/` and check the parchment/olive palette still
   resolves (tokens only overridden under `.admin-theme`).

## Delivery

Commit to `claude/lovable-system-enhancement-i9mivr` and push (`git push -u origin …`).
