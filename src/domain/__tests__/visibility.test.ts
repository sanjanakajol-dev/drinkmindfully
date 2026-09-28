import { cityById } from '../cities';
import { canSeeAlcoholicContent, type Path } from '../visibility';

const today = '2026-10-10';
const bangalore = cityById('bangalore')!;
const lisbon = cityById('lisbon')!;
const paris = cityById('paris')!;

function sees(path: Path, dateOfBirth: string, city = bangalore) {
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

  it('uses the city legal drinking age, not the app minimum of 18', () => {
    expect(sees('mindful', '2006-01-01')).toBe(false); // 20 in Bangalore (21)
    expect(sees('mindful', '2005-10-10')).toBe(true); // 21 today
    expect(sees('mindful', '2008-01-01', lisbon)).toBe(true); // 18 in Lisbon (18)
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
