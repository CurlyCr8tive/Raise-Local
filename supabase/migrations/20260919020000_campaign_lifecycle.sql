-- Track the nonprofit-facing campaign lifecycle without exposing other
-- organizations' requests to nonprofit users.

alter table campaign_requests add column if not exists campaign_stage text default 'submitted';
alter table campaign_requests add column if not exists success_details text;
