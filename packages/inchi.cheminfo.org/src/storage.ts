/**
 * Read a string from `localStorage`, treating an unavailable store (a
 * privacy mode, a disabled cookie jar) as "nothing stored".
 * @param key - The namespaced storage key.
 * @returns The stored string, or null.
 */
export function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Write a string to `localStorage`. Persistence is best-effort: a full
 * quota or an unavailable store is swallowed rather than surfaced.
 * @param key - The namespaced storage key.
 * @param value - The string to store.
 */
export function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Persistence is best-effort.
  }
}

/**
 * Drop an entry from `localStorage`, best-effort.
 * @param key - The namespaced storage key.
 */
export function removeStored(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Persistence is best-effort.
  }
}

/**
 * Read and parse a JSON value from `localStorage`. Anything unreadable —
 * missing, unavailable, or malformed — comes back as null.
 * @param key - The namespaced storage key.
 * @returns The parsed value, or null.
 */
export function readStoredJson(key: string): unknown {
  const raw = readStored(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Serialize a value as JSON into `localStorage`, best-effort.
 * @param key - The namespaced storage key.
 * @param value - The value to serialize.
 */
export function writeStoredJson(key: string, value: unknown): void {
  writeStored(key, JSON.stringify(value));
}
