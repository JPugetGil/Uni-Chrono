import { useEffect, useState } from 'react';
import { Place, searchPlaces } from '../geocodingFetcher';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;

/**
 * Adresses correspondant à la saisie (Géoplateforme), après une pause de frappe.
 * Les derniers résultats restent affichés pendant la requête suivante.
 */
export const useGeocoder = (query: string) => {
  const [result, setResult] = useState<{ query: string; places: Place[] }>({ query: '', places: [] });
  const trimmed = query.trim();
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(trimmed, controller.signal)
        .then((places) => setResult({ query: trimmed, places }))
        .catch(() => {
          // réseau ou abort : on garde les résultats précédents
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, enabled]);

  return {
    places: enabled ? result.places : [],
    loading: enabled && result.query !== trimmed,
  };
};
