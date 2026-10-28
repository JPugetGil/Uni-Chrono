import { useEffect, useState } from 'react';
import { CrousData } from '../types/crous';
import { fetchCrous } from '../dataFetcher';

/** Données CROUS, chargées seulement quand `enabled` devient vrai (calque affiché, fiche ouverte) */
export const useCrous = (enabled: boolean): CrousData | null => {
  const [data, setData] = useState<CrousData | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchCrous()
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        // calque ou liste simplement absents en cas d'échec
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return enabled ? data : null;
};
