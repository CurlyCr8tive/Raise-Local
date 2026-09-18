-- Allow signed-in Raise Local users to read and update their own records,
-- and to persist match decisions and event history across devices.

create policy "authenticated users can read campaign requests"
  on campaign_requests for select
  to authenticated
  using (
    lower(email) = lower(auth.email())
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated users can update campaign requests"
  on campaign_requests for update
  to authenticated
  using (
    lower(email) = lower(auth.email())
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  with check (
    lower(email) = lower(auth.email())
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated users can read business profiles"
  on business_profiles for select
  to authenticated
  using (
    lower(email) = lower(auth.email())
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated users can update business profiles"
  on business_profiles for update
  to authenticated
  using (
    lower(email) = lower(auth.email())
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  with check (
    lower(email) = lower(auth.email())
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated users can read related matches"
  on matches for select
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from campaign_requests r
      where r.id = request_id and lower(r.email) = lower(auth.email())
    )
    or exists (
      select 1 from business_profiles b
      where b.id = business_id and lower(b.email) = lower(auth.email())
    )
  );

create policy "authenticated users can write related matches"
  on matches for insert
  to authenticated
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from campaign_requests r
      where r.id = request_id and lower(r.email) = lower(auth.email())
    )
    or exists (
      select 1 from business_profiles b
      where b.id = business_id and lower(b.email) = lower(auth.email())
    )
  );

create policy "authenticated users can update related matches"
  on matches for update
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from campaign_requests r
      where r.id = request_id and lower(r.email) = lower(auth.email())
    )
    or exists (
      select 1 from business_profiles b
      where b.id = business_id and lower(b.email) = lower(auth.email())
    )
  )
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from campaign_requests r
      where r.id = request_id and lower(r.email) = lower(auth.email())
    )
    or exists (
      select 1 from business_profiles b
      where b.id = business_id and lower(b.email) = lower(auth.email())
    )
  );

create policy "authenticated users can read related match events"
  on match_events for select
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.id = match_id
        and (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
          or exists (select 1 from campaign_requests r where r.id = m.request_id and lower(r.email) = lower(auth.email()))
          or exists (select 1 from business_profiles b where b.id = m.business_id and lower(b.email) = lower(auth.email()))
        )
    )
  );

create policy "authenticated users can write related match events"
  on match_events for insert
  to authenticated
  with check (
    exists (
      select 1 from matches m
      where m.id = match_id
        and (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
          or exists (select 1 from campaign_requests r where r.id = m.request_id and lower(r.email) = lower(auth.email()))
          or exists (select 1 from business_profiles b where b.id = m.business_id and lower(b.email) = lower(auth.email()))
        )
    )
  );
