# Photo brief — العمودي للسياحة company profile

The profile is finished and sendable **today**: every image area renders as a
designed brand field (deep-forest → brand-green gradient with highland contour
linework), not as an empty box. Photography makes it better, it isn't required.

## How to drop a photo in

Each slot is a `<div class="photo">`. Add one custom property and the photo
becomes the top layer, with the designed treatment still underneath as a
fallback if the file is ever missing:

```html
<div class="photo" style="--img:url('photos/mara-dawn.jpg')"></div>
```

Put the files in `marketing/company-profile/photos/`, then re-run:

```bash
node build.mjs
```

**Photo guidance.** Landscape shots want horizon and depth; slots sit under a
dark scrim on the cover, so leave the bottom third uncluttered. Shoot or pick
wide — the slots crop to fill (`background-size: cover`), centred. JPEG at
roughly 2000px on the long edge is plenty for print at these sizes.

## Slots in `profile-ar.html`

| Page | Slot | Aspect / size | What it should show |
|---|---|---|---|
| 1 · Cover | `cover` | 210×297mm, full bleed | Your single strongest landscape — green highlands or Mara at first light. Keep the lower half calm; the headline sits there. |
| 2 · من نحن | `about` | 210×118mm | A human moment: your team, a guide with guests, vehicles loaded at the start. |
| 3 · ليش كينيا | `why-kenya` | 174mm wide, tall | Wide green highland or Rift Valley escarpment. No people, lots of depth. |
| 4 · طريقتان للسفر | `trail-safari` | 84mm wide, tall | 4x4 with pop-up roof, guests watching wildlife, or a private camp at golden hour. |
| 4 · طريقتان للسفر | `trail-ride` | 84mm wide, tall | Riders on a Kenyan road, or bikes with the support vehicle behind. |
| 5 · تجاربنا | `exp-band` | 174mm wide | A strong wide action shot — balloon over the plains, or riders at speed. |
| 6 · الوجهات | `destinations` | 174mm wide | An open road or aerial of the Rift Valley — something that reads as distance covered. |
| 7 · لمن نصمم | `audience-band` | 174mm wide | Guests together — a family or group mid-trip, relaxed and candid. |
| 8 · رحلة على مقاسك | `custom` | 210×118mm | A planning moment, a map, or guests choosing a route with a guide. |
| 9 · للمسافر الخليجي | `gulf` | 174mm wide | Family moment on safari, or a private villa/camp setting. Warm and human. |
| 10 · كيف تبدأ | `process-band` | 174mm wide | The welcome: airport pickup, or the first morning of a trip. |
| 11 · لماذا مباشرة | `why-direct` | 174mm wide | Guide with guests in the field — the "we're actually there" proof shot. |
| 12 · وضوح في التكلفة | `value-band` | 174mm wide | A camp or lodge interior, or a set table in the bush — what the money buys. |
| 13 · تواصل | `closing-band` | 174mm wide | Your best closing image; the one you want them to remember. |

## Slots in `slides-ar.html` (Instagram)

| Slide | Slot | Size | What it should show |
|---|---|---|---|
| 1 · Cover | `ig-cover` | 1080×1350 full bleed | Your best **vertical** landscape. Bottom half stays calm for the headline. |
| 2 · لماذا كينيا | `ig-kenya` | 928×420 | Wide green highland or Rift Valley. |
| 7 · رحلة على مقاسك | `ig-custom` | 928×380 | Planning moment, map, or route shot. |

## Priority

If you only send a handful, send these four first — they carry the most weight:
**cover**, **ig-cover**, **trail-safari**, **trail-ride**.
