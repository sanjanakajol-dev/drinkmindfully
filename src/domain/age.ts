import { type LocalDate } from './dates';

export const MINIMUM_AGE = 18;

/**
 * Completed years of age on `on`.
 *
 * Someone born on 29 February turns a year older on 1 March in non-leap years, which is the
 * conservative choice for age checks.
 */
export function ageOn(dateOfBirth: LocalDate, on: LocalDate): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [oy, om, od] = on.split('-').map(Number);
  const hadBirthday = om > bm || (om === bm && od >= bd);
  return oy - by - (hadBirthday ? 0 : 1);
}

export function isAdult(dateOfBirth: LocalDate, on: LocalDate): boolean {
  return ageOn(dateOfBirth, on) >= MINIMUM_AGE;
}
