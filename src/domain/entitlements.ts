/**
 * Our own subscription states. Payment-provider states (Razorpay now, Apple and Google later) are
 * mapped onto these by the server.
 *
 * - `active`: paid and renewing.
 * - `grace`: a renewal payment failed and the provider is retrying.
 * - `cancelled`: will not renew, but the paid period may still be running.
 * - `expired`: over.
 */
export type SubscriptionStatus = 'active' | 'grace' | 'cancelled' | 'expired';

export type Subscription = {
  status: SubscriptionStatus;
  /** ISO timestamp when access ends: the paid period, or the retry window while in `grace`. */
  currentPeriodEnd: string;
};

/** Premium while any subscription is not expired and its paid period has not ended. */
export function isPremium(subscriptions: Subscription[], now: Date): boolean {
  return subscriptions.some(
    (s) => s.status !== 'expired' && new Date(s.currentPeriodEnd).getTime() > now.getTime(),
  );
}
