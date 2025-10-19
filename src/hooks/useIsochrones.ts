import { useState, useEffect } from 'react';
import { Isochrone } from '../types/isochrone';
import { Etablissement } from '../types/etablissement';
import { fetchIsochroneData } from '../mapboxFetcher';
import LocalStorageCache from '../LocalStorageCache';

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export const useIsochrones = (
  etablissementsGeoJSON: Etablissement[] | undefined,
  timeInMinutes: number,
  transportMode: 'walking' | 'cycling' | 'driving-traffic' | 'driving'
) => {
  const cacheKey = `${transportMode}:${timeInMinutes}`;
  const [isochrones, setIsochrones] = useState<Isochrone[]>(() => {
    const cached = LocalStorageCache.loadIsochrones(cacheKey);
    return cached || [];
  });
  const [controller, setController] = useState(new AbortController());
  const [loadedFromCache, setLoadedFromCache] = useState<boolean>(false);
  const [cacheTimestampTitle, setCacheTimestampTitle] = useState<string>('');

  useEffect(() => {
    controller.abort();

    // D'abord essayer de charger depuis le cache pour cette config (mode+temps)
    const cachedEntry = LocalStorageCache.loadIsochronesEntry(cacheKey, DEFAULT_TTL_MS);
    if (cachedEntry && cachedEntry.data.length > 0) {
      setIsochrones(cachedEntry.data);
      setLoadedFromCache(true);
      setCacheTimestampTitle(`Isochrones mis en cache: ${new Date(cachedEntry.ts).toLocaleString()}`);
      return; // Pas besoin de refetch
    }

    // Pas de cache: reset l'état et le cache puis fetch
    setIsochrones([]);
    LocalStorageCache.saveIsochrones([], cacheKey);
    const cont = new AbortController();
    setController(cont);
    const signal = cont.signal;

    const fetchData = async () => {
      if (!etablissementsGeoJSON) return;

      for (const etablissement of etablissementsGeoJSON) {
        if (signal.aborted) break;
        try {
          const coordinates = await fetchIsochroneData(
            etablissement.coordonnees.lat,
            etablissement.coordonnees.lon,
            timeInMinutes * 60,
            transportMode,
            signal
          );
          if (!coordinates || coordinates.length === 0) continue;
          const isochrone: Isochrone = {
            coordinates,
            color: etablissement.color || '#000000',
            etablissementId: etablissement.uai || `${etablissement.coordonnees.lat},${etablissement.coordonnees.lon}`,
          };
          setIsochrones((prevIsochrones) => {
            const updated = [...prevIsochrones, isochrone];
            LocalStorageCache.saveIsochrones(updated, cacheKey);
            return updated;
          });
        } catch {
          // ignore individual fetch errors (including abort)
        }
      }
      setLoadedFromCache(false);
    };

    fetchData().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementsGeoJSON, timeInMinutes, transportMode]);

  return {
    isochrones,
    loadedFromCache,
    cacheTimestampTitle,
  };
};
