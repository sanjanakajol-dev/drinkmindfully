import { typicalDrinkingDayDrinks, type DrinkingBaseline } from './baseline';
import { addDays, daysBetween, weekStart, type LocalDate } from './dates';
import { type DayBook, type DaySummary } from './days';

/**
 * Days in a row without a drink, for the Alcohol-free path.
 *
 * An unlogged today does not break the streak (the day is not over), but a "drank" today does.
 */
export function alcoholFreeDayStreak(days: DayBook, today: LocalDate): number {
  const todayStatus = days.get(today).status;
  if (todayStatus === 'drank') return 0;

  let cursor = todayStatus === 'alcohol_free' ? today : addDays(today, -1);
  let streak = 0;
  while (days.get(cursor).status === 'alcohol_free') {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Every alcohol-free day ever logged. This number never goes down. */
export function totalAlcoholFreeDays(days: DayBook): number {
  return days.all().filter((d) => d.status === 'alcohol_free').length;
}

export function totalMindfulChoices(days: DayBook): number {
  return days.all().reduce((sum, d) => sum + d.mindfulChoices, 0);
}

export type WeeklyGoals = {
  alcoholFreeDaysPerWeek: number;
  maxDrinksPerWeek: number;
};

/** Drinks counted for one day: detailed drinks if logged, otherwise a typical drinking day. */
export function drinksOnDay(day: DaySummary, baseline: DrinkingBaseline): number {
  if (day.status !== 'drank') return 0;
  return day.alcoholicDrinks > 0 ? day.alcoholicDrinks : typicalDrinkingDayDrinks(baseline);
}

export type WeekResult = {
  weekStart: LocalDate;
  alcoholFreeDays: number;
  drinks: number;
  onTarget: boolean;
  /** False while the week is still running; only complete weeks count towards the streak. */
  complete: boolean;
};

export function evaluateWeek(
  days: DayBook,
  start: LocalDate,
  goals: WeeklyGoals,
  baseline: DrinkingBaseline,
  today: LocalDate,
): WeekResult {
  let alcoholFreeDays = 0;
  let drinks = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = days.get(addDays(start, i));
    if (day.status === 'alcohol_free') alcoholFreeDays += 1;
    drinks += drinksOnDay(day, baseline);
  }
  return {
    weekStart: start,
    alcoholFreeDays,
    drinks,
    onTarget: alcoholFreeDays >= goals.alcoholFreeDaysPerWeek && drinks <= goals.maxDrinksPerWeek,
    complete: daysBetween(start, today) >= 7,
  };
}

/**
 * Complete weeks in a row (Monday to Sunday) where the user met both Mindful goals.
 *
 * The week in progress never breaks the streak. A week the user only joined part-way through is
 * not counted, so nobody is judged on a partial week.
 */
export function weeksOnTargetStreak(
  days: DayBook,
  goals: WeeklyGoals,
  baseline: DrinkingBaseline,
  startedOn: LocalDate,
  today: LocalDate,
): number {
  const firstFullWeek =
    weekStart(startedOn) === startedOn ? startedOn : addDays(weekStart(startedOn), 7);

  let streak = 0;
  let cursor = addDays(weekStart(today), -7);
  while (daysBetween(firstFullWeek, cursor) >= 0) {
    if (!evaluateWeek(days, cursor, goals, baseline, today).onTarget) break;
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}
