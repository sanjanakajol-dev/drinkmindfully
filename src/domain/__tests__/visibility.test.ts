import { cityById } from '../cities';
import {
  alcoholContentAge,
  BRAND_MIN_ALCOHOL_AGE,
  canSeeAlcoholicContent,
  type CityAlcoholRules,
  type Path,
} from '../visibility';

const today = '2026-10-10';
const bangalore = cityById('bangalore')!;
const lisbon = cityById('lisbon')!;
const paris = cityById('paris')!;

function sees(path: Path, dateOfBirth: string, city: CityAlcoholRules = bangalore) {
  return canSeeAlcoholicContent({ path, dateOfBirth, city, today });
}

describe('canSeeAlcoholicContent', () => {
  it('shows alcoholic content to Mindful users over the local legal age in a switched-on city', () => {
    expect(sees('mindful', '1995-01-01')).toBe(true);
  });

  it('never shows it on the Alcohol-free path', () => {
    expect(sees('alcohol_free', '1995-01-01')).toBe(false);
    expect(sees('alcohol_free', '1995-01-01', lisbon)).toBe(false);
  });

  it.each([
    // [city, date of birth, age on 2026-10-10, can see]
    ['bangalore', '2005-10-10', 21, false], // legal in Karnataka, but under the brand's 23
    ['bangalore', '2003-10-11', 22, false], // turns 23 tomorrow
    ['bangalore', '2003-10-10', 23, true],
    ['lisbon', '2008-01-01', 18, false], // legal in Portugal, but under 23
    ['lisbon', '2003-10-10', 23, true],
  ])(
    'applies the 23+ brand rule on top of local law: %s, born %s (age %i) → %s',
    (id, dob, _age, expected) => {
      expect(sees('mindful', dob, cityById(id)!)).toBe(expected);
    },
  );

  it('uses the local legal age where it is above 23', () => {
    const strictCity = { alcoholRecommendationsEnabled: true, legalDrinkingAge: 25 };
    expect(alcoholContentAge(strictCity)).toBe(25);
    expect(sees('mindful', '2002-10-10', strictCity)).toBe(false); // 24
    expect(sees('mindful', '2001-10-10', strictCity)).toBe(true); // 25
  });

  it('never goes below the brand minimum', () => {
    for (const city of [bangalore, lisbon, paris]) {
      expect(alcoholContentAge(city)).toBeGreaterThanOrEqual(BRAND_MIN_ALCOHOL_AGE);
    }
  });

  it('hides it where the city switch is off', () => {
    expect(sees('mindful', '1990-01-01', paris)).toBe(false);
  });

  it('matches the launch switch settings', () => {
    const on = ['bangalore', 'mysore', 'marbella', 'lisbon'];
    const off = ['mumbai', 'delhi', 'dubai', 'paris'];
    for (const id of on) expect(cityById(id)?.alcoholRecommendationsEnabled).toBe(true);
    for (const id of off) expect(cityById(id)?.alcoholRecommendationsEnabled).toBe(false);
  });
});
