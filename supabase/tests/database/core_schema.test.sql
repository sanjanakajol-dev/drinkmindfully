-- Row-level security and data rules for the core schema. Run with `npx supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Two users: A signed in with email, B anonymous.
insert into auth.users (id, aud, role, email, is_anonymous, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.dev', false, now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', null, true, now());

-- ---------------------------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.cities), 8, 'anyone can read the 8 launch cities');
select throws_ok('select * from public.profiles', '42501', null, 'signed-out visitors cannot read profiles');
select throws_ok(
  $$select public.upsert_day_mark('2026-10-01', 'alcohol_free', now())$$,
  '42501', null, 'signed-out visitors cannot log'
);

-- ---------------------------------------------------------------------------------------------
-- User A
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$insert into public.profiles (date_of_birth, home_city_id, path, usual_drinks_per_week,
      usual_drinking_days_per_week, usual_price_per_drink_minor, time_zone, started_on,
      health_data_consent_at)
    values ((current_date - interval '17 years')::date, 'bangalore', 'alcohol_free', 10, 3, 40000,
      'Asia/Kolkata', current_date, now())$$,
  '23514', null, 'under-18s cannot create a profile'
);

select throws_ok(
  $$insert into public.profiles (date_of_birth, home_city_id, path, usual_drinks_per_week,
      usual_drinking_days_per_week, usual_price_per_drink_minor, time_zone, started_on,
      health_data_consent_at)
    values ('1995-01-01', 'bangalore', 'mindful', 10, 3, 40000, 'Asia/Kolkata', current_date, now())$$,
  '23514', null, 'the Mindful path needs both weekly goals'
);

select lives_ok(
  $$insert into public.profiles (date_of_birth, home_city_id, path, alcohol_free_days_goal,
      max_drinks_per_week, usual_drinks_per_week, usual_drinking_days_per_week,
      usual_price_per_drink_minor, time_zone, started_on, health_data_consent_at)
    values ('1995-01-01', 'bangalore', 'mindful', 5, 6, 12, 4, 40000, 'Asia/Kolkata',
      current_date, now())$$,
  'an adult can create their own profile'
);

select lives_ok(
  $$select public.upsert_day_mark(current_date, 'alcohol_free', now() - interval '1 minute')$$,
  'a user can mark today alcohol-free'
);
select lives_ok(
  $$select public.upsert_day_mark(current_date, 'drank', now() - interval '1 hour')$$,
  'an older change from another device is accepted without error'
);
select is(
  (select mark::text from public.day_status where date = current_date),
  'alcohol_free',
  'but it does not overwrite the newer mark (last write wins)'
);
select lives_ok(
  $$select public.upsert_day_mark(current_date, null, now())$$,
  'a newer change can clear the mark'
);
select is(
  (select mark from public.day_status where date = current_date),
  null,
  'the cleared mark is stored'
);

select throws_ok(
  $$select public.upsert_day_mark(current_date - 10, 'alcohol_free', now())$$,
  '23514', null, 'days more than a week back cannot be filled in'
);
select throws_ok(
  $$select public.upsert_day_mark(current_date, 'alcohol_free', now() + interval '1 hour')$$,
  '23514', null, 'client times in the future are rejected'
);

select lives_ok(
  $$insert into public.drink_logs (id, date, alcoholic, drink_type, quantity, logged_at)
    values ('aaaaaaaa-0000-0000-0000-000000000001', current_date, true, 'beer', 2, now())$$,
  'a user can log a drink'
);
select lives_ok(
  $$insert into public.drink_logs (id, date, alcoholic, drink_type, quantity, logged_at)
    values ('aaaaaaaa-0000-0000-0000-000000000001', current_date, true, 'beer', 2, now())
    on conflict (id) do nothing$$,
  'retrying the same offline log is harmless'
);
select is((select count(*)::int from public.drink_logs), 1, 'and does not create a duplicate');

select throws_ok(
  $$insert into public.drink_logs (id, date, alcoholic, drink_type, quantity, logged_at)
    values (gen_random_uuid(), current_date, false, 'beer', 1, now())$$,
  '23514', null, 'an alcohol-free drink cannot be a beer'
);
select throws_ok(
  $$update public.drink_logs set quantity = 5 where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501', null, 'a logged drink cannot be edited'
);
select lives_ok(
  $$update public.drink_logs set deleted_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'but it can be deleted'
);

select throws_ok(
  $$insert into public.subscriptions (user_id, provider, provider_subscription_id, status,
      current_period_end)
    values ('11111111-1111-1111-1111-111111111111', 'razorpay', 'sub_fake', 'active',
      now() + interval '30 days')$$,
  '42501', null, 'users cannot grant themselves premium'
);
select is(public.is_premium(), false, 'A starts without premium');
select is(public.can_see_alcoholic_content(), true,
  'a Mindful adult over 21 in Bangalore can see alcoholic content');

-- ---------------------------------------------------------------------------------------------
-- A payment webhook (running as the table owner) activates A's subscription
-- ---------------------------------------------------------------------------------------------
reset role;
insert into public.subscriptions (user_id, provider, provider_subscription_id, status, current_period_end)
values ('11111111-1111-1111-1111-111111111111', 'razorpay', 'sub_real', 'active', now() + interval '30 days');

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(public.is_premium(), true, 'A is premium after the webhook');
select lives_ok(
  $$insert into public.support_requests (name, contact, country_code, message)
    values ('A', 'a@test.dev', 'IN', 'Please call me')$$,
  'a user can send a support request'
);
select throws_ok('select * from public.support_requests', '42501', null,
  'but cannot read support requests back');

select lives_ok($$update public.profiles set path = 'alcohol_free'$$, 'A switches to Alcohol-free');
select is(public.can_see_alcoholic_content(), false,
  'the Alcohol-free path never sees alcoholic content');

-- ---------------------------------------------------------------------------------------------
-- User B (anonymous) cannot see or touch A's data
-- ---------------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "is_anonymous": true}';

select is(
  (select count(*)::int from public.day_status) + (select count(*)::int from public.drink_logs)
    + (select count(*)::int from public.profiles) + (select count(*)::int from public.subscriptions),
  0,
  'B sees none of A''s profile, days, drinks or subscriptions'
);
select throws_ok(
  $$insert into public.drink_logs (id, user_id, date, alcoholic, drink_type, quantity, logged_at)
    values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', current_date, true, 'wine', 1,
      now())$$,
  '42501', null, 'B cannot log a drink as A'
);
select throws_ok(
  $$insert into public.support_requests (name, contact, country_code, message, priority)
    values ('B', '+911234567890', 'IN', 'Hi', true)$$,
  '42501', null, 'clients cannot claim priority support'
);
select lives_ok(
  $$insert into public.support_requests (name, contact, country_code, message)
    values ('B', '+911234567890', 'IN', 'Hi')$$,
  'an anonymous user can send a support request'
);

reset role;
select is(
  (select array_agg(priority order by name) from public.support_requests),
  array[true, false],
  'priority comes from premium status, not from the client'
);

select * from finish();
rollback;
