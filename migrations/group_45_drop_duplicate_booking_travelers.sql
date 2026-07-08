-- Group 45: drop the dead `booking_travelers` (American spelling) table.
--
-- group_00 created it as a near-empty stub (id, created_at only) and group_31
-- turned on RLS for it, but no later migration ever added columns to it and
-- no application code (app/, lib/) references it. The real, actively-used
-- table is `booking_travellers` (British spelling — group_21/27/34). Having
-- both live side by side is a latent bug: it's empty today, but any future
-- code that mistypes the spelling would silently write to the wrong table.
--
-- Idempotent — safe to re-run.

drop table if exists booking_travelers;
