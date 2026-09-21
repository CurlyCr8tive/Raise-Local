-- Capture the two fields requested for Wix sign-up alignment and stronger matches.
alter table campaign_requests
  add column if not exists campaign_type text;

alter table business_profiles
  add column if not exists pricing_point text;
