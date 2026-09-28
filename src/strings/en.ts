/** Every user-facing string lives here so French (or any language) is one new file later. */
export const en = {
  appName: 'Drink Mindfully',
  share: {
    brand: 'DRINK MINDFULLY',
    tagline: 'drinking less, living more',
  },
  preview: {
    badge: 'Week 1 preview · placeholder design',
    today: 'Today',
    statusAlcoholFree: 'Alcohol-free so far. Nice.',
    statusDrank: 'Logged as a drinking day.',
    statusUnlogged: 'Nothing logged yet.',
    alcoholFreeToday: 'Alcohol-free today',
    iDrank: 'I drank',
    clear: 'Clear today',
    streak: 'Alcohol-free days in a row',
    total: 'Alcohol-free days in total',
    syncTitle: 'Sync',
    syncNotConfigured: 'Not connected to a backend yet — changes stay on this device.',
    syncOffline: 'Offline — changes will sync when you are back online.',
    syncConnected: (anonymous: boolean) =>
      anonymous ? 'Connected with a guest account.' : 'Connected to your account.',
    pending: (n: number) => (n === 1 ? '1 change waiting to sync' : `${n} changes waiting to sync`),
    shareTitle: 'Share card',
    story: 'Story (9:16)',
    square: 'Square (1:1)',
    share: 'Share',
    shareFailed: 'Could not share the image.',
  },
} as const;
