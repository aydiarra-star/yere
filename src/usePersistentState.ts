import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type StorageReaderWriter = Pick<Storage, "getItem" | "setItem">;

/**
 * Preserve rejected browser data before the normal persistence effect replaces it.
 * Recovery copies are raw JSON strings so they can be inspected or exported later.
 */
export function preserveRejectedStorageValue(
  storage: StorageReaderWriter,
  key: string,
  raw: string
): boolean {
  try {
    for (let index = 1; index <= 100; index += 1) {
      const recoveryKey = index === 1 ? `${key}.recovery` : `${key}.recovery-${index}`;
      const existing = storage.getItem(recoveryKey);
      if (existing === raw) return true;
      if (existing === null) {
        storage.setItem(recoveryKey, raw);
        return storage.getItem(recoveryKey) === raw;
      }
    }
  } catch {
    // If storage is unavailable or full, do not overwrite the original value on mount.
  }
  return false;
}

/**
 * Browser-local persistence for the prototype only.
 * This is not a substitute for authenticated, server-side storage.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  isValid?: (value: unknown) => value is T
): [T, Dispatch<SetStateAction<T>>] {
  // Authenticated accounts get isolated browser caches while cloud sync is being rolled out.
  const storageKey = typeof window !== "undefined"
    ? `${key}::${window.sessionStorage.getItem("yere-user-scope") ?? "guest"}`
    : key;
  const skipInitialWrite = useRef(false);
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    let saved: string | null;
    try {
      saved = window.localStorage.getItem(storageKey);
    } catch {
      return initialValue;
    }
    if (saved === null) return initialValue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(saved);
    } catch {
      if (!preserveRejectedStorageValue(window.localStorage, storageKey, saved)) {
        skipInitialWrite.current = true;
      }
      return initialValue;
    }

    if (isValid && !isValid(parsed)) {
      if (!preserveRejectedStorageValue(window.localStorage, storageKey, saved)) {
        skipInitialWrite.current = true;
      }
      return initialValue;
    }
    return parsed as T;
  });

  useEffect(() => {
    if (skipInitialWrite.current) {
      // Keep the rejected original value intact if a recovery copy could not be made.
      skipInitialWrite.current = false;
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage can be unavailable or full; keep the UI usable for this session.
    }
  }, [storageKey, value]);

  return [value, setValue];
}
