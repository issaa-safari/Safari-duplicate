-- Group 100: small database hardening items from the production advisor review.

-- Covers the nullable foreign key used when returning or reconciling a bike
-- security deposit. The FK itself does not create an index automatically.
create index if not exists security_deposits_motorbike_id_idx
  on public.security_deposits (motorbike_id)
  where motorbike_id is not null;

-- is_admin_user() intentionally remains SECURITY DEFINER. It exposes only a
-- boolean membership check and is the gate used by existing RLS policies; an
-- automatic revoke would break authenticated admin access. Its fixed body and
-- search path were reviewed separately during this release.
