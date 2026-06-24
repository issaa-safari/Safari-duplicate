-- Group 19: Add quote-level cost base for simplified pricing calculation
-- Allows users to input a manual cost base and markup % instead of only
-- relying on aggregate cost calculations from price lines.

alter table quote_versions
  add column if not exists cost_base_usd numeric(14,2) check (cost_base_usd is null or cost_base_usd >= 0);

-- Index for queries that filter by cost_base
create index if not exists quote_versions_cost_base_idx on quote_versions (cost_base_usd) where cost_base_usd is not null;
