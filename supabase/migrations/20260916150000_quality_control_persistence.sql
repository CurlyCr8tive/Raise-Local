-- Persist rating review state and admin pause decisions for Raise Local.

alter table business_profiles
  add column if not exists quality_status text not null default 'clear';

-- Admins are identified by the role captured in Supabase user metadata.
create policy "authenticated admins can update business quality"
  on business_profiles for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "authenticated users can submit ratings"
  on ratings for insert
  to authenticated
  with check (rating between 1 and 5);

create policy "authenticated admins can review ratings"
  on ratings for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Ratings are written by the reviewer, while this trigger safely maintains the
-- business summary without granting reviewers permission to edit profiles.
create or replace function update_business_quality_from_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  average_rating numeric;
begin
  select round(avg(rating)::numeric, 2)
    into average_rating
    from ratings
   where business_id = new.business_id;

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

drop trigger if exists ratings_update_business_quality on ratings;
create trigger ratings_update_business_quality
  after insert on ratings
  for each row execute function update_business_quality_from_rating();
