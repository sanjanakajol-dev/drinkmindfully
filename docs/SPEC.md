# Drink Mindfully — v1 Product Spec

_Status: agreed in planning interview, 28 Sep 2026. "Drink Mindfully" is a working name until the brand kit lands._

## 1. Product

A lifestyle app that makes drinking less feel stylish and premium. The free tier is fast tracking, streaks and shareable progress cards. The premium tier (~€4/month) adds hand-picked venues, a premium drinks catalogue, an AI "alternatives sommelier" and priority support. **Drink Mindfully is not a medical service.**

**Primary user:** a professional in their 30s who drinks 3–4 nights a week and wants to cut back to weekends, or stop entirely, while still looking good doing it.

**Markets:** Bangalore, Mysore, Delhi, Mumbai, Dubai, Marbella, Paris, Lisbon. English only in v1.

### Two paths (switchable at any time)

| | Mindful (cut back) | Alcohol-free (quit) |
|---|---|---|
| Goals | Alcohol-free days per week **and** max drinks per week | Every day alcohol-free |
| Streak | **Weeks on target** (Mon–Sun; AF days ≥ goal and drinks ≤ limit) | **Days in a row** without a drink |
| Always shown | Total alcohol-free days (never goes down) | Total alcohol-free days |
| Alcoholic recommendations | Only where the city switch is on **and** user ≥ local legal drinking age | **Never** |

Switching path changes the streak type; total alcohol-free days carry over. The app never uses the word "relapse".

## 2. Scope and milestones

| Date | Milestone |
|---|---|
| **Wed 28 Oct 2026** | Free core live on the **web** |
| **Tue 1 Dec 2026** | Free core live on **web, iOS and Android**, all 8 cities |
| **Tue 15 Dec 2026** | **Premium on the web** via Razorpay — Mysore, Bangalore, Mumbai (50 venues) |
| **January 2027** | Apple/Google in-app subscriptions (RevenueCat) → premium inside the apps; international venue cities |

### Free core (1 Dec)
- Onboarding: age check (date of birth, under-18 blocked) → path → home city → goals → usual drinks per week, on how many days, and usual price per drink → consent to store health data. Logging possible within 30 seconds; **no account required**.
- Logging: one-tap "Alcohol-free today" / "I drank", or detailed per-drink entry (type, quantity, optional "why"). Alcohol-free drinks are logged as **"mindful choices"** and count as wins.
- Streaks, patterns, **money saved**.
- **Share cards** in 9:16 (Stories) and 1:1 (WhatsApp); user picks which numbers appear (streak, AF days, mindful choices, money saved).
- Reminders (phone apps only, all opt-in): daily check-in at a chosen time, Friday "plan your weekend" nudge, streak milestones (7/30/100).
- Optional sign-in: Sign in with Apple, Google, email magic link. Suggested (never forced) at first share, backup or purchase.
- In-app account deletion and data export.
- **"Need support?"** always visible: local emergency number, national helplines, callback form ("not for emergencies — we reply within 48 hours").
- Free "try this instead" tip after logging a drink (taste of premium, from the catalogue).

### Premium (web from 15 Dec; apps from January)
- Price: **₹399 / €3.99 / AED 16.99 per month**, no free trial.
- Venue guide (hand-picked; photos, recommended AF drinks, price range, vibe tags, opening hours, booking link, "Open in Google Maps").
- Premium drinks catalogue (brands, where to buy).
- AI "alternatives sommelier": premium only, 30 questions/month, recommends **only** from our catalogue and venues.
- Priority support: premium callback requests answered within 24 hours (non-clinical, by the Drink Mindfully team).
- Web subscribers see premium on the web only until January (Apple/Google rules); checkout page says so.

### Out of v1
In-app friends/feed (sharing is outbound only) · languages other than English · AI counselling or relapse support · clinical/professional sessions (until a qualified partner is signed) · venue self-submission or paid listings · in-app bookings/payments to venues · live Google Places data · phone-OTP login · free trials · Apple Health / Google Fit · two-way Sheet sync · admin page · web reminders.

## 3. Core journeys

