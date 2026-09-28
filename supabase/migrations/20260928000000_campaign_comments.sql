create table if not exists campaign_comments (
  id text primary key,
  request_id text references campaign_requests(id) on delete cascade,
  business_id text references business_profiles(id) on delete cascade,
  author_email text not null,
  author_role text not null default 'client',
  body text not null,
  visibility text not null default 'shared' check (visibility in ('shared', 'admin')),
  created_at timestamptz not null default now(),
  check (request_id is not null or business_id is not null)
);

create index if not exists campaign_comments_request_id_idx on campaign_comments(request_id);
create index if not exists campaign_comments_business_id_idx on campaign_comments(business_id);
create index if not exists campaign_comments_created_at_idx on campaign_comments(created_at);

alter table campaign_comments enable row level security;

drop policy if exists "authenticated users can read related campaign comments" on campaign_comments;
create policy "authenticated users can read related campaign comments"
  on campaign_comments for select to authenticated
  using (
    public.is_raise_local_admin()
    or exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email()))
    or exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email()))
  );

drop policy if exists "authenticated users can create related campaign comments" on campaign_comments;
create policy "authenticated users can create related campaign comments"
  on campaign_comments for insert to authenticated
  with check (
    public.is_raise_local_admin()
    or exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email()))
    or exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email()))
  );
