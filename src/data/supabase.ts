import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { deviceStorage } from './device-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** False until `.env.local` (or the build's environment) has the Supabase URL and key. */
export const isBackendConfigured = Boolean(url && publishableKey);

export const supabase: SupabaseClient | null = isBackendConfigured
  ? createClient(url, publishableKey, {
      auth: {
        storage: deviceStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Magic links land on the website with the session in the URL; phone apps handle links
        // themselves.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

// Phones pause JavaScript in the background, so token refresh follows the app's foreground state.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
