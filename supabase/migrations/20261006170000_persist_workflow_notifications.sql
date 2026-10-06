-- Persist per-recipient workflow notifications from authenticated app actions.
-- The function keeps writes narrow: admins can notify anyone, while client
-- users can only create notifications tied to their own related records.

create or replace function public.create_raise_local_notification(
  p_for_email text,
  p_message text,
  p_request_id text default null,
  p_business_id text default null,
  p_type text default 'workflow'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_for_email text := lower(trim(p_for_email));
  actor_email text := lower(auth.email());
  allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if normalized_for_email is null or normalized_for_email = '' then
    raise exception 'Notification recipient is required';
  end if;

  allowed := public.is_raise_local_admin()
    or normalized_for_email = actor_email
    or exists (
      select 1
        from campaign_requests r
       where r.id = p_request_id
         and lower(r.email) in (actor_email, normalized_for_email)
    )
    or exists (
      select 1
        from business_profiles b
       where b.id = p_business_id
         and lower(b.email) in (actor_email, normalized_for_email)
    )
    or exists (
      select 1
        from matches m
        join campaign_requests r on r.id = m.request_id
        join business_profiles b on b.id = m.business_id
       where (p_request_id is null or m.request_id = p_request_id)
         and (p_business_id is null or m.business_id = p_business_id)
         and actor_email in (lower(r.email), lower(b.email))
         and normalized_for_email in (lower(r.email), lower(b.email))
    );

  if not allowed then
    raise exception 'Not allowed to create this notification';
  end if;

  insert into notifications(for_email, message, request_id, business_id, type)
  values (normalized_for_email, p_message, p_request_id, p_business_id, coalesce(nullif(p_type, ''), 'workflow'));
end;
$$;

revoke all on function public.create_raise_local_notification(text, text, text, text, text) from public;
grant execute on function public.create_raise_local_notification(text, text, text, text, text) to authenticated;
