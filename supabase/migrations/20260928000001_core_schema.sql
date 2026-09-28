-- Core schema for Drink Mindfully v1: reference data, profiles, logging, subscriptions, support.
--
-- Security model:
--   * Row-level security is on for every table.
--   * Table privileges are revoked from the API roles and granted back one by one, so nothing is
--     writable by accident.
--   * Users (including anonymous sign-ins, which use the `authenticated` role) only ever touch
--     their own rows. Subscriptions are written by server functions only.

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Reference data (seeded now, synced from the master Google Sheet later)
-- ---------------------------------------------------------------------------------------------

create table public.cities (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency text not null check (currency in ('INR', 'EUR', 'AED')),
  time_zone text not null,
  legal_drinking_age smallint not null check (legal_drinking_age between 18 and 30),
  alcohol_recommendations_enabled boolean not null default false,
  emergency_number text not null,
  premium_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cities_updated_at before update on public.cities
  for each row execute function public.set_updated_at();

create table public.helplines (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  name text not null,
  phone text,
  url text,
  hours text,
  verified boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is not null or url is not null)
);

create index helplines_country_idx on public.helplines (country_code, sort_order);

create trigger helplines_updated_at before update on public.helplines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------------------------

create type public.drinking_path as enum ('mindful', 'alcohol_free');

create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  date_of_birth date not null,
  home_city_id text not null references public.cities (id),
  path public.drinking_path not null,
  alcohol_free_days_goal smallint check (alcohol_free_days_goal between 0 and 7),
  max_drinks_per_week smallint check (max_drinks_per_week between 0 and 100),
  usual_drinks_per_week numeric(5, 1) not null check (usual_drinks_per_week between 0 and 200),
  usual_drinking_days_per_week smallint not null
    check (usual_drinking_days_per_week between 0 and 7),
  usual_price_per_drink_minor integer not null
    check (usual_price_per_drink_minor between 0 and 10000000),
  time_zone text not null,
  -- The user's first logical day; partial first weeks are not judged.
  started_on date not null,
  health_data_consent_at timestamptz not null,
  analytics_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mindful_goals_required check (
    path = 'alcohol_free'
    or (alcohol_free_days_goal is not null and max_drinks_per_week is not null)
  )
);

create function public.enforce_adult_profile() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Drink Mindfully is for adults aged 18 or over'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_adult before insert or update of date_of_birth on public.profiles
  for each row execute function public.enforce_adult_profile();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Logging
-- ---------------------------------------------------------------------------------------------

create type public.day_mark as enum ('alcohol_free', 'drank');

-- What the user explicitly said about a day. A null mark means they cleared it. The displayed status
-- also depends on drink_logs: a detailed alcoholic drink always makes the day "drank".
create table public.day_status (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  mark public.day_mark,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date),
  -- Back-fill window: up to 7 days before the day it was recorded, with a day of time-zone slack.
  constraint day_status_backfill_window check (
    date between (client_updated_at at time zone 'UTC')::date - 8
      and (client_updated_at at time zone 'UTC')::date + 1
  )
);

create table public.drink_logs (
  -- Generated on the device so offline retries are idempotent.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  alcoholic boolean not null,
  drink_type text not null,
  quantity smallint not null check (quantity between 1 and 20),
  reason text check (char_length(reason) <= 200),
  logged_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint drink_type_matches_kind check (
    (alcoholic and drink_type in ('beer', 'wine', 'spirit', 'cocktail', 'other'))
    or (not alcoholic and drink_type in ('mocktail', 'af_beer', 'af_wine', 'af_spirit', 'other'))
  ),
  constraint drink_logs_backfill_window check (
    date between (logged_at at time zone 'UTC')::date - 8
      and (logged_at at time zone 'UTC')::date + 1
  )
);

create index drink_logs_user_date_idx on public.drink_logs (user_id, date);

-- Device clocks can drift a little, but nothing may be logged from the future. The trigger argument
-- names the column holding the device's timestamp.
create function public.reject_future_client_time() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) ->> tg_argv[0])::timestamptz > now() + interval '10 minutes' then
    raise exception 'Client time is in the future' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger drink_logs_no_future before insert on public.drink_logs
  for each row execute function public.reject_future_client_time('logged_at');

create trigger day_status_no_future before insert or update on public.day_status
  for each row execute function public.reject_future_client_time('client_updated_at');

