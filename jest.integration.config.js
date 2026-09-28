// Integration tests talk to a running local Supabase, so they run in plain Node without the
// React Native mocks from jest-expo. Start the backend first: `npx supabase start`.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
