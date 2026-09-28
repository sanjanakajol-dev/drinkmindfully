/** The small key-value interface the app's stores need. Tests pass an in-memory version. */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => void values.set(key, value),
    removeItem: async (key) => void values.delete(key),
  };
}
