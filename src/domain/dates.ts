/**
 * A calendar day in the user's own day system, formatted `YYYY-MM-DD`.
 *
 * Days run from 04:00 to 03:59 local time, so a drink at 01:00 on Saturday belongs to Friday night.
 */
export type LocalDate = string;

export const DAY_START_HOUR = 4;

const MS_PER_DAY = 86_400_000;
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toUtcMs(date: LocalDate): number {
  const match = LOCAL_DATE_PATTERN.exec(date);
  if (!match || !isLocalDate(date)) throw new Error(`Invalid local date: ${date}`);
  const [, y, m, d] = match.map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): LocalDate {
  const date = new Date(ms);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: LocalDate): number {
  const day = new Date(toUtcMs(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** The Monday that starts the week containing `date`. */
export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, 1 - isoWeekday(date));
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock calendar date and hour of `instant` in `timeZone`. */
function wallClock(instant: Date, timeZone: string): { date: LocalDate; hour: number } {
  const parts: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) parts[part.type] = part.value;
  // Some engines render midnight as hour "24" when hour12 is false.
  const hour = Number(parts.hour) % 24;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour };
}

/**
 * The logical day that `instant` belongs to in `timeZone`.
 *
 * Uses wall-clock time rather than subtracting four hours, so daylight-saving changes cannot move a
 * drink into the wrong day.
 */
export function logicalDate(instant: Date, timeZone: string): LocalDate {
  const { date, hour } = wallClock(instant, timeZone);
  return hour < DAY_START_HOUR ? addDays(date, -1) : date;
}

/** The device's IANA time zone, e.g. `Asia/Kolkata`. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
