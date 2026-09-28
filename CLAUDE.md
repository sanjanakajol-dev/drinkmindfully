@AGENTS.md

# Drink Mindfully

Spec: `docs/SPEC.md` · Build plan: `docs/PLAN.md` · Founder setup: `docs/SETUP.md`

## Where things live

- `src/domain/` — pure product rules (days, streaks, money saved, alcohol visibility, premium). No React or Expo imports. Any rule change needs a table-driven test in `src/domain/__tests__/`.
- `src/data/` — device storage, the offline outbox, the journal, the Supabase client and sync.
- `src/features/`, `src/ui/` (design tokens in `src/ui/theme.ts`; the brand kit plugs in there), `src/strings/en.ts` (all user-facing copy).
- `supabase/migrations/` — schema and row-level security; `supabase/tests/database/` — pgTAP tests; `supabase/seed.sql` must match `src/domain/cities.ts` (a unit test checks).

## Rules

- `public.is_premium()` and `public.can_see_alcoholic_content()` mirror `src/domain/entitlements.ts` and `src/domain/visibility.ts`; change them together.
- Every table has RLS on, with privileges revoked from `anon`/`authenticated` and granted back explicitly.
- React Compiler is on: components read external stores through `useSyncExternalStore` with immutable snapshots, never by calling methods on a mutable object.
- Never commit secrets (`.env.local` is gitignored). Never push `supabase/config.toml` to a hosted project; it holds local-only settings.

## Commands

```bash
npm run lint && npm run typecheck && npm run format:check && npm test
npx supabase start -x studio,realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
npx supabase test db
SUPABASE_TEST_URL=... SUPABASE_TEST_PUBLISHABLE_KEY=... npm run test:integration
npx expo export --platform web && npm run test:web
```

Where the network blocks api.expo.dev, prefix Expo commands with `EXPO_OFFLINE=1`.
