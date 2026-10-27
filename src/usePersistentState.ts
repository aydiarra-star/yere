import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Browser-local persistence for the prototype only.
 * This is not a substitute for authenticated, server-side storage.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  isValid?: (value: unknown) => value is T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved === null) return initialValue;
      const parsed: unknown = JSON.parse(saved);
      if (isValid && !isValid(parsed)) return initialValue;
      return parsed as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable or full; keep the UI usable for this session.
    }
  }, [key, value]);

  return [value, setValue];
}
