import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { memoryStorage, type KeyValueStorage } from './storage';

/** Browsers can refuse localStorage (private windows, blocked site data, some embedded views). */
function browserStorageWorks(): boolean {
  if (typeof window === 'undefined') return false; // static web build
  try {
    const probe = '__dm_storage_probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Device storage: AsyncStorage on phones, localStorage on the web. Where the browser refuses
 * storage the app still works for the visit and keeps nothing afterwards.
 */
export const deviceStorage: KeyValueStorage =
  Platform.OS !== 'web' || browserStorageWorks() ? AsyncStorage : memoryStorage();
