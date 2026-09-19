-- Store the two-sided consent state without widening profile visibility.
-- Counterpart records should be exposed through matches or a future server-side
-- matching function, not by granting either role access to the entire pool.

alter table matches add column if not exists nonprofit_decision text;
alter table matches add column if not exists business_decision text;
alter table matches add column if not exists outreach_status text default 'not_started';
alter table matches add column if not exists outreach_message text;
alter table matches add column if not exists outreach_at timestamptz;

create index if not exists matches_outreach_status_idx on matches (outreach_status);
