import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { ensureSession } from './auth';
import { deviceStorage } from './device-storage';
import { Journal, type JournalState } from './journal';
import { Outbox } from './outbox';
import { supabase } from './supabase';
import { supabaseSender } from './sync';

export const outbox = new Outbox(deviceStorage);
export const journal = new Journal(deviceStorage, outbox);

export type SyncState = {
  backend: 'not_configured' | 'offline' | 'connected';
  userId?: string;
  isAnonymous?: boolean;
  pending: number;
};

let syncState: SyncState = { backend: supabase ? 'offline' : 'not_configured', pending: 0 };
const syncListeners = new Set<() => void>();

function setSyncState(next: Partial<SyncState>) {
  syncState = { ...syncState, ...next };
  for (const listener of syncListeners) listener();
}

/** Signs in (anonymously if needed) and sends everything waiting in the outbox. Never throws. */
export async function syncNow(): Promise<void> {
  if (!supabase) {
    setSyncState({ pending: (await outbox.pending()).length });
    return;
  }
  try {
    const session = await ensureSession(supabase);
    const result = await outbox.flush(supabaseSender(supabase));
    if (result.rejected.length) console.warn('Server rejected changes', result.rejected);
    setSyncState({
      backend: 'connected',
      userId: session.user.id,
      isAnonymous: session.user.is_anonymous,
      pending: result.remaining,
    });
  } catch {
    setSyncState({ backend: 'offline', pending: (await outbox.pending()).length });
  }
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (listener) => {
      syncListeners.add(listener);
      return () => syncListeners.delete(listener);
    },
    () => syncState,
    () => syncState,
  );
}

/** Loads the journal and keeps it syncing: on start, after each change, and on returning to the app. */
export function useJournal(): JournalState {
  useEffect(() => {
    const unsubscribe = journal.subscribe(() => void syncNow());
    void journal.load();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  return useSyncExternalStore(journal.subscribe, journal.getSnapshot, journal.getSnapshot);
}
