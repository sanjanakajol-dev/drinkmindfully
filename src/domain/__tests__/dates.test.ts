import { addDays, daysBetween, isLocalDate, isoWeekday, logicalDate, weekStart } from '../dates';

describe('logicalDate', () => {
  it.each([
    // [UTC instant, time zone, expected logical date]
    ['2026-10-09T18:29:00Z', 'Asia/Kolkata', '2026-10-09'], // 23:59 IST Friday
    ['2026-10-09T20:00:00Z', 'Asia/Kolkata', '2026-10-09'], // 01:30 IST Saturday → Friday night
    ['2026-10-09T22:29:00Z', 'Asia/Kolkata', '2026-10-09'], // 03:59 IST → still Friday
    ['2026-10-09T22:30:00Z', 'Asia/Kolkata', '2026-10-10'], // 04:00 IST → Saturday
    ['2026-10-09T23:59:00Z', 'Asia/Dubai', '2026-10-09'], // 03:59 GST
    ['2026-10-10T00:00:00Z', 'Asia/Dubai', '2026-10-10'], // 04:00 GST
  ])('%s in %s is %s', (instant, zone, expected) => {
    expect(logicalDate(new Date(instant), zone)).toBe(expected);
  });

  it('is not shifted by the spring daylight-saving change', () => {
    // Lisbon moves from UTC+0 to UTC+1 at 01:00 UTC on 29 March 2026.
    expect(logicalDate(new Date('2026-03-29T03:30:00Z'), 'Europe/Lisbon')).toBe('2026-03-29'); // 04:30 local
    expect(logicalDate(new Date('2026-03-29T02:30:00Z'), 'Europe/Lisbon')).toBe('2026-03-28'); // 03:30 local
  });

  it('is not shifted by the autumn daylight-saving change', () => {
    // Paris moves from UTC+2 to UTC+1 at 01:00 UTC on 25 October 2026.
    expect(logicalDate(new Date('2026-10-25T02:59:00Z'), 'Europe/Paris')).toBe('2026-10-24'); // 03:59 local
    expect(logicalDate(new Date('2026-10-25T03:00:00Z'), 'Europe/Paris')).toBe('2026-10-25'); // 04:00 local
  });

  it('handles midnight exactly', () => {
    expect(logicalDate(new Date('2026-12-31T18:30:00Z'), 'Asia/Kolkata')).toBe('2026-12-31'); // 00:00 IST 1 Jan
  });
});

describe('date arithmetic', () => {
  it('adds days across months and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-09-28', '2026-10-05')).toBe(7);
    expect(daysBetween('2026-10-05', '2026-09-28')).toBe(-7);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // across a DST weekend
  });

  it('finds ISO weekdays and week starts (Monday)', () => {
    expect(isoWeekday('2026-09-28')).toBe(1); // Monday
    expect(isoWeekday('2026-10-04')).toBe(7); // Sunday
    expect(weekStart('2026-10-04')).toBe('2026-09-28');
    expect(weekStart('2026-09-28')).toBe('2026-09-28');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });

  it('validates local dates', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2026-2-1')).toBe(false);
    expect(() => addDays('nope', 1)).toThrow('Invalid local date');
  });
});
