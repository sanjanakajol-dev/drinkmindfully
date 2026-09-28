import { canLogFor, needsConfirmation, summarizeDays, type DrinkLog } from '../days';

const beer = (date: string, quantity = 1, extra: Partial<DrinkLog> = {}): DrinkLog =>
  ({
    id: `${date}-beer-${quantity}`,
    date,
    alcoholic: true,
    type: 'beer',
    quantity,
    ...extra,
  }) as DrinkLog;
const mocktail = (date: string, quantity = 1): DrinkLog => ({
  id: `${date}-mocktail`,
  date,
  alcoholic: false,
  type: 'mocktail',
  quantity,
});

describe('canLogFor', () => {
  it('allows today and the previous 7 days only', () => {
    expect(canLogFor('2026-10-10', '2026-10-10')).toBe(true);
    expect(canLogFor('2026-10-03', '2026-10-10')).toBe(true);
    expect(canLogFor('2026-10-02', '2026-10-10')).toBe(false);
    expect(canLogFor('2026-10-11', '2026-10-10')).toBe(false);
  });
});

describe('needsConfirmation', () => {
  it('asks before an alcoholic drink overwrites an alcohol-free day', () => {
    expect(needsConfirmation('alcohol_free', { alcoholic: true })).toBe(true);
    expect(needsConfirmation('alcohol_free', { alcoholic: false })).toBe(false);
    expect(needsConfirmation('drank', { alcoholic: true })).toBe(false);
    expect(needsConfirmation(undefined, { alcoholic: true })).toBe(false);
  });
});

describe('summarizeDays', () => {
  it('treats days with nothing as unlogged, never alcohol-free', () => {
    const days = summarizeDays([], []);
    expect(days.get('2026-10-10').status).toBe('unlogged');
    expect(days.all()).toEqual([]);
  });

  it('uses the explicit mark when there are no alcoholic drinks', () => {
    const days = summarizeDays([{ date: '2026-10-10', mark: 'alcohol_free' }], []);
    expect(days.get('2026-10-10').status).toBe('alcohol_free');
  });

  it('lets a detailed alcoholic drink override an alcohol-free mark', () => {
    const days = summarizeDays(
      [{ date: '2026-10-10', mark: 'alcohol_free' }],
      [beer('2026-10-10', 2)],
    );
    expect(days.get('2026-10-10')).toMatchObject({ status: 'drank', alcoholicDrinks: 2 });
  });

  it('keeps a quick "I drank" with no details as drank with zero counted drinks', () => {
    const days = summarizeDays([{ date: '2026-10-10', mark: 'drank' }], []);
    expect(days.get('2026-10-10')).toMatchObject({ status: 'drank', alcoholicDrinks: 0 });
  });

  it('counts alcohol-free drinks as mindful choices without changing the status', () => {
    const days = summarizeDays([], [mocktail('2026-10-10', 2)]);
    expect(days.get('2026-10-10')).toMatchObject({ status: 'unlogged', mindfulChoices: 2 });

    const marked = summarizeDays(
      [{ date: '2026-10-11', mark: 'alcohol_free' }],
      [mocktail('2026-10-11')],
    );
    expect(marked.get('2026-10-11')).toMatchObject({ status: 'alcohol_free', mindfulChoices: 1 });
  });

  it('ignores deleted drinks', () => {
    const days = summarizeDays(
      [{ date: '2026-10-10', mark: 'alcohol_free' }],
      [beer('2026-10-10', 1, { deleted: true })],
    );
    expect(days.get('2026-10-10').status).toBe('alcohol_free');
  });

  it('adds up several drinks on the same day', () => {
    const days = summarizeDays([], [beer('2026-10-10', 1), { ...beer('2026-10-10', 2), id: 'x' }]);
    expect(days.get('2026-10-10').alcoholicDrinks).toBe(3);
  });
});
