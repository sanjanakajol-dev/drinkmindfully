# Setup — trying the app and connecting the test backend

This guide is for the founder. It takes about 30 minutes the first time. You do not need to write code.

## 1. See the app on your iPhone (no backend needed)

1. Install **Node.js LTS** from nodejs.org and **Git** on your computer.
2. On your iPhone, install **Expo Go** from the App Store.
3. In a terminal:
   ```bash
   git clone https://github.com/sanjanakajol-dev/drinkmindfully.git
   cd drinkmindfully
   git checkout claude/new-project-planning-x5c9no
   npm install
   npx expo start
   ```
4. Scan the QR code with your iPhone camera. The app opens in Expo Go.
   Your phone and computer must be on the same Wi-Fi. If it doesn't connect, stop it (Ctrl+C) and run `npx expo start --tunnel`.
5. Press **w** in the terminal to open the web version in your browser too.

Without a backend the app still works; the Sync card says changes are staying on the device.

## 2. Create the test backend (Supabase, EU)

1. Sign up at supabase.com and create an organisation for Drink Mindfully.
2. Create a project named **drinkmindfully-test**, region **Central EU (Frankfurt)**. Save the database password somewhere safe (a password manager).
3. In the project, open **Project Settings → API** and copy the **Project URL** and the **publishable key**.
   Never copy the *secret* / *service role* key into the app or into chat.
4. In the `drinkmindfully` folder, create a file named `.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=<your Project URL>
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable key>
   ```
5. Push the database structure and the city list:
   ```bash
   npx supabase login
   npx supabase link --project-ref <the 20-letter id from your project URL>
   npx supabase db push --include-seed
   ```
6. In the dashboard, open **Authentication → Sign In / Providers** and switch on
   **Allow anonymous sign-ins** and **Allow manual linking**. Leave **Confirm email** on.
   (We don't push `supabase/config.toml` to hosted projects: it holds local-development settings,
   such as skipping email confirmation, that must never reach a real project.)
7. Restart `npx expo start`. The Sync card should say **Connected with a guest account**.
8. In the Supabase dashboard, **Table Editor → day_status** shows the days you log.

Later we create **drinkmindfully-live** the same way for the real launch.

## 3. What to try this week

- Tap **Alcohol-free today**, close the app completely, reopen: it should still be logged.
- Turn on airplane mode, log, turn it off, reopen the app: the "waiting to sync" note should disappear.
- Tap **Share** in both sizes and post a test to your Instagram Story (you can delete it) and to a WhatsApp chat with yourself.
- Tell me anything that looks wrong or feels slow.
