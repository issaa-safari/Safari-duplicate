-- Content library cleanup — run once in Supabase → SQL Editor.
--
-- Safe: every deleted row was verified to have ZERO references (no rate cards,
-- no quote items, no tour days), and it runs in a transaction. It intentionally
-- LEAVES ambiguous pairs for you to judge in Admin → Content:
--   • Hills Gate (budget) vs Hillsgate Experience (luxury) — same place or not?
--   • Game Drive vs Guided Game Drive — merge if you want.
--   • Mount Kenya Forest is kept (it has content); the empty "Mount Kenya" dup is removed.
--
-- After running, regenerate docs/ai-intake/library.md for your Project.

begin;

-- 1. Normalize budget tiers to the app's values (budget / midrange / luxury / ultra)
update accommodations set budget_tier = 'midrange' where budget_tier = 'mid_range';
update accommodations set budget_tier = 'ultra'    where budget_tier = 'ultra_luxury';

-- 2. Fix typos (rename — no name collision)
update destinations   set name = 'Naro Moru'          where id = '2a0c2ae7-b8b3-4a90-bfde-3106bc414222'; -- Norumoro
update destinations   set name = 'Ol Pejeta'          where id = '9e29b63a-f2fa-4b6c-bd2c-2fe252ab4215'; -- Ol Pegeta
update accommodations set name = 'Furnished Apartment' where id = '7df54a69-fdbd-4b55-a827-14a74fc9e051'; -- Furished Apartment

-- 3. Remove duplicate / junk accommodations (all zero-reference)
delete from accommodations where id in (
  '11ce94d2-e564-483c-b581-862e928bc66d', -- Sarova Stanley            (dup of "… Nairobi")
  'cd0e3fb9-5d2d-4740-a24c-d4ba04fa45ab', -- Sarova Panafric           (dup of "… Nairobi")
  'a536fb2a-eb8c-4997-9090-db5b5eebd25f', -- Sarova Imperial           (dup of "… Hotel Kisumu")
  '04b446d7-ba65-434d-89e2-a52bf50d607d', -- Sarova Whitesands Resort  (dup of "… & Spa")
  '091482ec-4e9c-472d-b3ba-5cb5057f4905', -- Furnished apartment       (dup)
  '5c02466d-336d-4828-adf4-ad7cf3cc8f99', -- Lake Oloide Flaingo Camp  (typo dup of "Oloiden Flamingo")
  'ec2701f7-d3d8-453b-a381-5eb9585411ea'  -- "P"                       (junk)
);

-- 4. Remove empty duplicate destinations (zero-reference; Naivasha's only lodge removed above)
delete from destinations where id in (
  'bc363aa3-a9aa-42ed-ba4a-13c70acc80e7', -- Amboseli National Park      (dup of Amboseli)
  'f031d2b8-c5ca-4e83-aaee-57d70d878800', -- Masai Mara National Reserve (dup of Masai Mara)
  '9157e6c4-6da4-459e-a373-88ddb62407e7', -- Lake Nakuru National Park   (dup of Nakuru)
  '9f17baff-3a34-4649-8d4a-2177e912d073', -- Mombsa                      (typo dup of Mombasa)
  '6e170b98-ba66-45e6-84fd-637fbd1e12f1', -- Mount Kenya                 (empty dup; keep Mount Kenya Forest)
  'c7257e1c-eb8b-40af-8fca-273d5389cacb'  -- Naivasha                    (dup of Lake Naivasha)
);

-- 5. Remove TEST activities
delete from activities where id in (
  'aaaa1111-0000-4000-8000-000000000004', -- TEST — Masai Mara Game Drive
  'aaaa1111-0000-4000-8000-000000000005'  -- TEST — Nairobi City Tour
);

commit;
