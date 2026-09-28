# Drink Mindfully — Implementation Plan

_Companion to [SPEC.md](./SPEC.md). Written 28 Sep 2026. Dates assume work starts Mon 28 Sep._

## 0. Principles

1. **Protect 1 December.** The free core ships on all three platforms on 1 Dec. Premium work never blocks it.
2. **Riskiest things first.** Auth linking, offline sync and share images are proven in week 1 before we build on them.
3. **The rules live in one tested place.** Day boundary, streaks, money saved, alcohol visibility and premium access are pure functions with table-driven tests, used by both the app and the server.
4. **Everything goes to "test" first.** Two environments; the founder tries every change in test before it reaches live.
5. **A demo every Friday.** Each week ends with a web link or phone build plus a short "what to try" checklist.

## 1. Stack and versions

| Layer | Choice | Notes |
|---|---|---|
| App framework | **Expo SDK 57** (React Native 0.86, React 19.2) | Confirmed on day 1: `expo@57.0.25` is `latest` on npm; SDK 58 is still a preview. |
| Language | TypeScript (strict) | Shared types between app and Edge Functions. |
| Navigation | Expo Router | File-based routes; same code for web. |
| Server state | TanStack Query, persisted on device | Offline cache. |
| Offline writes | Local outbox (AsyncStorage) + client-generated UUIDs + idempotent server upserts | Works on iOS, Android and web. Proven in week 1 spike. |
| Validation | Zod | Same schemas in app, Edge Functions and Sheet sync. |
| Backend | **Supabase, EU region** (test + live projects) | Postgres + RLS, Auth, Storage, Edge Functions, Cron. |
| Auth | Anonymous sign-in → link Apple / Google (native ID token) / email magic link | Manual identity linking must be enabled; user id stays the same after linking. |
| Payments (web) | Razorpay Subscriptions | 3 plans (INR / EUR / AED); HMAC-signed webhooks. |
| Payments (apps, Jan) | RevenueCat + Apple IAP + Google Play Billing | Feeds the same `subscriptions` table. |
| Content | Google Sheets API (service account, read-only) | Every 15 min via Supabase Cron. |
| AI | Claude API from an Edge Function | Default model `claude-opus-5` with automatic refusal fallback enabled; switchable to Sonnet 5 / Haiku 4.5 by config. |
| Reminders | `expo-notifications`, local scheduling | No push server in v1. |
| Share cards | View capture → native share sheet; Web Share API with download fallback on web | Instagram Stories direct share only if a Meta app ID is set up. |
| Analytics | Privacy-friendly product analytics, EU hosting, opt-in | Events only; never drink types or amounts. |
| Crash reporting | Sentry (Expo integration) | |
| Email | Transactional email service (free tier) as Supabase custom SMTP + support alerts | |
| Builds / release | EAS Build, EAS Submit, EAS Update (over-the-air JS fixes) | |
| Web hosting | Static export of the Expo web build on EAS Hosting or Cloudflare Pages | Chosen in week 1 after checking current free-tier terms. |

All libraries are added with `npx expo install` so versions match SDK 57, then pinned.

## 2. Repository layout

```
src/
  app/                    Expo Router screens (every file is a route)
  domain/                 pure rules + tests: days, streaks, money, visibility, entitlements
  data/                   Supabase client, auth, outbox, journal, sync
  features/               sharing, logging, reminders, premium, sommelier, support
  ui/                     design tokens (brand kit plugs in here), components
  strings/en.ts           every user-facing string (French later = one new file)
supabase/
  migrations/             SQL schema, RLS policies, functions
  functions/              Edge Functions (see §5)
  tests/database/         pgTAP row-level security and data-rule tests
e2e/                      Playwright web smoke tests
docs/
  SPEC.md  PLAN.md  SETUP.md
  content/                Google Sheet templates and curator guide
  legal/                  privacy policy, terms, refund policy drafts
.github/workflows/        CI
```

## 3. Environments and delivery

| | Test | Live |
|---|---|---|
| Supabase project | `drinkmindfully-test` | `drinkmindfully-live` |
| Web | `test.<domain>` | `<domain>` |
| Phone builds | EAS "preview" profile → TestFlight / Play internal testing | EAS "production" profile → stores |
| Razorpay | Test mode | Live mode |
| Google Sheets | Copies marked TEST | Real Sheets |

- **Pull request →** CI runs lint, typecheck, unit tests and database tests.
- **Merge to `main` →** migrations and Edge Functions deploy to **test**; web deploys to `test.<domain>`.
- **Release tag →** after founder approval, deploy to **live**; store builds via EAS.
- **Secrets** live in Supabase / EAS / GitHub secret stores and never in the repo.

## 4. Timeline

