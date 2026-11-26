import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

// Namespaced, versioned, local-first settings. Server-backed preferences can replace
// this adapter when user accounts become available; no API response data is cached.
const VERSION = 1;
export function preferenceKey(page: string, name: string): string {
  return `gsem.preferences.v${VERSION}.${page}.${name}`;
}
export function usePagePreference<T>(
  page: string, name: string, fallback: T | (() => T), isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(preferenceKey(page, name));
      if (saved !== null) {
        const decoded: unknown = JSON.parse(saved);
        if (isValid(decoded)) return decoded;
      }
    } catch { /* Corrupted preferences or disabled storage: safely use defaults. */ }
    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  });
  useEffect(() => {
    try { window.localStorage.setItem(preferenceKey(page, name), JSON.stringify(value)); }
    catch { /* Private browser or storage disabled: keep the in-memory state. */ }
  }, [page, name, value]);
  return [value, setValue];
}
