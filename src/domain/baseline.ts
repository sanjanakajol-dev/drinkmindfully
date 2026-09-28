/** What the user told us about their drinking before they started, used for money saved. */
export type DrinkingBaseline = {
  usualDrinksPerWeek: number;
  usualDrinkingDaysPerWeek: number;
  /** Price of one drink in minor currency units (paise, cents, fils). */
  usualPricePerDrinkMinor: number;
};

/**
 * Drinks assumed for a day where the user only tapped "I drank" without details: their usual
 * amount on a drinking day, and never less than one.
 */
export function typicalDrinkingDayDrinks(baseline: DrinkingBaseline): number {
  const perDay = baseline.usualDrinksPerWeek / Math.max(1, baseline.usualDrinkingDaysPerWeek);
  return Math.max(1, perDay);
}