| Week | Dates | Build | Founder | Exit check |
|---|---|---|---|---|
| 1 | 28 Sep – 4 Oct | Repo, CI, both Supabase projects, schema v1 + RLS, placeholder design tokens. **Spikes:** anonymous → Apple/Google/email linking; offline outbox; share-card image on iOS, Android, web | D-U-N-S application; domain; support inbox; designer brief; tester list; create Expo / Supabase / GitHub access | App opens on your iPhone and in a browser; anonymous user saved to test DB |
| 2 | 5 – 11 Oct | Onboarding (age gate, path, city, goals, spend, consent); home; quick + detailed logging; mindful choices; day rules (4 am, back-fill, "was yesterday AF?"); offline sync | Review onboarding wording; **brand kit due 11 Oct** | Log a day in < 5 s; logging works in airplane mode |
| 3 | 12 – 18 Oct | Apply brand kit; streak engine (weeks on target / days in a row / total AF days); money saved; progress screen; share cards (2 sizes, stat picker) | Test sharing to Instagram Stories and WhatsApp; approve card design | Rules tests green; shares post correctly |
| 4 | 19 – 25 Oct | Sign-in linking (Apple, Google, email); soft sign-in prompts; account deletion + data export; support screen + callback form; reminders; analytics (opt-in) + crash reporting; legal page drafts | Verify helpline list; send legal drafts for review; Apple + Google developer accounts active | Full GDPR flow works end to end |
| 5 | 26 Oct – 1 Nov | Live environment; web deploy; **web launch Wed 28 Oct**; store listing assets; first EAS store builds | Approve store text and screenshots; answer age-rating / privacy / data-safety questionnaires with me; decide database upgrade | Website live on your domain |
| 6 | 2 – 8 Nov | **Beta starts Wed 4 Nov** (TestFlight + Play closed test); Sheet templates; Sheets → DB sync | Onboard ~20 testers; start filling venue Sheets | All testers installed |
| 7 | 9 – 15 Nov | Beta fixes; venue list/detail, catalogue, visibility rules, "try this instead" tip, premium previews | Gather tester feedback; venues in progress | No crashes in core flows |
| 8 | 16 – 22 Nov | **Beta ends Wed 18 Nov** (14 days); **submit to both stores Fri 20 Nov**; Razorpay subscriptions in test mode | Sign off the release; create Razorpay plans | Submitted |
| 9 | 23 – 29 Nov | Store-review buffer; AI sommelier + test set; priority support | Answer reviewer questions; ≥ 30 venues | Both apps approved (manual release) |
| 10 | 30 Nov – 6 Dec | **Launch Tue 1 Dec**; monitoring; hotfixes via EAS Update | Launch posts | Live on web, iOS, Android |
| 11 | 7 – 13 Dec | Premium beta with testers (small live payments); fixes | **50 venues + catalogue by 8 Dec**; tax and legal sign-off by 10 Dec | Premium beta passes |
| 12 | 14 – 20 Dec | **Premium on web Tue 15 Dec** | Launch posts | First paying customers |
| Jan | | RevenueCat + Apple/Google billing; premium in apps; international venue cities | Set up in-app products; international content | Premium on all 3 platforms |

The 14-day beta (4–18 Nov) also satisfies Google's closed-testing rule if the organisation account is not ready and we must fall back to a personal account.

## 5. Build details by area

### 5.1 Database (Supabase migrations)
- Tables as in SPEC §5. Every table has RLS on. Users can read and write only their own `profiles`, `drink_logs`, `day_status`, `ai_usage`.
- `support_requests`: insert-only for users; readable only by server functions.
- Content tables (`cities`, `venues`, `venue_drink_picks`, `catalogue_drinks`, `helplines`): readable through **server-side functions that apply the visibility rules** (path, city switch, age from date of birth) and premium checks. The app never filters alcoholic content by itself.
- `is_premium(user)` reads only `subscriptions`.
- Key constraints: `day_status (user_id, date)` unique; `drink_logs.id` = client UUID (idempotent); `quantity between 1 and 20`; date of birth ≥ 18 years ago.
- Daily cleanup job: delete support requests older than 90 days; delete anonymous users with no activity for 180 days.

### 5.2 Edge Functions
| Function | Trigger | Job |
|---|---|---|
| `razorpay-create-subscription` | App (signed-in user) | Pick plan by currency, create Razorpay subscription, return id for checkout |
| `razorpay-webhook` | Razorpay | Verify `X-Razorpay-Signature` (HMAC-SHA256 over raw body); idempotent by event id; update `subscriptions` (activated, charged, halted, cancelled, completed) |
| `sheets-sync` | Cron `*/15 * * * *` | Read master + city Sheets; validate rows (Zod); upsert where `Publish = Yes`; copy new photos from Drive links into Storage; skip bad rows; stop if > 20% of a city's live rows would disappear; email a report |
| `ai-sommelier` | App (premium) | Check premium + monthly cap; build context from rule-filtered catalogue and venues for the user's city; call Claude; return a message plus **item IDs only from that list** (structured output), so the app renders real cards; distress → helpline card |
| `support-request` | App | Store request, mark priority if premium, email the support inbox |
| `export-data` | App | Return all of the user's data as JSON |
| `delete-account` | App | Cancel any Razorpay subscription, delete user data and auth user |
| `cleanup` | Cron daily | Retention rules in §5.1 |

