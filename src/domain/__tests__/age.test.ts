import { ageOn, isAdult } from '../age';

describe('ageOn', () => {
  it.each([
    ['2008-10-01', '2026-09-30', 17],
    ['2008-10-01', '2026-10-01', 18],
    ['1990-05-15', '2026-05-14', 35],
    ['1990-05-15', '2026-05-15', 36],
    // Leap-day birthdays turn a year older on 1 March in non-leap years.
    ['2008-02-29', '2026-02-28', 17],
    ['2008-02-29', '2026-03-01', 18],
    ['2008-02-29', '2028-02-29', 20],
  ])('born %s is %i on %s', (dob, on, expected) => {
    expect(ageOn(dob, on)).toBe(expected);
  });
});

describe('isAdult', () => {
  it('blocks anyone under 18', () => {
    expect(isAdult('2008-09-29', '2026-09-28')).toBe(false);
    expect(isAdult('2008-09-28', '2026-09-28')).toBe(true);
  });
});
