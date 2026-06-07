-- TiDB dataset metadata migration
-- Run in Supabase SQL editor

alter table if exists datasets
  add column if not exists status text default 'READY',
  add column if not exists table_prefix text,
  add column if not exists table_count int default 0,
  add column if not exists row_count int default 0,
  add column if not exists tidb_database_name text,
  add column if not exists error_message text,
  add column if not exists version_hash text,
  add column if not exists metadata_cached_at timestamptz;

create table if not exists dataset_tables (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  original_table_name text not null,
  physical_table_name text not null,
  columns_json jsonb default '[]'::jsonb,
  row_count int default 0,
  sample_rows_json jsonb default '[]'::jsonb,
  table_size_estimate bigint default 0,
  last_refreshed_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (dataset_id, original_table_name),
  unique (physical_table_name)
);

create index if not exists idx_dataset_tables_dataset_id on dataset_tables(dataset_id);
