import { isPremium } from '../entitlements';

const now = new Date('2026-12-20T12:00:00Z');
const future = '2027-01-15T00:00:00Z';
const past = '2026-12-01T00:00:00Z';

describe('isPremium', () => {
  it('is false with no subscriptions', () => {
    expect(isPremium([], now)).toBe(false);
  });

  it('is true for an active subscription in its paid period', () => {
    expect(isPremium([{ status: 'active', currentPeriodEnd: future }], now)).toBe(true);
  });

  it('keeps access during a payment retry window', () => {
    expect(isPremium([{ status: 'grace', currentPeriodEnd: future }], now)).toBe(true);
  });

  it('keeps access until the end of a cancelled but paid period', () => {
    expect(isPremium([{ status: 'cancelled', currentPeriodEnd: future }], now)).toBe(true);
    expect(isPremium([{ status: 'cancelled', currentPeriodEnd: past }], now)).toBe(false);
  });

  it('is false once expired or past the period end', () => {
    expect(isPremium([{ status: 'expired', currentPeriodEnd: future }], now)).toBe(false);
    expect(isPremium([{ status: 'active', currentPeriodEnd: past }], now)).toBe(false);
  });

  it('is true if any one subscription grants access', () => {
    expect(
      isPremium(
        [
          { status: 'expired', currentPeriodEnd: past },
          { status: 'active', currentPeriodEnd: future },
        ],
        now,
      ),
    ).toBe(true);
  });
});
