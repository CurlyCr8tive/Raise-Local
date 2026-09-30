-- Store two-sided post-campaign experience ratings by completed partnership.

alter table ratings
  add column if not exists request_id text references campaign_requests(id) on delete cascade,
  add column if not exists rater_role text,
  add column if not exists rated_role text,
  add column if not exists communication_rating integer check (communication_rating between 1 and 5),
  add column if not exists reliability_rating integer check (reliability_rating between 1 and 5),
  add column if not exists turnout_rating integer check (turnout_rating between 1 and 5),
  add column if not exists fulfillment_rating integer check (fulfillment_rating between 1 and 5),
  add column if not exists would_work_again boolean;

update ratings
   set rated_role = coalesce(rated_role, 'business'),
       rater_role = coalesce(rater_role, 'nonprofit')
 where rated_role is null
    or rater_role is null;

create unique index if not exists ratings_one_response_per_side_idx
  on ratings(request_id, business_id, rater_role)
  where request_id is not null and business_id is not null and rater_role is not null;

create index if not exists ratings_request_id_idx on ratings(request_id);
create index if not exists ratings_match_id_idx on ratings(match_id);

drop policy if exists "authenticated users can submit ratings" on ratings;
create policy "authenticated users can submit ratings"
  on ratings for insert to authenticated
  with check (
    rating between 1 and 5
    and (
      public.is_raise_local_admin()
      or (rater_role = 'nonprofit' and exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email())))
      or (rater_role = 'business' and exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email())))
    )
  );

drop policy if exists "authenticated users can read related ratings" on ratings;
create policy "authenticated users can read related ratings"
  on ratings for select to authenticated
  using (
    public.is_raise_local_admin()
    or exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email()))
    or exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email()))
  );

drop policy if exists "authenticated users can update own related ratings" on ratings;
create policy "authenticated users can update own related ratings"
  on ratings for update to authenticated
  using (
    public.is_raise_local_admin()
    or (rater_role = 'nonprofit' and exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email())))
    or (rater_role = 'business' and exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email())))
  )
  with check (
    public.is_raise_local_admin()
    or (rater_role = 'nonprofit' and exists (select 1 from campaign_requests r where r.id = request_id and lower(r.email) = lower(auth.email())))
    or (rater_role = 'business' and exists (select 1 from business_profiles b where b.id = business_id and lower(b.email) = lower(auth.email())))
  );

-- Keep the business quality summary tied to nonprofit feedback about the
-- business. Business feedback about a nonprofit remains match history only.
create or replace function update_business_quality_from_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  average_rating numeric;
begin
  if coalesce(new.rated_role, 'business') <> 'business' then
    return new;
  end if;

  select round(avg(rating)::numeric, 2)
    into average_rating
    from ratings
   where business_id = new.business_id
     and coalesce(rated_role, 'business') = 'business';

  update business_profiles
     set rating = average_rating,
         review_note = new.review_note,
         quality_status = case
           when average_rating <= 2.5 and quality_status <> 'paused' then 'needs_review'
           when average_rating > 2.5 and quality_status = 'needs_review' then 'clear'
           else quality_status
         end,
         updated_at = now()
   where id = new.business_id;

  return new;
end;
$$;
