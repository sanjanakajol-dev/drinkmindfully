import { type LocalDate } from '@/domain/dates';
import { type DayMark, type DrinkLog } from '@/domain/days';

import { type KeyValueStorage } from './storage';

/**
 * A change made on the device that still has to reach the server. Every operation is safe to send
 * more than once, so a crash or a lost response can only cause a harmless retry.
 */
export type OutboxOp =
  | { kind: 'day_mark'; date: LocalDate; mark: DayMark | null; clientUpdatedAt: string }
  | { kind: 'drink_log'; drink: DrinkLog; loggedAt: string }
  | { kind: 'drink_delete'; drinkId: string; deletedAt: string };

/**
 * - `sent`: the server has it; drop it from the queue.
 * - `retry`: offline, signed out, or a server hiccup; keep it and stop for now.
 * - `rejected`: the server will never accept it (it broke a rule); drop it and report it.
 */
export type SendResult = 'sent' | 'retry' | 'rejected';

export type Sender = (op: OutboxOp) => Promise<SendResult>;

export type FlushResult = { sent: number; rejected: OutboxOp[]; remaining: number };

const sameOp = (a: OutboxOp, b: OutboxOp) => JSON.stringify(a) === JSON.stringify(b);

/** Ordered, persisted queue of changes waiting to sync. */
export class Outbox {
  private tail: Promise<unknown> = Promise.resolve();
  private flushing: Promise<FlushResult> | null = null;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key = 'outbox.v1',
  ) {}

  async pending(): Promise<OutboxOp[]> {
    const raw = await this.storage.getItem(this.key);
    return raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  }

  /** Runs read-modify-write changes one at a time so none overwrites another. */
  private update(change: (ops: OutboxOp[]) => OutboxOp[]): Promise<void> {
    const run = this.tail.then(async () => {
      const ops = change(await this.pending());
      await this.storage.setItem(this.key, JSON.stringify(ops));
    });
    this.tail = run.catch(() => undefined);
    return run;
  }

  enqueue(op: OutboxOp): Promise<void> {
    return this.update((ops) => {
      // Only the newest mark for a day matters; the server keeps the latest one anyway.
      const kept =
        op.kind === 'day_mark'
          ? ops.filter((o) => !(o.kind === 'day_mark' && o.date === op.date))
          : ops;
      return [...kept, op];
    });
  }

  private remove(op: OutboxOp): Promise<void> {
    return this.update((ops) => {
      const index = ops.findIndex((o) => sameOp(o, op));
      return index < 0 ? ops : [...ops.slice(0, index), ...ops.slice(index + 1)];
    });
  }

  /**
   * Sends queued changes in order. Stops at the first `retry` so a delete can never overtake the
   * drink it deletes. Concurrent calls share one run.
   */
  flush(send: Sender): Promise<FlushResult> {
    this.flushing ??= this.run(send).finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async run(send: Sender): Promise<FlushResult> {
    let sent = 0;
    const rejected: OutboxOp[] = [];

    for (;;) {
      const [op] = await this.pending();
      if (!op) break;

      const result = await send(op);
      if (result === 'retry') break;
      if (result === 'rejected') rejected.push(op);
      else sent += 1;
      await this.remove(op);
    }

    return { sent, rejected, remaining: (await this.pending()).length };
  }
}