1. **First open:** age check → path → city → goals → usual drinks & spend → consent → home with a big **Log today** button. Aha = first logged day + first share card.
2. **Daily:** open → if yesterday is unlogged, "Was yesterday alcohol-free?" → one tap or detailed log → progress animation → optional share.
3. **Share:** choose numbers → choose size → native share sheet. First time: skippable "save your progress" sign-in prompt.
4. **Premium (web):** locked previews → Razorpay checkout → premium unlocked on the web.
5. **Support:** button → emergency number + helplines for the user's country → callback form → email to the support inbox.
6. **AI sommelier:** "What should I drink tonight in Bangalore?" → answers only from our data, filtered by path, city switch and age **before** the AI sees it; distress → helplines.
7. **Curation:** curator edits their city's Google Sheet → sets `Publish = Yes` → live within ~15 minutes.

## 4. Rules that must never be wrong

- **Day boundary:** a day runs 04:00–03:59 local device time; a drink at 01:00 counts toward the previous night.
- **Unlogged ≠ alcohol-free.** Users can back-fill up to 7 days.
- **Money saved** = (usual drinks/week × usual price, prorated per day) − (logged drinks × usual price). A quick "I drank" with no details counts as a typical drinking day (usual drinks/week ÷ usual drinking days). Currency = home city currency.
- **Alcoholic content visibility:** shown only if path = Mindful **and** city `alcohol_recs_enabled` **and** user age ≥ city `legal_drinking_age`. At launch the switch is ON for Marbella, Lisbon, Bangalore, Mysore; OFF for Mumbai, Delhi, Dubai, Paris. Karnataka uses 21; Spain and Portugal use 18.
- **Premium access** is decided only by the `subscriptions` record (server-side).
- **18+ only.**

## 5. Data model

| Record | Key fields | Rules |
|---|---|---|
| `profiles` | user id, date of birth, home city, path, AF-days goal, weekly drink limit, usual drinks/week, usual drinking days/week, usual price/drink, reminder settings, consent timestamps | 18+; consent required before logging |
| `drink_logs` | client UUID, user, logical date, logged at (+ tz), alcoholic?, type, quantity, why, source (quick/detailed) | quantity 1–20; back-fill ≤ 7 days; idempotent on client UUID |
| `day_status` | user, date, `alcohol_free` / `drank` | one per user per date; missing row = not logged |
| `cities` | name, country, currency, time zone, alcohol switch, legal drinking age, premium live? | from master Sheet |
| `venues` | city, name, notes, price level, vibe tags, opening hours, booking URL, Google place ID, photos, published, sheet row id | needs name, city, ≥ 1 photo to publish |
| `venue_drink_picks` | venue, name, alcoholic?, description | visibility rules apply |
| `catalogue_drinks` | name, brand, category, alcoholic?, ABV, description, where to buy, markets, photo, published | visibility rules apply |
| `subscriptions` | user, provider (razorpay / apple / google), status, current period end, provider ref | **single source of truth for premium** |
| `support_requests` | contact details, country, message, priority, created at | deleted 90 days after arrival |
| `helplines` | country, name, phone, hours, URL | from master Sheet |
| `ai_usage` | user, month, question count | cap 30/month; chat content stays on device |

Streaks, weeks on target and money saved are **computed**, not stored.

## 6. Architecture

- **App:** Expo (React Native, TypeScript, Expo Router) — one codebase for iOS, Android and web. Offline-first logging with a local outbox that syncs when online.
- **Backend:** Supabase in an **EU region** — Postgres with row-level security on every table, Auth (anonymous → Apple / Google / email link), Storage (photos), Edge Functions (server logic), Cron (scheduled jobs). Two projects: **test** and **live**.
- **Payments:** Razorpay Subscriptions on web; signed webhooks update `subscriptions`. January: RevenueCat for Apple/Google feeding the same table.
- **Content:** Google Sheets (one per city + one master) → validated sync into the database every 15 minutes.
- **AI:** Claude API called from an Edge Function (key never ships in the app); receives pre-filtered data only and never the user's name or email.
- **Supporting services:** transactional email (magic links, support alerts), privacy-friendly analytics on EU servers (actions only, never drink details; opt-in), crash reporting, Expo EAS (builds, store submission, over-the-air fixes), "Open in Google Maps" links (no Maps API).
- **Reminders:** scheduled locally on the device; no push server in v1.

