Primary call-to-action button — use for the single most important action on any surface ("Request a Quote", "Book", "Save").

```jsx
<Button variant="primary" size="lg">Request a Quote</Button>
<Button variant="secondary" size="md">Cancel</Button>
<Button variant="ghost" size="sm" icon={<MapPin size={14} />}>Details</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="primary" loading loadingText="Booking…">Book</Button>
```

Variants: `primary` (olive fill, white text — the only strong CTA per view), `secondary` (white, warm border), `ghost` (outlined olive, used for "Details" / secondary trail actions), `danger` (text-only red, admin destructive actions). Sizes: `sm` (table/inline), `md` (default), `lg` (hero CTAs, 14px/28px padding). Disabled and `loading` both drop opacity to ~0.55 and block clicks.
