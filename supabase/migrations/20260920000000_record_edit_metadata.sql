-- Preserve edit provenance so client and admin updates can be merged safely.
alter table campaign_requests
  add column if not exists field_sources jsonb not null default '{}'::jsonb,
  add column if not exists pending_changes jsonb not null default '[]'::jsonb,
  add column if not exists revision integer not null default 1,
  add column if not exists last_edited_at timestamptz,
  add column if not exists last_edited_by text;

alter table business_profiles
  add column if not exists field_sources jsonb not null default '{}'::jsonb,
  add column if not exists pending_changes jsonb not null default '[]'::jsonb,
  add column if not exists revision integer not null default 1,
  add column if not exists last_edited_at timestamptz,
  add column if not exists last_edited_by text;
