-- Strengthen dataset metadata caching for TiDB-backed datasets
-- Run in Supabase SQL editor after 004 if your project already exists

alter table if exists datasets
  add column if not exists version_hash text,
  add column if not exists metadata_cached_at timestamptz;

alter table if exists dataset_tables
  add column if not exists table_size_estimate bigint default 0,
  add column if not exists last_refreshed_at timestamptz default now();
