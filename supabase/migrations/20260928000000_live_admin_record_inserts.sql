-- Allow trusted Raise Local admins to add a client request or business profile
-- on a client's behalf from the admin workspace.

create policy "trusted admins can insert campaign requests"
  on campaign_requests for insert
  to authenticated
  with check (public.is_raise_local_admin());
create policy "trusted admins can insert business profiles"
  on business_profiles for insert
  to authenticated
  with check (public.is_raise_local_admin());
