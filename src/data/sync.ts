import { type SupabaseClient } from '@supabase/supabase-js';

import { type OutboxOp, type Sender, type SendResult } from './outbox';

/**
 * Decides what to do with a server reply. Network failures, sign-in problems, rate limits and
 * server errors are retried later; anything else means the server refused the change for good.
 */
export function classifyResponse(status: number, error: unknown): SendResult {
  if (!error) return 'sent';
  if (status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) {
    return 'retry';
  }
  return 'rejected';
}

/** Sends one outbox operation to Supabase. */
export function supabaseSender(client: SupabaseClient): Sender {
  return async (op: OutboxOp) => {
    try {
      const { error, status } = await request(client, op);
      return classifyResponse(status, error);
    } catch {
      // fetch throws when there is no connection at all.
      return 'retry';
    }
  };
}

function request(client: SupabaseClient, op: OutboxOp) {
  switch (op.kind) {
    case 'day_mark':
      return client.rpc('upsert_day_mark', {
        p_date: op.date,
        p_mark: op.mark,
        p_client_updated_at: op.clientUpdatedAt,
      });
    case 'drink_log':
      return client.from('drink_logs').upsert(
        {
          id: op.drink.id,
          date: op.drink.date,
          alcoholic: op.drink.alcoholic,
          drink_type: op.drink.type,
          quantity: op.drink.quantity,
          reason: op.drink.reason ?? null,
          logged_at: op.loggedAt,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
    case 'drink_delete':
      return client.from('drink_logs').update({ deleted_at: op.deletedAt }).eq('id', op.drinkId);
  }
}
