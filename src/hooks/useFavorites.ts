import { useCallback, useState } from 'react';

const STORAGE_KEY = 'favorites';
/** Au-delà, la comparaison côte à côte ne tient plus dans le panneau */
export const MAX_FAVORITES = 4;

const load = (): string[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string').slice(0, MAX_FAVORITES) : [];
  } catch {
    return [];
  }
};

/** Établissements favoris (identifiants de site), mémorisés dans le navigateur */
export const useFavorites = () => {
  const [ids, setIds] = useState<string[]>(load);

  const save = useCallback((next: string[]) => {
    setIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  /** Ajoute ou retire ; refuse un ajout au-delà du maximum (renvoie false) */
  const toggle = useCallback(
    (id: string): boolean => {
      if (ids.includes(id)) {
        save(ids.filter((x) => x !== id));
        return true;
      }
      if (ids.length >= MAX_FAVORITES) return false;
      save([...ids, id]);
      return true;
    },
    [ids, save]
  );

  return { ids, toggle, remove: (id: string) => save(ids.filter((x) => x !== id)) };
};
