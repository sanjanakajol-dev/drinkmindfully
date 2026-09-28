import { type LocalDate } from '@/domain/dates';
import {
  summarizeDays,
  type DayBook,
  type DayMark,
  type DayRecord,
  type DrinkLog,
} from '@/domain/days';

import { type Outbox } from './outbox';
import { type KeyValueStorage } from './storage';

/** An immutable snapshot: every change produces a new object, so React can tell it changed. */
export type JournalState = { loaded: boolean; marks: DayRecord[]; drinks: DrinkLog[] };

const EMPTY: JournalState = { loaded: false, marks: [], drinks: [] };

/**
 * The user's log as stored on the device. Every change is saved locally first (so logging works
 * with no signal) and queued in the outbox for the server.
 */
export class Journal {
  private state: JournalState = EMPTY;
  private listeners = new Set<() => void>();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly outbox: Outbox,
    private readonly now: () => Date = () => new Date(),
    private readonly key = 'journal.v1',
  ) {}

  async load(): Promise<void> {
    if (this.state.loaded) return;
    const raw = await this.storage.getItem(this.key);
    const saved = raw ? (JSON.parse(raw) as Omit<JournalState, 'loaded'>) : EMPTY;
    this.state = { loaded: true, marks: saved.marks, drinks: saved.drinks };
    this.emit();
  }

  // Arrow properties so they can be passed straight to useSyncExternalStore.
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): JournalState => this.state;

  days(): DayBook {
    return summarizeDays(this.state.marks, this.state.drinks);
  }

  markOf(date: LocalDate): DayMark | undefined {
    return this.state.marks.find((m) => m.date === date)?.mark;
  }

  /** Sets or clears (`null`) the mark for a day. */
  async setMark(date: LocalDate, mark: DayMark | null): Promise<void> {
    const marks = this.state.marks.filter((m) => m.date !== date);
    if (mark) marks.push({ date, mark });
    await this.commit(
      { ...this.state, marks },
      {
        kind: 'day_mark',
        date,
        mark,
        clientUpdatedAt: this.now().toISOString(),
      },
    );
  }

  async addDrink(drink: DrinkLog): Promise<void> {
    await this.commit(
      { ...this.state, drinks: [...this.state.drinks, drink] },
      { kind: 'drink_log', drink, loggedAt: this.now().toISOString() },
    );
  }

  async deleteDrink(drinkId: string): Promise<void> {
    const drinks = this.state.drinks.map((d) => (d.id === drinkId ? { ...d, deleted: true } : d));
    await this.commit(
      { ...this.state, drinks },
      { kind: 'drink_delete', drinkId, deletedAt: this.now().toISOString() },
    );
  }

  /** Saves locally and queues for the server before telling listeners, so a sync they start
   * always includes this change. */
  private async commit(next: JournalState, op: Parameters<Outbox['enqueue']>[0]): Promise<void> {
    this.state = next;
    await this.storage.setItem(
      this.key,
      JSON.stringify({ marks: next.marks, drinks: next.drinks }),
    );
    await this.outbox.enqueue(op);
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}
