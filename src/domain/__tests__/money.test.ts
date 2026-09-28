import { typicalDrinkingDayDrinks, type DrinkingBaseline } from '../baseline';
import { summarizeDays } from '../days';
import { displayedSavingsMinor, formatMoney, moneySavedMinor } from '../money';

// 14 drinks a week (2 a day on average) over 4 drinking days, ₹400 a drink.
const baseline: DrinkingBaseline = {
  usualDrinksPerWeek: 14,
  usualDrinkingDaysPerWeek: 4,
  usualPricePerDrinkMinor: 40_000,
};

describe('typicalDrinkingDayDrinks', () => {
  it('is usual drinks divided by usual drinking days', () => {
    expect(typicalDrinkingDayDrinks(baseline)).toBe(3.5);
  });

  it('is never below one drink', () => {
    expect(typicalDrinkingDayDrinks({ ...baseline, usualDrinksPerWeek: 0 })).toBe(1);
    expect(typicalDrinkingDayDrinks({ ...baseline, usualDrinkingDaysPerWeek: 0 })).toBe(14);
  });
});

describe('moneySavedMinor', () => {
  it('saves a usual day (2 drinks) for each alcohol-free day', () => {
    const days = summarizeDays(
      [
        { date: '2026-10-05', mark: 'alcohol_free' },
        { date: '2026-10-06', mark: 'alcohol_free' },
      ],
      [],
    );
    expect(moneySavedMinor(days, baseline)).toBe(2 * 2 * 40_000);
  });

  it('subtracts detailed drinks on drinking days', () => {
    const days = summarizeDays(
      [],
      [{ id: '1', date: '2026-10-05', alcoholic: true, type: 'wine', quantity: 1 }],
    );
    expect(moneySavedMinor(days, baseline)).toBe(1 * 40_000);
  });

  it('uses a typical drinking day for a quick "I drank"', () => {
    const days = summarizeDays([{ date: '2026-10-05', mark: 'drank' }], []);
    expect(moneySavedMinor(days, baseline)).toBe((2 - 3.5) * 40_000);
  });

  it('ignores unlogged days and alcohol-free drinks', () => {
    const days = summarizeDays(
      [],
      [{ id: '1', date: '2026-10-05', alcoholic: false, type: 'mocktail', quantity: 3 }],
    );
    expect(moneySavedMinor(days, baseline)).toBe(0);
  });

  it('rounds to whole minor units', () => {
    const days = summarizeDays([{ date: '2026-10-05', mark: 'alcohol_free' }], []);
    expect(
      moneySavedMinor(days, { ...baseline, usualDrinksPerWeek: 10, usualPricePerDrinkMinor: 399 }),
    ).toBe(570);
  });
});

describe('display', () => {
  it('never shows negative savings', () => {
    expect(displayedSavingsMinor(-5_000)).toBe(0);
    expect(displayedSavingsMinor(5_000)).toBe(5_000);
  });

  it('formats in the home city currency', () => {
    expect(formatMoney(160_000, 'INR')).toBe('₹1,600');
    expect(formatMoney(1_250, 'EUR')).toBe('€13');
    expect(formatMoney(5_000, 'AED')).toMatch(/AED\s?50/);
  });
});
