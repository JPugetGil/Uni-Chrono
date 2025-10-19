import { useState, useEffect } from 'react';
import { Etablissement } from '../types/etablissement';
import { fetchAllEtablissementsData } from '../dataGouvFetcher';
import LocalStorageCache from '../LocalStorageCache';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export const useEtablissements = () => {
  const [etablissementsGeoJSON, setEtablissementsGeoJSON] = useState<Etablissement[] | undefined>(() => {
    const cached = LocalStorageCache.loadEtablissements();
    return cached || undefined;
  });
  const [loadedFromCache, setLoadedFromCache] = useState<boolean>(false);
  const [cacheTimestampTitle, setCacheTimestampTitle] = useState<string>('');

  useEffect(() => {
    // Si déjà en cache, ne pas refetch
    if (etablissementsGeoJSON && etablissementsGeoJSON.length > 0) return;
    
    const fetchData = async () => {
      const cachedEntry = LocalStorageCache.loadEtablissementsEntry(DEFAULT_TTL_MS);
      if (cachedEntry && cachedEntry.data.length > 0) {
        setEtablissementsGeoJSON(cachedEntry.data);
        setLoadedFromCache(true);
        setCacheTimestampTitle(`Étab. mis en cache: ${new Date(cachedEntry.ts).toLocaleString()}`);
        return;
      }
      const data = await fetchAllEtablissementsData();
      setEtablissementsGeoJSON(data);
      LocalStorageCache.saveEtablissements(data);
      setLoadedFromCache(false);
    };
    
    fetchData().catch(console.error);
  }, [etablissementsGeoJSON]);

  return {
    etablissementsGeoJSON,
    loadedFromCache,
    cacheTimestampTitle,
  };
};
