import { type DrinkingBaseline } from './baseline';
import { type DayBook } from './days';
import { drinksOnDay } from './streaks';

/**
 * Money saved across all logged days, in minor currency units.
 *
 * Each logged day saves the difference between a usual day (usual drinks per week ÷ 7) and what the
 * user actually drank. Unlogged days count as neither saving nor spending. The result can be
 * negative after heavy days; use {@link displayedSavingsMinor} for what the app shows.
 */
export function moneySavedMinor(days: DayBook, baseline: DrinkingBaseline): number {
  const usualDrinksPerDay = baseline.usualDrinksPerWeek / 7;
  let savedDrinks = 0;
  for (const day of days.all()) {
    if (day.status === 'unlogged') continue;
    savedDrinks += usualDrinksPerDay - drinksOnDay(day, baseline);
  }
  return Math.round(savedDrinks * baseline.usualPricePerDrinkMinor);
}

/** The app never shows negative savings. */
export function displayedSavingsMinor(savedMinor: number): number {
  return Math.max(0, savedMinor);
}

export type Currency = 'INR' | 'EUR' | 'AED';

export function formatMoney(minor: number, currency: Currency, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
