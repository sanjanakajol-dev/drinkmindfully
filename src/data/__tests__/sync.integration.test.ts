/**
 * @jest-environment node
 *
 * End-to-end check against a running local Supabase (`npx supabase start`). Skipped unless
 * SUPABASE_TEST_URL and SUPABASE_TEST_PUBLISHABLE_KEY are set; CI sets them.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { addDays, logicalDate } from '@/domain/dates';

import { Outbox } from '../outbox';
import { memoryStorage } from '../storage';
import { supabaseSender } from '../sync';

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const describeIfBackend = url && key ? describe : describe.skip;

describeIfBackend('anonymous start → offline logging → link email', () => {
  let client: SupabaseClient;
  let userId: string;
  const today = logicalDate(new Date(), 'Asia/Kolkata');
  const drinkId = crypto.randomUUID();

  beforeAll(async () => {
    client = createClient(url!, key!, {
      auth: { storage: memoryStorage(), persistSession: true, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw error;
    userId = data.user!.id;
    expect(data.user!.is_anonymous).toBe(true);
  });

  afterAll(async () => {
    await client.auth.signOut();
  });

  it('lets an anonymous user create a profile', async () => {
    const { error } = await client.from('profiles').insert({
      date_of_birth: '1994-06-01',
      home_city_id: 'bangalore',
      path: 'mindful',
      alcohol_free_days_goal: 5,
      max_drinks_per_week: 6,
      usual_drinks_per_week: 12,
      usual_drinking_days_per_week: 4,
      usual_price_per_drink_minor: 40000,
      time_zone: 'Asia/Kolkata',
      started_on: today,
      health_data_consent_at: new Date().toISOString(),
    });
    expect(error).toBeNull();
  });

  it('syncs queued offline changes, drops rule-breaking ones, and is safe to retry', async () => {
    const outbox = new Outbox(memoryStorage());
    const loggedAt = new Date().toISOString();
    const drink = {
      id: drinkId,
      date: today,
      alcoholic: false as const,
      type: 'mocktail' as const,
      quantity: 1,
    };
    await outbox.enqueue({
      kind: 'day_mark',
      date: today,
      mark: 'alcohol_free',
      clientUpdatedAt: loggedAt,
    });
    await outbox.enqueue({ kind: 'drink_log', drink, loggedAt });
    await outbox.enqueue({
      kind: 'day_mark',
      date: addDays(today, -20),
      mark: 'drank',
      clientUpdatedAt: loggedAt,
    });

    const result = await outbox.flush(supabaseSender(client));
    expect(result.sent).toBe(2);
    expect(result.rejected.map((o) => o.kind)).toEqual(['day_mark']);

    // A lost response means the same drink is sent again.
    await outbox.enqueue({ kind: 'drink_log', drink, loggedAt });
    expect((await outbox.flush(supabaseSender(client))).sent).toBe(1);

    const { data: drinks } = await client.from('drink_logs').select('id');
    expect(drinks).toEqual([{ id: drinkId }]);
    const { data: days } = await client.from('day_status').select('date, mark');
    expect(days).toEqual([{ date: today, mark: 'alcohol_free' }]);
  });

  it('keeps the same user and data after adding an email', async () => {
    const email = `test-${userId.slice(0, 8)}@example.com`;
    const { error } = await client.auth.updateUser({ email });
    expect(error).toBeNull();

    const { data } = await client.auth.getUser();
    expect(data.user!.id).toBe(userId);

    const { data: drinks } = await client.from('drink_logs').select('id');
    expect(drinks).toEqual([{ id: drinkId }]);
  });

  it('never exposes premium or other users’ data', async () => {
    const { data: premium } = await client.rpc('is_premium');
    expect(premium).toBe(false);

    const other = createClient(url!, key!, {
      auth: { storage: memoryStorage(), persistSession: true, autoRefreshToken: false },
    });
    await other.auth.signInAnonymously();
    const { data } = await other.from('drink_logs').select('id');
    expect(data).toEqual([]);
    await other.auth.signOut();
  });
});
