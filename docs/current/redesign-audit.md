# Admin Platform UX Audit — Redesign Baseline

Captured 2026-07-11 against the full running app (local dev backend, seeded data),
50 screens × desktop (1440) + mobile (390). Screenshots and per-page console
reports were generated with `scripts/inspect-screens.mjs`.

Register: **product** (admin operator platform). North star from PRODUCT.md:
*"Pipeline speed is a design feature — fewer clicks, scannable status, no
decoration that costs a consultant seconds."*

## P0 — Broken or blocking

1. **Accessibility contrast debt (flagged in PRD §6).**
   - `--brand-text: oklch(0.55 0.19 143)` is used for links/labels on white
     (`text-brand-text`, request references, "View all") — ~3.4:1, fails AA
     for body-size text.
   - Muted text `oklch(0.5 0.02 150)` on tinted `--muted` surfaces sits near
     the 4.5:1 line; placeholder gray-400 on white fails.
   - Disabled-looking primary buttons (e.g. "Add Log Entry" pale green on
     request detail) read as broken at ~1.8:1.
2. **Component vocabulary is fractured.** 175 raw `<input>`s (0 uses of the
   shared `Input`), 123 raw `<button>`s alongside 55 `Button`s, 74 native
   `<select>`s with 10+ ad-hoc class strings, 32 inline `style={{}}` blocks.
   The same control renders differently screen to screen — the definition of
   design debt. Save buttons differ per page (green solid, outline, text).
3. **No focus-visible treatment on most interactive elements** outside the
   top nav; keyboard users lose their place in tables, card lists, dialogs.
   Dialogs lack focus traps and `aria-modal` semantics (PRD flags ARIA
   combobox/focus-trap work).

## P1 — High-impact inconsistencies

4. **Page scaffold varies per page.** Content width oscillates between
   `max-w-7xl` (dashboard, clients), `max-w-5xl` (quotes, finance),
   `max-w-6xl`, `max-w-4xl` with different `px/py`; page headers are
   hand-rolled 50 different ways (46× `text-lg` h1, plus `text-xl`,
   `text-2xl`, `text-base` variants). Moving between modules feels like
   switching products.
5. **Hardcoded Tailwind grays fight the token system.** `text-gray-900/500/
   400`, `border-gray-200`, `bg-gray-100` are used throughout instead of the
   OKLCH admin tokens (`--admin-text`, `--muted-foreground`, `--border`), so
   surfaces drift warm/cool and can't be tuned centrally.
6. **Status color logic is duplicated.** `lib/status-colors.ts` exists but
   pages hand-roll their own badge/chip classes (quotes list, search modal,
   bookings, finance). Pipeline scannability depends on one consistent status
   vocabulary.
7. **Empty states don't teach.** "No accepted quotes yet." / "Fills in as
   quotes are accepted." are dead ends — no action, no explanation of how the
   state is reached. Dashboard chart area is a blank card at 260px tall.
8. **Emoji icons in Content hub** (🗺️ 🏕️ 🦁 🚙) vs lucide icons elsewhere;
   identical card grids with icon+heading+text repeated — low information
   scent, inconsistent iconography.

## P2 — Friction and polish

9. **Quote builder (itinerary step) is visually noisy.** Deep nesting
   (card-in-card-in-card), truncated select labels ("— no accommodat…",
   "+ Alternative (opti…"), 8 near-identical day blocks with no day-level
   summary collapsed view; primary actions ("Save Itinerary" vs "Save &
   Continue") compete. Warning text ("8 days missing accommodation") is
   11px amber on white — easy to miss.
10. **Dashboard hierarchy is flat.** Eight identical KPI tiles (many $0) get
    equal weight; the actionable items (new enquiries, expiring quotes,
    alerts) don't pop. Serif display numerals mix with sans body
    inconsistently.
11. **Buttons use `title` attr instead of visible affordance** for search
    (⌘K); mobile search icon button has no label; icon-only buttons lack
    `aria-label` in several spots (day reorder arrows, remove ×).
12. **Loading states are blank or spinner-based** (search modal "…" pulse);
    no skeletons on data tables; route transitions flash white.
13. **Motion is absent or ad-hoc.** Dropdowns/modals pop with no transition;
    hover states jump; no `prefers-reduced-motion` handling in admin.
14. **Table → mobile stacking exists (`.stack-table`) but several tables
    don't use it** and overflow horizontally on 390px (finance tables,
    content rates).

## P3 — Opportunities

15. Command palette (⌘K) searches only quotes/clients/requests; nav modules
    (finance, content) aren't reachable from it.
16. Quotes list, requests list, bookings, clients each invented a different
    list idiom (cards vs table vs rail+cards). Pick per data shape, but share
    the row anatomy (ref · name · status · money · date).
17. Analytics/Finance number formatting varies (`$2,900`, `$0.00`, `Ksh 0`,
    `KES 0`); centralize currency formatting.
18. Right column of request detail wastes ~40% of the viewport; comm-log
    composer could sit beside the client card on wide screens.

## Redesign strategy (approved direction)

Keep the identity: green OKLCH admin theme scoped to `.admin-theme`, Inter
UI + Playfair page-title flourish, tonal elevation, density. Fix by
**consolidation, not reinvention**:

1. Token pass in `globals.css`: AA-safe text ramps, semantic status tokens,
   focus ring, z-scale, motion durations.
2. Shared admin primitives (`components/admin/ui`): PageHeader, PageShell
   (one container rhythm), Button (all variants incl. icon), Field/Input/
   Select/Textarea, Card/Section, DataTable (stacking built in), StatusBadge
   (single source: `lib/status-colors.ts`), EmptyState, Skeleton, KPI stat,
   Dialog (focus-trapped), Toast.
3. Migrate every admin screen to the primitives; delete per-page one-offs.
4. Motion: 150–250ms ease-out state transitions, reduced-motion variants.
5. Verify with the screenshot harness after each module; final AA contrast
   sweep with computed ratios.
