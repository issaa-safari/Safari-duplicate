# Content library — options for the chat to suggest and match

Add this to your Claude Project. The chat uses it to suggest real destinations, lodges and
activities and to match what you type. It mirrors your live content library — **regenerate it
after you add content or run the cleanup.** Names must match your admin exactly for matching to work.

> ⚠️ Items marked **[dup]** or **[junk]** are duplicates/typos/test rows to clean up in your admin
> (Content). Until cleaned, prefer the primary spelling on the left.

## Destinations

Kenya: **Nairobi · Masai Mara · Amboseli · Lake Nakuru · Lake Naivasha · Lake Elementaita ·
Nanyuki · Ol Pejeta · Mount Kenya · Samburu · Mombasa · Kisumu · Nyahururu · Marigat · Eldoret ·
Kericho**
Tanzania: **Serengeti · Ngorongoro Crater · Tarangire**

Clean up: `Amboseli` = `Amboseli National Park` [dup] · `Masai Mara` = `Masai Mara National
Reserve` [dup] · `Nakuru` = `Lake Nakuru National Park` [dup] · `Mombasa` vs `Mombsa` [typo] ·
`Mount Kenya` = `Mount Kenya Forest` [dup] · `Ol Pegeta` [typo → Ol Pejeta] · `Norumoro` [typo].

## Accommodations (by destination · tier)

**Nairobi:** Sarova Stanley (luxury) · Sarova Panafric (midrange) · Ole Sereni (midrange) ·
Holiday Inn Nairobi (mid-range) · Hemingways Nairobi (luxury) · The Boma Nairobi (luxury) ·
JW Marriott Nairobi (luxury) · Radisson Blu Nairobi (luxury) · Hyatt Place (midrange) ·
Hills Gate (budget) — `Hillsgate Experience` [dup] · `"P"` [junk] · `Furnished apartment` [junk/dup]
**Masai Mara:** Mara Simba Lodge (mid-range) · Mara Sopa Lodge (mid-range) · Sarova Mara Game Camp
(luxury) · JW Marriott Masai Mara Lodge (ultra) · Ritz Carlton Masai Mara (ultra)
**Amboseli:** Amboseli Serena Lodge (luxury)
**Lake Nakuru:** Sarova Lion Hill Game Lodge (midrange) · Lake Elementaita Manor (luxury)
**Lake Naivasha:** Lake Oloiden Flamingo Camp (luxury) — `Lake Oloide Flaingo Camp` [typo/dup] ·
Naivasha Twiga House (midrange) · Lake Naivasha Sopa Resort (budget)
**Nanyuki / Ol Pejeta / Mount Kenya:** Sweet Waters Serena (luxury) · Fairmont Mount Kenya Safari
Club (ultra) · Aberdare Royal Cottages (luxury) · Soames Hotel (luxury) · Forrest Villa Naromoru
(midrange)
**Mombasa:** Sarova Whitesands Beach Resort & Spa (midrange) — `Sarova Whitesands Beach Resort` [dup]
**Kisumu:** Sarova Imperial Hotel Kisumu (luxury) — `Sarova Imperial` [dup]
**Samburu:** Sarova Shaba Game Lodge (mid-range)
**Tanzania:** Serengeti Serena Lodge (luxury) · Ngorongoro Serena Lodge (luxury)

Clean up: several Sarova properties appear twice (one linked to a destination, one orphaned with no
destination) — merge each pair. Standardise tiers (`mid_range` → `midrange`, `ultra_luxury` → `ultra`).

## Activities

**General game:** Game Drive · Guided Game Drive · Night Game Drive · Hot Air Balloon Safari ·
Bush Walk with Armed Ranger
**Nairobi:** City Tour Nairobi · Giraffe Centre Visit · Coffee Farm Visit · Great Rift Valley
Viewpoint · Limuru Viewpoint · Tea Farm Visit (Tigoni) · Zipline & Forest Adventure ·
Welcome Dinner · Farewell Dinner · Airport Transfer
**Naivasha / Elementaita:** Boat Safari on Lake Naivasha · Horseback Riding · Sanctuary Farm Visit ·
Flamingo Watching (Lake Elementaita)
**Nakuru:** Observation Hill Sundowner
**Nanyuki / Ol Pejeta:** Ol Pejeta Conservancy Game Drive · Lunch at Morani's · Sweetwaters Serena
Coffee Stop
**Mount Kenya / Aberdare:** Aberdare National Park Game Drive · Forest Hike Castle Forest
**Nyahururu:** Thomson Falls Visit
**Mara:** Maasai Village Visit
**Other:** Bike Riding · Photography Masterclass

Clean up: remove `TEST — Masai Mara Game Drive` and `TEST — Nairobi City Tour` [junk]; consider
merging `Game Drive` / `Guided Game Drive`.

## Parks (for park-fee pricing later, not the itinerary chat)

Mara Conservancy · Ol Pejeta Conservancy · Lake Nakuru National Park · Amboseli National Park
