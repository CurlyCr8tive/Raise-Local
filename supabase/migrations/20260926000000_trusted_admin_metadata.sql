-- Move admin authorization out of user-editable metadata.
-- Set app_metadata.role = 'admin' for approved admin accounts in Supabase Auth.

create or replace function public.is_raise_local_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

revoke all on function public.is_raise_local_admin() from public;
grant execute on function public.is_raise_local_admin() to authenticated;

drop policy if exists "authenticated admins can update business quality" on business_profiles;
create policy "authenticated admins can update business quality"
  on business_profiles for update to authenticated
  using (public.is_raise_local_admin())
  with check (public.is_raise_local_admin());

drop policy if exists "authenticated admins can review ratings" on ratings;
create policy "authenticated admins can review ratings"
  on ratings for select to authenticated
  using (public.is_raise_local_admin());

drop policy if exists "authenticated users can read campaign requests" on campaign_requests;
create policy "authenticated users can read campaign requests"
  on campaign_requests for select to authenticated
  using (lower(email) = lower(auth.email()) or public.is_raise_local_admin());

drop policy if exists "authenticated users can update campaign requests" on campaign_requests;
create policy "authenticated users can update campaign requests"
  on campaign_requests for update to authenticated
  using (lower(email) = lower(auth.email()) or public.is_raise_local_admin())
  with check (lower(email) = lower(auth.email()) or public.is_raise_local_admin());

drop policy if exists "authenticated users can read business profiles" on business_profiles;
create policy "authenticated users can read business profiles"
  on business_profiles for select to authenticated
  using (lower(email) = lower(auth.email()) or public.is_raise_local_admin());

drop policy if exists "authenticated users can update business profiles" on business_profiles;
create policy "authenticated users can update business profiles"
  on business_profiles for update to authenticated
  using (lower(email) = lower(auth.email()) or public.is_raise_local_admin())
  with check (lower(email) = lower(auth.email()) or public.is_raise_local_admin());

drop policy if exists "authenticated users can read related matches" on matches;
create policy "authenticated users can read related matches"
  on matches for select to authenticated
  using (
    public.is_raise_local_admin()
    or exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email()))
    or exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email()))
  );

drop policy if exists "authenticated users can write related matches" on matches;
create policy "authenticated users can write related matches"
  on matches for insert to authenticated
  with check (
    public.is_raise_local_admin()
    or exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email()))
    or exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email()))
  );

drop policy if exists "authenticated users can update related matches" on matches;
create policy "authenticated users can update related matches"
  on matches for update to authenticated
  using (
    public.is_raise_local_admin()
    or exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email()))
    or exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email()))
  )
  with check (
    public.is_raise_local_admin()
    or exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email()))
    or exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email()))
  );

drop policy if exists "authenticated users can read related match events" on match_events;
create policy "authenticated users can read related match events"
  on match_events for select to authenticated
  using (
    exists (
      select 1 from matches m
      where m.id = match_id
        and (
          public.is_raise_local_admin()
          or exists (select 1 from campaign_requests r where r.id = m.request_id and lower(r.email) = lower(auth.email()))
          or exists (select 1 from business_profiles b where b.id = m.business_id and lower(b.email) = lower(auth.email()))
        )
    )
  );

drop policy if exists "authenticated users can write related match events" on match_events;
create policy "authenticated users can write related match events"
  on match_events for insert to authenticated
  with check (
    exists (
      select 1 from matches m
      where m.id = match_id
        and (
          public.is_raise_local_admin()
          or exists (select 1 from campaign_requests r where r.id = m.request_id and lower(r.email) = lower(auth.email()))
          or exists (select 1 from business_profiles b where b.id = m.business_id and lower(b.email) = lower(auth.email()))
        )
    )
  );
