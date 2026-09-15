-- Raise Local phase-one schema: campaign requests, business profiles, matches,
-- match event history, and post-campaign ratings. Mirrors the field names used
-- by the quiz + matching logic in src/app.js, src/matching.js, and
-- src/decision-tree-agent.js so client records map onto rows with no renaming.

create extension if not exists "pgcrypto";

create table if not exists campaign_requests (
  id text primary key,
  organization_name text not null,
  organization_type text,
  website text,
  social_links text,
  classification text,
  contact_name text,
  email text,
  phone text,
  communities_served text,
  mission text,
  audience_served text,
  audience_size integer default 0,
  campaign_description text,
  funding_goal numeric default 0,
  start_date date,
  end_date date,
  partnership_deadline date,
  timing_preference text,
  cause_area text,
  business_preference text,
  preferred_categories text[] default '{}',
  event_type text,
  partnership_types_needed text[] default '{}',
  support_needs text[] default '{}',
  expected_participation integer default 0,
  minimum_size integer default 0,
  ideal_size integer default 0,
  geography text,
  must_haves text,
  nice_to_haves text,
  prior_fundraiser text,
  status text default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_profiles (
  id text primary key,
  name text not null,
  website text,
  social_links text,
  contact_name text,
  email text,
  phone text,
  category text,
  business_goals text[] default '{}',
  service_areas text[] default '{}',
  fulfillment_scope text,
  cause_areas text[] default '{}',
  contribution_types text[] default '{}',
  partnership_types text[] default '{}',
  offer_types text[] default '{}',
  products_services text,
  average_price_range text,
  minimum_order_requirement numeric default 0,
  minimum_capacity integer default 0,
  maximum_capacity integer default 0,
  ideal_event_size integer default 0,
  campaign_cap integer default 0,
  active_campaigns integer default 0,
  estimated_unit_contribution numeric default 0,
  availability_preference text,
  available_from date,
  available_to date,
  lead_time_days integer default 0,
  fulfillment_options text[] default '{}',
  org_types_supported text[] default '{}',
  notes text,
  rating numeric,
  review_note text,
  unavailable boolean not null default false,
  status text default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references campaign_requests(id) on delete cascade,
  business_id text not null references business_profiles(id) on delete cascade,
  status text not null default 'recommended',
  decline_reason text,
  decline_note text,
  admin_note text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, business_id)
);

create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references business_profiles(id) on delete cascade,
  match_id uuid references matches(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists matches_request_id_idx on matches(request_id);
create index if not exists matches_business_id_idx on matches(business_id);
create index if not exists match_events_match_id_idx on match_events(match_id);
create index if not exists ratings_business_id_idx on ratings(business_id);

-- RLS: phase one has no auth, so the anon key is what the browser quiz uses.
-- Public intake (Match Finder) can INSERT its own submission but cannot read,
-- update, or delete anyone's data through the anon key. Admin review (Match
-- Review, ratings, event history) stays service-role-only until an admin
-- auth layer exists.
alter table campaign_requests enable row level security;
alter table business_profiles enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;
alter table ratings enable row level security;

create policy "anon can submit campaign requests"
  on campaign_requests for insert
  to anon
  with check (true);

create policy "anon can submit business profiles"
  on business_profiles for insert
  to anon
  with check (true);
