import { useCallback, useSyncExternalStore } from 'react';

/** Vrai tant que la media query correspond (mise à jour au redimensionnement). */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
};

const subscribeResize = (onChange: () => void) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};

/** Hauteur de la fenêtre en px (hauteurs du volet mobile). */
export const useViewportHeight = (): number =>
  useSyncExternalStore(subscribeResize, () => window.innerHeight);
