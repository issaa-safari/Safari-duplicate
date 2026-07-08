# 9. Visual Design System

Measured from computed styles (see `network/fingerprint-requests.json`). This **describes** the system for building an *original* look — do not copy the brand mark or exact assets.

## 9.1 Typography
- **Primary family:** `Inter, sans-serif` (weights 400/500/700/900).
- **Display/accent family:** `Playfair Display` (700) — used sparingly for elegant headings (client-facing/proposal flourish).
- **Base:** 16px body / 22px line-height, color `#111`.
- **Type scale (observed, px):** 9, 11, 13, 14, 15 (dominant), 16, 18, 22, 26, 30.
- **Headings:** H1 26px/900 in brand green; H2 18px/500; H3 17px/500 (`#111`).
- **Rebuild scale (suggested):** 12, 13, 14, 15(base), 16, 18, 20, 24, 30, 38 with weights 400/500/700/900.

## 9.2 Color palette (approximate)
| Token | Value | Use |
|---|---|---|
| `--brand` | `#16b408` (rgb 22,180,8) | primary green: buttons, links, H1, accents |
| `--text` | `#111111` | body text |
| `--text-muted` | `#666666` | secondary text |
| `--bg-app` | `#f5f5f5` | app background |
| `--surface` | `#ffffff` | cards/tables/inputs |
| `--surface-alt` | `#f9f9f9` | zebra/secondary surface |
| `--border` | `#cccccc` | input/table borders |
| `--danger` | `#ff0000` | errors/destructive |
| `--warning-bg` | `#fffbee` | notice/callout background |
| `--tile-color` | `#16b408` (msapplication TileColor) | PWA tile |
- **Note:** the pure brand green fails WCAG AA as small text on white — define a **darker green for text** (e.g. ~`#0f7d06`) while keeping `#16b408` for fills/large elements.

## 9.3 Radius
- Inputs/controls: **6px**; small chips/tags: **3px**; buttons (pills): **15px**; large pills/chips: **20–30px**; avatars/circular: **50%**; large hero radius: 48px.
- **Rebuild tokens:** `--r-sm:4px; --r-md:8px; --r-pill:9999px; --r-round:50%`.

## 9.4 Shadows
- Card/elevated: `0 2px 10px rgba(194,194,194,0.5)` (dominant).
- Subtle: `0 1px 3px rgba(198,198,198,1)`.
- Popover/modal: `0 1px 3px rgba(0,0,0,.15), 0 0 20px rgba(0,0,0,.1)`.
- **Rebuild tokens:** `--shadow-sm`, `--shadow-md`, `--shadow-overlay` mapped to the above.

## 9.5 Spacing scale
- Button padding ~`5px 22px`; input padding ~`2px 10px 4px`; control height ~30px. Consistent with a **4px base** rhythm.
- **Rebuild scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

## 9.6 Iconography
- Custom icon font (`.icon .icon-{requests|templates|lodge|content|clients|dashboard|add-on-store|calendar|bullet-list|dots|…}`), monochrome, often tinted green. Plus Lottie for animated states.
- **Rebuild:** use an open icon set (Lucide/Phosphor) + optional Lottie for delight; do not reuse the vendor's icon font.

## 9.7 Layout & grid
- Fixed top app shell (utility bar + primary nav), centered content column with max-width; Settings and Accommodations use a **left filter/nav sidebar + content** two-pane layout. Data-dense tables and multi-column forms (label-left or floating labels).
- Footer with small brand lockup.

## 9.8 Breakpoints (recommended for rebuild)
Desktop-first observed; suggested standard set: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. Content column ~1100–1280px; sidebars ~260–320px.

## 9.9 Component styling summary
- **Buttons:** green fill, white text, 15px radius, 600 weight, no shadow; ghost = white/green.
- **Inputs:** white, 1px `#ccc`, 6px radius, 30px tall, 15px text.
- **Tables:** collapsed borders, 14px text, hover row highlight, zebra `#f9f9f9`.
- **Cards:** white surface, soft grey shadow, rounded; status tints and badges.
- **Tabs:** underline/pill tabs with count badges.

## 9.10 Design tokens (starter, for the rebuild — original values)
```css
:root{
  --brand:#16b408; --brand-text:#0f7d06; --brand-ink:#0c6a05;
  --text:#111; --text-muted:#666; --bg:#f5f5f5; --surface:#fff; --surface-alt:#f9f9f9;
  --border:#ccc; --danger:#e00; --warn-bg:#fffbee;
  --r-sm:4px; --r-md:8px; --r-pill:9999px;
  --shadow-sm:0 1px 3px rgba(0,0,0,.12); --shadow-md:0 2px 10px rgba(0,0,0,.12);
  --font-sans:"Inter",system-ui,sans-serif; --font-display:"Playfair Display",serif;
  --step-0:15px; --step-1:18px; --step-2:22px; --step-3:26px; --step-4:30px;
}
```
*(These are recommended originals, not the vendor's tokens.)*
