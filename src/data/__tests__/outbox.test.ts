import { type DrinkLog } from '@/domain/days';

import { Journal } from '../journal';
import { Outbox, type OutboxOp, type SendResult } from '../outbox';
import { memoryStorage } from '../storage';
import { classifyResponse } from '../sync';

const beer: DrinkLog = { id: 'd1', date: '2026-10-10', alcoholic: true, type: 'beer', quantity: 1 };

function recordingSender(results: SendResult[] = []) {
  const seen: OutboxOp[] = [];
  const send = async (op: OutboxOp) => {
    seen.push(op);
    return results.shift() ?? 'sent';
  };
  return { seen, send };
}

describe('Outbox', () => {
  it('sends queued changes in order and empties the queue', async () => {
    const outbox = new Outbox(memoryStorage());
    await outbox.enqueue({ kind: 'drink_log', drink: beer, loggedAt: 't1' });
    await outbox.enqueue({ kind: 'drink_delete', drinkId: 'd1', deletedAt: 't2' });

    const { seen, send } = recordingSender();
    const result = await outbox.flush(send);

    expect(seen.map((o) => o.kind)).toEqual(['drink_log', 'drink_delete']);
    expect(result).toEqual({ sent: 2, rejected: [], remaining: 0 });
  });

  it('stops at the first retry so a delete never overtakes its drink', async () => {
    const outbox = new Outbox(memoryStorage());
    await outbox.enqueue({ kind: 'drink_log', drink: beer, loggedAt: 't1' });
    await outbox.enqueue({ kind: 'drink_delete', drinkId: 'd1', deletedAt: 't2' });

    const { seen, send } = recordingSender(['retry']);
    const result = await outbox.flush(send);

    expect(seen).toHaveLength(1);
    expect(result.remaining).toBe(2);
  });

  it('drops and reports changes the server rejects', async () => {
    const outbox = new Outbox(memoryStorage());
    const bad: OutboxOp = {
      kind: 'day_mark',
      date: '2020-01-01',
      mark: 'drank',
      clientUpdatedAt: 't',
    };
    await outbox.enqueue(bad);
    await outbox.enqueue({ kind: 'drink_log', drink: beer, loggedAt: 't1' });

    const result = await outbox.flush(recordingSender(['rejected', 'sent']).send);
    expect(result).toEqual({ sent: 1, rejected: [bad], remaining: 0 });
  });

  it('keeps only the newest mark for a day', async () => {
    const outbox = new Outbox(memoryStorage());
    await outbox.enqueue({
      kind: 'day_mark',
      date: '2026-10-10',
      mark: 'alcohol_free',
      clientUpdatedAt: 't1',
    });
    await outbox.enqueue({
      kind: 'day_mark',
      date: '2026-10-11',
      mark: 'drank',
      clientUpdatedAt: 't2',
    });
    await outbox.enqueue({
      kind: 'day_mark',
      date: '2026-10-10',
      mark: 'drank',
      clientUpdatedAt: 't3',
    });

    expect(await outbox.pending()).toEqual([
      { kind: 'day_mark', date: '2026-10-11', mark: 'drank', clientUpdatedAt: 't2' },
      { kind: 'day_mark', date: '2026-10-10', mark: 'drank', clientUpdatedAt: 't3' },
    ]);
  });

  it('survives a restart', async () => {
    const storage = memoryStorage();
    await new Outbox(storage).enqueue({ kind: 'drink_log', drink: beer, loggedAt: 't1' });
    expect(await new Outbox(storage).pending()).toHaveLength(1);
  });

  it('does not lose changes queued while a flush is in flight', async () => {
    const outbox = new Outbox(memoryStorage());
    await outbox.enqueue({ kind: 'drink_log', drink: beer, loggedAt: 't1' });

    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const sent: OutboxOp[] = [];
    const flushing = outbox.flush(async (op) => {
      sent.push(op);
      if (sent.length === 1) await gate;
      return 'sent';
    });

    await outbox.enqueue({ kind: 'drink_delete', drinkId: 'd1', deletedAt: 't2' });
    release();
    await flushing;

    expect(sent.map((o) => o.kind)).toEqual(['drink_log', 'drink_delete']);
    expect(await outbox.pending()).toEqual([]);
  });

  it('shares one run between concurrent flushes', async () => {
    const outbox = new Outbox(memoryStorage());
    await outbox.enqueue({ kind: 'drink_log', drink: beer, loggedAt: 't1' });
    const { seen, send } = recordingSender();
    await Promise.all([outbox.flush(send), outbox.flush(send)]);
    expect(seen).toHaveLength(1);
  });
});

describe('classifyResponse', () => {
  it.each([
    [201, null, 'sent'],
    [204, null, 'sent'],
    [0, {}, 'retry'],
    [401, {}, 'retry'],
    [429, {}, 'retry'],
    [503, {}, 'retry'],
    [400, {}, 'rejected'],
    [403, {}, 'rejected'],
  ])('status %i with error %p is %s', (status, error, expected) => {
    expect(classifyResponse(status, error)).toBe(expected);
  });
});

describe('Journal', () => {
  const now = () => new Date('2026-10-10T18:00:00Z');

  it('updates the day summary immediately and queues the change', async () => {
    const outbox = new Outbox(memoryStorage());
    const journal = new Journal(memoryStorage(), outbox, now);
    await journal.load();

    await journal.setMark('2026-10-10', 'alcohol_free');
    expect(journal.days().get('2026-10-10').status).toBe('alcohol_free');
    expect(await outbox.pending()).toEqual([
      {
        kind: 'day_mark',
        date: '2026-10-10',
        mark: 'alcohol_free',
        clientUpdatedAt: now().toISOString(),
      },
    ]);
  });

  it('clears a mark, deletes drinks and keeps everything after a restart', async () => {
    const storage = memoryStorage();
    const journal = new Journal(storage, new Outbox(memoryStorage()), now);
    await journal.load();
    await journal.setMark('2026-10-10', 'alcohol_free');
    await journal.setMark('2026-10-10', null);
    await journal.addDrink(beer);
    await journal.deleteDrink('d1');

    const reopened = new Journal(storage, new Outbox(memoryStorage()), now);
    await reopened.load();
    expect(reopened.markOf('2026-10-10')).toBeUndefined();
    expect(reopened.days().get('2026-10-10').status).toBe('unlogged');
  });

  it('notifies listeners on every change', async () => {
    const journal = new Journal(memoryStorage(), new Outbox(memoryStorage()), now);
    const listener = jest.fn();
    journal.subscribe(listener);
    await journal.load();
    await journal.addDrink(beer);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
