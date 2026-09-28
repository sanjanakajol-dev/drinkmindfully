import { type DrinkingBaseline } from '../baseline';
import { addDays } from '../dates';
import { summarizeDays, type DayRecord, type DrinkLog } from '../days';
import {
  alcoholFreeDayStreak,
  evaluateWeek,
  totalAlcoholFreeDays,
  totalMindfulChoices,
  weeksOnTargetStreak,
} from '../streaks';

// Weekends-only drinker: 12 drinks over 4 nights a week before starting, 3 per drinking night.
const baseline: DrinkingBaseline = {
  usualDrinksPerWeek: 12,
  usualDrinkingDaysPerWeek: 4,
  usualPricePerDrinkMinor: 40_000,
};
const goals = { alcoholFreeDaysPerWeek: 5, maxDrinksPerWeek: 6 };

/** Builds marks from a compact string: A = alcohol-free, D = drank, . = unlogged. */
function marks(start: string, pattern: string): DayRecord[] {
  return [...pattern].flatMap((c, i): DayRecord[] => {
    const date = addDays(start, i);
    if (c === 'A') return [{ date, mark: 'alcohol_free' }];
    if (c === 'D') return [{ date, mark: 'drank' }];
    return [];
  });
}

const beers = (date: string, quantity: number): DrinkLog => ({
  id: `${date}-beer`,
  date,
  alcoholic: true,
  type: 'beer',
  quantity,
});

describe('alcoholFreeDayStreak', () => {
  it('counts consecutive alcohol-free days up to today', () => {
    const days = summarizeDays(marks('2026-10-01', 'DAAAA'), []);
    expect(alcoholFreeDayStreak(days, '2026-10-05')).toBe(4);
  });

  it('keeps the streak alive while today is not logged yet', () => {
    const days = summarizeDays(marks('2026-10-01', 'DAAA.'), []);
    expect(alcoholFreeDayStreak(days, '2026-10-05')).toBe(3);
  });

  it('is zero when today is a drinking day', () => {
    const days = summarizeDays(marks('2026-10-01', 'AAAAD'), []);
    expect(alcoholFreeDayStreak(days, '2026-10-05')).toBe(0);
  });

  it('breaks on an unlogged day in the past', () => {
    const days = summarizeDays(marks('2026-10-01', 'AA.AA'), []);
    expect(alcoholFreeDayStreak(days, '2026-10-05')).toBe(2);
  });

  it('breaks when a detailed drink overrides an alcohol-free mark', () => {
    const days = summarizeDays(marks('2026-10-01', 'AAAAA'), [beers('2026-10-03', 1)]);
    expect(alcoholFreeDayStreak(days, '2026-10-05')).toBe(2);
  });
});

describe('totals', () => {
  it('counts every alcohol-free day, even after a drinking day', () => {
    const days = summarizeDays(marks('2026-10-01', 'AADAA.A'), []);
    expect(totalAlcoholFreeDays(days)).toBe(5);
  });

  it('adds up mindful choices', () => {
    const days = summarizeDays(
      [],
      [
        { id: '1', date: '2026-10-01', alcoholic: false, type: 'mocktail', quantity: 2 },
        { id: '2', date: '2026-10-02', alcoholic: false, type: 'af_beer', quantity: 1 },
      ],
    );
    expect(totalMindfulChoices(days)).toBe(3);
  });
});

describe('evaluateWeek (Mindful)', () => {
  const monday = '2026-10-05';

  it('is on target with 5 alcohol-free days and drinks under the limit', () => {
    const days = summarizeDays(marks(monday, 'AAAAADD'), [
      beers('2026-10-10', 3),
      beers('2026-10-11', 2),
    ]);
    const week = evaluateWeek(days, monday, goals, baseline, '2026-10-12');
    expect(week).toMatchObject({ alcoholFreeDays: 5, drinks: 5, onTarget: true, complete: true });
  });

  it('counts a quick "I drank" as a typical drinking day (3 drinks here)', () => {
    const days = summarizeDays(marks(monday, 'AAAAADD'), []);
    const week = evaluateWeek(days, monday, goals, baseline, '2026-10-12');
    expect(week.drinks).toBe(6);
    expect(week.onTarget).toBe(true);
  });

  it('misses the target when drinks go over the limit', () => {
    const days = summarizeDays(marks(monday, 'AAAAADD'), [
      beers('2026-10-10', 4),
      beers('2026-10-11', 3),
    ]);
    expect(evaluateWeek(days, monday, goals, baseline, '2026-10-12').onTarget).toBe(false);
  });

  it('misses the target when unlogged days leave too few alcohol-free days', () => {
    const days = summarizeDays(marks(monday, 'AAA..D.'), []);
    expect(evaluateWeek(days, monday, goals, baseline, '2026-10-12').onTarget).toBe(false);
  });

  it('marks the running week as incomplete', () => {
    const days = summarizeDays([], []);
    expect(evaluateWeek(days, monday, goals, baseline, '2026-10-11').complete).toBe(false);
    expect(evaluateWeek(days, monday, goals, baseline, '2026-10-12').complete).toBe(true);
  });
});

describe('weeksOnTargetStreak', () => {
  const onTargetWeek = 'AAAAADD';
  const offTargetWeek = 'AADDDDD';

  it('counts complete weeks in a row, ignoring the week in progress', () => {
    const days = summarizeDays(
      [
        ...marks('2026-09-28', onTargetWeek),
        ...marks('2026-10-05', onTargetWeek),
        ...marks('2026-10-12', 'DDD'), // current week, going badly so far
      ],
      [],
    );
    expect(weeksOnTargetStreak(days, goals, baseline, '2026-09-28', '2026-10-14')).toBe(2);
  });

  it('stops at the most recent missed week', () => {
    const days = summarizeDays(
      [
        ...marks('2026-09-28', onTargetWeek),
        ...marks('2026-10-05', offTargetWeek),
        ...marks('2026-10-12', onTargetWeek),
      ],
      [],
    );
    expect(weeksOnTargetStreak(days, goals, baseline, '2026-09-28', '2026-10-19')).toBe(1);
  });

  it('does not judge the partial week the user joined in', () => {
    const days = summarizeDays(
      [...marks('2026-10-01', 'AAAA'), ...marks('2026-10-05', onTargetWeek)],
      [],
    );
    // Joined on a Thursday: only the week of 5 Oct counts.
    expect(weeksOnTargetStreak(days, goals, baseline, '2026-10-01', '2026-10-12')).toBe(1);
  });

  it('is zero before the first full week has finished', () => {
    const days = summarizeDays(marks('2026-10-05', 'AAAAA'), []);
    expect(weeksOnTargetStreak(days, goals, baseline, '2026-10-05', '2026-10-10')).toBe(0);
  });
});