## 7. Non-functional requirements

- GDPR standard everywhere: explicit health-data consent, analytics opt-in, export, deletion, EU hosting.
- Log a day in under 5 seconds from app open; logging works offline.
- Readable contrast and support for larger system text sizes.
- 18+ age rating on both stores.

## 8. Definition of done for 1 Dec

- Main flows work on the founder's iPhone, Pixel, Redmi and Samsung phones, and desktop Chrome and Safari.
- ≥ 1 week of beta with ~20 testers and no crashes in logging, streaks or sharing.
- Share cards post correctly to Instagram Stories and WhatsApp.
- Account deletion and data export work.
- Automated tests pass for day boundary, streaks, money saved, alcoholic-content visibility and premium access.
- Founder gives final sign-off.

## 9. Assumptions

1. Tech stack as in §6; "from scratch" = all custom code on trusted managed services.
2. English only; GDPR everywhere; EU data residency.
3. No free trial; monthly billing only.
4. Day boundary 04:00 local; weeks Mon–Sun; path switch keeps total AF days.
5. Unlogged day ≠ AF; back-fill up to 7 days.
6. Money-saved formula as in §4.
7. Sign-in suggested, never forced.
8. Brand kit arrives by **11 Oct 2026**; neutral placeholder look until then.
9. 50 venues total across Mysore, Bangalore and Mumbai by mid-December.
10. Free taste of premium = "try this instead" tip after logging.
11. Safety features always free; premium extra = 24-hour priority reply from the team; professional sessions only after a qualified partner is signed.
12. AI sommelier ships with premium (15 Dec), premium only, 30 questions/month, Claude Opus 5 by default (switchable to Sonnet 5 or Haiku 4.5).
13. Venue content: one Google Sheet per city (curators see only their city) + a master Sheet only the founder edits; `Publish` column; 15-minute sync; bad rows skipped and emailed; mass-deletion safety brake.
14. Free service tiers until 1 Dec; upgrading the live database at the web launch is recommended (backups). AI costs are on top of the $50/month budget.
15. Alcohol switch per §4.
16. ~20 testers; founder signs off.
17. If late, cut in this order: AI sommelier → drinks catalogue → international cities. The 1 Dec free core is protected.
18. Founder owns the support inbox; helpline list compiled together, verified by the founder.
19. Support requests are deleted 90 days after they arrive (there is no admin page to "close" them).

## 10. Open risks

1. **Timeline:** first app, solo, 9 weeks, grown scope. 1 Dec is realistic; 15 Dec premium is tight.
2. **Store review:** 18+ alcohol-related app may get extra scrutiny. Submit by 20 Nov. If D-U-N-S is late and we fall back to a personal Google account, the 12-tester/14-day closed test applies (the beta is scheduled to satisfy it anyway).
3. **Legal:** India's alcohol advertising rules (accepted by founder), UAE rules, France's Loi Évin. No lawyer review yet.
4. **Tax:** EU VAT from first sale, UAE VAT, Indian GST — must be settled before 15 Dec.
5. **Health-adjacent wording:** anything implying medical service invites scrutiny and liability; keep copy non-clinical.
6. **AI:** could respond badly to a vulnerable user; needs guardrails and a test set; costs scale with usage; must be disclosed in the privacy policy.
7. **Web subscribers lack premium in the apps until January.**
8. **Content load:** 50 venues + catalogue with licensed photos by mid-December; Sheets are fragile.
9. **Free database tier** has no automatic backups and may pause when quiet.
10. **Android battery savers** (Redmi, Samsung) may delay reminders.
11. **Razorpay recurring on foreign cards:** some issuers decline recurring mandates; RBI pre-debit notice rules apply.
12. **Instagram Stories direct share** may need a Meta app ID; normal share sheet is the fallback.
13. **Support SLA** needs daily inbox checks, weekends included.
14. **Brand kit slip** forces design rework near launch.