### 5.3 App features
- **Onboarding:** 6 short screens; progress dots; date-of-birth picker; under-18 stops with a polite message.
- **Logging:** big "Alcohol-free today" and "I drank" buttons; "add details" expands to type chips (beer, wine, spirit, cocktail, mocktail, 0.0 beer, other), quantity stepper, optional "why" chips. If a day marked alcohol-free gets an alcoholic drink, the app confirms and switches the day to "drank".
- **Progress:** current streak, total AF days, mindful choices, money saved, last 4 weeks as simple bars, top "why" reasons.
- **Share:** stat picker, 9:16 and 1:1 templates from the brand kit, native share sheet; web uses the Web Share API with a download fallback.
- **Reminders:** settings screen with three toggles, time picker for daily check-in; "reminders not arriving?" help for Redmi/Samsung battery settings.
- **Support:** country detected from home city; emergency number first, then helplines, then callback form.
- **Discover (premium):** venue list per city with filters (vibe, price), venue detail, catalogue; locked previews for free users.

### 5.4 AI sommelier guardrails
- Alcoholic items are removed **before** the model sees the data for Alcohol-free users, cities with the switch off, and under-age users.
- The model may only recommend item IDs from the list it was given; anything else is dropped.
- Distress or medical questions get the helpline card and a short non-clinical reply.
- 30 questions per month per premium user; short input length limit.
- The request carries no name or email; chat history stays on the device.
- A test set of ~50 prompts (normal requests, Alcohol-free users asking for alcohol, under-age users, distress, off-topic, prompt-injection attempts) must pass before launch and after any prompt or model change.

### 5.5 Analytics events (opt-in only)
`onboarding_started`, `onboarding_completed`, `day_logged` (source: quick/detailed — no amounts), `mindful_choice_logged`, `share_card_created`, `account_linked`, `reminder_enabled`, `premium_preview_viewed`, `checkout_started`, `subscription_activated`, `sommelier_question_asked` (no content), `support_opened`.

Dashboards: day-1 logging rate, day-7 and day-30 retention, shares per user, web visitor → premium conversion.

### 5.6 Store compliance checklist
- Apple: 18+ age rating answers (frequent alcohol references), App Privacy labels, Sign in with Apple, in-app account deletion, non-clinical wording, no encouragement of excessive drinking.
- Google: content rating questionnaire, target audience 18+, Data safety form, Health apps declaration, closed-testing evidence if on a personal account.
- Both: privacy policy and terms URLs on the live domain, support URL, screenshots for each required device size.

## 6. Testing

| Level | What | Tool |
|---|---|---|
| Rules | Day boundary, back-fill, streaks (both paths, path switch), money saved, visibility matrix (path × city × age), premium status | Jest, table-driven cases |
| Database | RLS: users can't read each other's data; content functions hide alcoholic items correctly; premium gating | Supabase local + SQL tests in CI |
| Server | Razorpay signature + duplicate events; Sheet validation and safety brake | Edge Function tests |
| Web smoke | Onboarding → log → share → delete account | Playwright |
| Phones | Release checklist on founder's iPhone + Pixel, Redmi, Samsung | Manual, every Friday build |
| AI | ~50-prompt test set | Script, run before every AI change |

**Definition of done** for any feature: its rules have tests, it works offline where relevant, it works in test on web and one phone, and the Friday checklist passes.

## 7. Founder deadlines

| By | What |
|---|---|
| This week | Apply for D-U-N-S; register domain; create support inbox (e.g. support@domain); brief designer; start tester list |
| 11 Oct | Brand kit: logo, app icon (1024 px), colours, fonts, share-card look |
| 16 Oct | If D-U-N-S has not arrived: decide whether to enrol Apple/Google as an individual for now |
| 19 Oct | Apple Developer + Google Play accounts active |
| 25 Oct | Helpline list verified; legal pages sent for review |
| 28 Oct | Decide live database upgrade (~$25/month, recommended) |
| 4 Nov | ~20 testers confirmed with emails and phone models |
| 8 Dec | 50 venues + catalogue in Sheets, photos with permission |
| 10 Dec | Tax (EU VAT / UAE VAT / GST) set up; lawyer check on alcohol listings in India |
| Daily from 28 Oct | Check the support inbox |

## 8. If we fall behind — cut in this order

1. AI sommelier → January.
2. Drinks catalogue → January (venues only).
3. Friday nudge (keep daily check-in and milestones).
4. Instagram Stories direct share (keep the normal share sheet).

**Never cut:** rules tests, consent, account deletion and export, the support screen.

## 9. Costs over time

| From | Item | Approx. |
|---|---|---|
| Now | Apple Developer | $99 / year |
| Now | Google Play | $25 once |
| Now | Domain | ~$10–15 / year |
| 28 Oct (recommended) or 1 Dec | Supabase Pro (live project) | ~$25 / month |
| If free build quota runs out | Expo Starter | $19 / month |
| 15 Dec | Claude API for the sommelier | ~$40–60 / month per 100 active premium users on Opus 5 (≈ 2.5× less on Sonnet 5, ≈ 5× less on Haiku 4.5) |
| 15 Dec | Razorpay | per-transaction fees |
| January | RevenueCat, Apple/Google store fees | per-transaction |
