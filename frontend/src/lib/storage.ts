/**
 * Safe localStorage access. Some browsers throw on every call (private mode,
 * blocked site data), so each call is guarded and writes are also kept in memory:
 * the app still works for the session, it just forgets on reload.
 */

/** Values written or removed this session (null = removed); wins over localStorage. */
const memory = new Map<string, string | null>();

export function readString(key: string): string | null {
  if (memory.has(key)) {
    return memory.get(key) ?? null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full: the in-memory copy keeps the value for this session.
  }
}

export function removeKey(key: string): void {
  memory.set(key, null);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable: the in-memory tombstone hides the old value for this session.
  }
}
