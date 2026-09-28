import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { memoryStorage, type KeyValueStorage } from './storage';

// During the static web build there is no `window`, so nothing can be stored.
const isStaticRender = Platform.OS === 'web' && typeof window === 'undefined';

/** Device storage: AsyncStorage on phones, localStorage on the web. */
export const deviceStorage: KeyValueStorage = isStaticRender ? memoryStorage() : AsyncStorage;
