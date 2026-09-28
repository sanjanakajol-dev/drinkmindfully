import { readFileSync } from 'fs';
import { join } from 'path';

import { CITIES } from '../cities';

describe('city reference data', () => {
  const seed = readFileSync(join(__dirname, '../../../supabase/seed.sql'), 'utf8');

  it.each(CITIES.map((c) => [c.id, c]))('%s matches supabase/seed.sql', (_id, city) => {
    const row =
      `('${city.id}', '${city.name}', '${city.countryCode}', '${city.currency}', ` +
      `'${city.timeZone}', ${city.legalDrinkingAge}, ${city.alcoholRecommendationsEnabled}, ` +
      `'${city.emergencyNumber}')`;
    expect(seed).toContain(row);
  });

  it('has no cities in the seed that the app does not know about', () => {
    const seededIds = [...seed.matchAll(/^\s+\('([a-z_]+)',/gm)].map((m) => m[1]);
    expect(seededIds.sort()).toEqual(CITIES.map((c) => c.id).sort());
  });
});