-- Last write wins, judged by the device's time, so a late offline sync cannot overwrite a newer
-- change made on another device.
create function public.upsert_day_mark(
  p_date date,
  p_mark public.day_mark,
  p_client_updated_at timestamptz
) returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.day_status (user_id, date, mark, client_updated_at)
  values (auth.uid(), p_date, p_mark, p_client_updated_at)
  on conflict (user_id, date) do update
    set mark = excluded.mark,
        client_updated_at = excluded.client_updated_at,
        updated_at = now()
    where public.day_status.client_updated_at < excluded.client_updated_at;
$$;

-- ---------------------------------------------------------------------------------------------
-- Subscriptions (written only by payment webhooks running with the service role)
-- ---------------------------------------------------------------------------------------------

create type public.subscription_status as enum ('active', 'grace', 'cancelled', 'expired');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('razorpay', 'apple', 'google')),
  provider_subscription_id text not null,
  status public.subscription_status not null,
  -- End of access: the paid period, or the retry window while in grace.
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index subscriptions_user_idx on public.subscriptions (user_id);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Mirrors src/domain/entitlements.ts.
create function public.is_premium() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.status <> 'expired'
      and s.current_period_end > now()
  );
$$;

-- Mirrors src/domain/visibility.ts: Mindful path, city switch on, and at least the local legal age
-- on the user's own calendar day.
create function public.can_see_alcoholic_content() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.path = 'mindful'
      and c.alcohol_recommendations_enabled
      and extract(year from age((now() at time zone p.time_zone)::date, p.date_of_birth))
        >= c.legal_drinking_age
    from public.profiles p
    join public.cities c on c.id = p.home_city_id
    where p.id = auth.uid()
  ), false);
$$;

-- ---------------------------------------------------------------------------------------------
-- Support requests (write-only for users; read by the support inbox function)
-- ---------------------------------------------------------------------------------------------

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  contact text not null check (char_length(contact) between 3 and 200),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  message text not null check (char_length(message) between 1 and 2000),
  -- Set by the server from is_premium(); clients cannot claim priority.
  priority boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.set_support_priority() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.priority := public.is_premium();
  new.created_at := now();
  return new;
end;
$$;

create trigger support_requests_priority before insert on public.support_requests
  for each row execute function public.set_support_priority();

-- ---------------------------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------------------------

-- Support requests are deleted 90 days after they arrive. Anonymous accounts with no logging
-- activity for 180 days are deleted (their data cascades).
create function public.purge_expired_data() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.support_requests where created_at < now() - interval '90 days';

  delete from auth.users u
  where u.is_anonymous
    and u.created_at < now() - interval '180 days'
    and not exists (
      select 1 from public.day_status d
      where d.user_id = u.id and d.updated_at >= now() - interval '180 days'
    )
    and not exists (
      select 1 from public.drink_logs l
      where l.user_id = u.id and l.created_at >= now() - interval '180 days'
    );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Privileges and row-level security
-- ---------------------------------------------------------------------------------------------

alter table public.cities enable row level security;
alter table public.helplines enable row level security;
alter table public.profiles enable row level security;
alter table public.day_status enable row level security;
alter table public.drink_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.support_requests enable row level security;

revoke all on
  public.cities, public.helplines, public.profiles, public.day_status, public.drink_logs,
  public.subscriptions, public.support_requests
from anon, authenticated;

revoke execute on function
  public.upsert_day_mark(date, public.day_mark, timestamptz),
  public.is_premium(),
  public.can_see_alcoholic_content(),
  public.purge_expired_data()
from public, anon, authenticated;

-- Reference data: readable by everyone, including before sign-in.
grant select on public.cities, public.helplines to anon, authenticated;
create policy "Reference data is public" on public.cities for select using (true);
create policy "Reference data is public" on public.helplines for select using (true);

-- Profiles: own row only.
grant select, insert, update on public.profiles to authenticated;
create policy "Own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Day status: own rows only; writes go through upsert_day_mark for last-write-wins.
grant select, insert on public.day_status to authenticated;
grant update (mark, client_updated_at, updated_at) on public.day_status to authenticated;
create policy "Own day status" on public.day_status for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant execute on function public.upsert_day_mark(date, public.day_mark, timestamptz)
  to authenticated;

-- Drink logs: own rows only; a logged drink can be deleted (soft) but never edited.
grant select, insert on public.drink_logs to authenticated;
grant update (deleted_at) on public.drink_logs to authenticated;
create policy "Own drink logs" on public.drink_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Subscriptions: users can read their own; only the service role writes.
grant select on public.subscriptions to authenticated;
create policy "Read own subscriptions" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- Support requests: users can send, never read back.
grant insert (name, contact, country_code, message) on public.support_requests to authenticated;
create policy "Send support requests" on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

grant execute on function public.is_premium(), public.can_see_alcoholic_content()
  to authenticated;
