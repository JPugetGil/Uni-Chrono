import { useCallback, useState } from 'react';

/** Booléen persisté dans le localStorage (repli du panneau, aide déjà vue…). */
export const usePersistentFlag = (key: string, initial: boolean) => {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === '1';
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // ignore
      }
    },
    [key]
  );

  return [value, update] as const;
};
