-- Keep workflow notifications available to the admin across browsers and
-- devices. Client users invoke the narrow RPC; they never choose a recipient.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  for_email text not null,
  message text not null,
  request_id text references campaign_requests(id) on delete cascade,
  business_id text references business_profiles(id) on delete cascade,
  type text not null default 'workflow',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx
  on notifications(lower(for_email), created_at desc);
alter table notifications enable row level security;
create policy "users can read their notifications"
  on notifications for select
  to authenticated
  using (lower(for_email) = lower(auth.email()) or public.is_raise_local_admin());
create policy "users can mark their notifications read"
  on notifications for update
  to authenticated
  using (lower(for_email) = lower(auth.email()) or public.is_raise_local_admin())
  with check (lower(for_email) = lower(auth.email()) or public.is_raise_local_admin());
create or replace function public.create_raise_local_admin_notification(
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
  admin_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select lower(email)
    into admin_email
    from auth.users
   where coalesce(raw_app_meta_data ->> 'role', '') = 'admin'
   order by created_at
   limit 1;

  if admin_email is null then
    return;
  end if;

  insert into notifications(for_email, message, request_id, business_id, type)
  values (admin_email, p_message, p_request_id, p_business_id, p_type);
end;
$$;
revoke all on function public.create_raise_local_admin_notification(text, text, text, text) from public;
grant execute on function public.create_raise_local_admin_notification(text, text, text, text) to authenticated;
