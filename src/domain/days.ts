import { daysBetween, type LocalDate } from './dates';

/** What the user explicitly said about a day. Absence means the day is not logged. */
export type DayMark = 'alcohol_free' | 'drank';

export type DayStatus = DayMark | 'unlogged';

export const ALCOHOLIC_DRINK_TYPES = ['beer', 'wine', 'spirit', 'cocktail', 'other'] as const;
export const ALCOHOL_FREE_DRINK_TYPES = [
  'mocktail',
  'af_beer',
  'af_wine',
  'af_spirit',
  'other',
] as const;

export type AlcoholicDrinkType = (typeof ALCOHOLIC_DRINK_TYPES)[number];
export type AlcoholFreeDrinkType = (typeof ALCOHOL_FREE_DRINK_TYPES)[number];

export type DrinkLog = {
  id: string;
  date: LocalDate;
  quantity: number;
  reason?: string;
  deleted?: boolean;
} & (
  { alcoholic: true; type: AlcoholicDrinkType } | { alcoholic: false; type: AlcoholFreeDrinkType }
);

export type DayRecord = { date: LocalDate; mark: DayMark };

export type DaySummary = {
  date: LocalDate;
  status: DayStatus;
  /** Sum of detailed alcoholic drinks. Zero when the user only tapped "I drank". */
  alcoholicDrinks: number;
  /** Alcohol-free drinks logged, shown as "mindful choices". */
  mindfulChoices: number;
};

export const MAX_DRINK_QUANTITY = 20;

/** How many days back a user may fill in, not counting today. */
export const BACKFILL_DAYS = 7;

export function canLogFor(target: LocalDate, today: LocalDate): boolean {
  const age = daysBetween(target, today);
  return age >= 0 && age <= BACKFILL_DAYS;
}

/** Logging an alcoholic drink on a day marked alcohol-free needs the user to confirm first. */
export function needsConfirmation(mark: DayMark | undefined, drink: Pick<DrinkLog, 'alcoholic'>) {
  return mark === 'alcohol_free' && drink.alcoholic;
}

/** A detailed alcoholic drink always wins over the day's mark. */
export function resolveStatus(mark: DayMark | undefined, alcoholicDrinks: number): DayStatus {
  if (alcoholicDrinks > 0) return 'drank';
  return mark ?? 'unlogged';
}

export type DayBook = {
  /** Summary for any date; dates with nothing recorded come back as `unlogged`. */
  get(date: LocalDate): DaySummary;
  /** Every date that has a mark or at least one drink. */
  all(): DaySummary[];
};

/** Combines marks and drink logs into one summary per day. */
export function summarizeDays(records: DayRecord[], drinks: DrinkLog[]): DayBook {
  const marks = new Map(records.map((r) => [r.date, r.mark]));
  const totals = new Map<LocalDate, { alcoholic: number; mindful: number }>();

  for (const drink of drinks) {
    if (drink.deleted || drink.quantity <= 0) continue;
    const total = totals.get(drink.date) ?? { alcoholic: 0, mindful: 0 };
    if (drink.alcoholic) total.alcoholic += drink.quantity;
    else total.mindful += drink.quantity;
    totals.set(drink.date, total);
  }

  const summaries = new Map<LocalDate, DaySummary>();
  for (const date of new Set([...marks.keys(), ...totals.keys()])) {
    const total = totals.get(date) ?? { alcoholic: 0, mindful: 0 };
    summaries.set(date, {
      date,
      status: resolveStatus(marks.get(date), total.alcoholic),
      alcoholicDrinks: total.alcoholic,
      mindfulChoices: total.mindful,
    });
  }

  return {
    get: (date) =>
      summaries.get(date) ?? { date, status: 'unlogged', alcoholicDrinks: 0, mindfulChoices: 0 },
    all: () => [...summaries.values()],
  };
}
