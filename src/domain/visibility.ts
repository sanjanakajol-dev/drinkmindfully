import { ageOn } from './age';
import { type LocalDate } from './dates';

export type Path = 'mindful' | 'alcohol_free';

export type CityAlcoholRules = {
  alcoholRecommendationsEnabled: boolean;
  legalDrinkingAge: number;
};

/**
 * Whether alcoholic drinks, picks and venues may be shown to this user.
 *
 * All three must hold: the user is on the Mindful path, their city has alcoholic recommendations
 * switched on, and they are at least the city's legal drinking age. The server applies the same
 * rule before any content leaves the database; this copy exists for tests and offline screens.
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
    ageOn(input.dateOfBirth, input.today) >= input.city.legalDrinkingAge
  );
}
