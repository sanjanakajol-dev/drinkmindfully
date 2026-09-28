import { ageOn } from './age';
import { type LocalDate } from './dates';

export type Path = 'mindful' | 'alcohol_free';

export type CityAlcoholRules = {
  alcoholRecommendationsEnabled: boolean;
  legalDrinkingAge: number;
};

/**
 * Drink Mindfully's own minimum age for alcoholic content, applied everywhere on top of local law.
 * Mirrored in `public.can_see_alcoholic_content()`.
 */
export const BRAND_MIN_ALCOHOL_AGE = 23;

/** The age a user must reach in this city: the brand minimum or the local legal age, if higher. */
export function alcoholContentAge(city: CityAlcoholRules): number {
  return Math.max(BRAND_MIN_ALCOHOL_AGE, city.legalDrinkingAge);
}

/**
 * Whether alcoholic drinks, picks and venues may be shown to this user.
 *
 * All three must hold: the user is on the Mindful path, their city has alcoholic recommendations
 * switched on, and they have reached {@link alcoholContentAge}. The server applies the same rule
 * before any content leaves the database; this copy exists for tests and offline screens.
 */
export function canSeeAlcoholicContent(input: {
  path: Path;
  dateOfBirth: LocalDate;
  city: CityAlcoholRules;
  today: LocalDate;
}): boolean {
  return (
    input.path === 'mindful' &&
    input.city.alcoholRecommendationsEnabled &&
    ageOn(input.dateOfBirth, input.today) >= alcoholContentAge(input.city)
  );
}
