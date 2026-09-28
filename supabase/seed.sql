-- Launch cities. Keep in sync with src/domain/cities.ts (a unit test checks this file).
-- Legal drinking ages for Delhi and Mumbai must be re-checked before their alcohol switch is turned on.
insert into public.cities
  (id, name, country_code, currency, time_zone, legal_drinking_age, alcohol_recommendations_enabled, emergency_number)
values
  ('bangalore', 'Bangalore', 'IN', 'INR', 'Asia/Kolkata', 21, true, '112'),
  ('mysore', 'Mysore', 'IN', 'INR', 'Asia/Kolkata', 21, true, '112'),
  ('mumbai', 'Mumbai', 'IN', 'INR', 'Asia/Kolkata', 25, false, '112'),
  ('delhi', 'Delhi', 'IN', 'INR', 'Asia/Kolkata', 25, false, '112'),
  ('dubai', 'Dubai', 'AE', 'AED', 'Asia/Dubai', 21, false, '999'),
  ('marbella', 'Marbella', 'ES', 'EUR', 'Europe/Madrid', 18, true, '112'),
  ('paris', 'Paris', 'FR', 'EUR', 'Europe/Paris', 18, false, '112'),
  ('lisbon', 'Lisbon', 'PT', 'EUR', 'Europe/Lisbon', 18, true, '112')
on conflict (id) do update set
  name = excluded.name,
  country_code = excluded.country_code,
  currency = excluded.currency,
  time_zone = excluded.time_zone,
  legal_drinking_age = excluded.legal_drinking_age,
  alcohol_recommendations_enabled = excluded.alcohol_recommendations_enabled,
  emergency_number = excluded.emergency_number;
