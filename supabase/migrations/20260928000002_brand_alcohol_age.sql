-- Brand rule: alcoholic content is shown only to users aged 23 or over, and never below the city's
-- legal drinking age. Mirrors BRAND_MIN_ALCOHOL_AGE and alcoholContentAge() in
-- src/domain/visibility.ts.
create or replace function public.can_see_alcoholic_content() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.path = 'mindful'
      and c.alcohol_recommendations_enabled
      and extract(year from age((now() at time zone p.time_zone)::date, p.date_of_birth))
        >= greatest(23, c.legal_drinking_age)
    from public.profiles p
    join public.cities c on c.id = p.home_city_id
    where p.id = auth.uid()
  ), false);
$$;
