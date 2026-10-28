import { useEffect, useState } from 'react';
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { fetchTransitIsochrone } from '../navitiaFetcher';
import { etabId as getEtabId } from '../utils/filters';

/**
 * Isochrone transports en commun (Navitia) pour l'établissement sélectionné.
 * Contrairement au mode Mapbox (pré-calcul massif), le quota gratuit Navitia
 * impose un calcul à la demande, uniquement pour la sélection courante.
 */
export const useTransitIsochrone = (
  etab: Etablissement | null,
  timeInMinutes: number,
  enabled: boolean
) => {
  // iso null : la requête a échoué (quota, clé, réseau)
  const [result, setResult] = useState<{ key: string; iso: Isochrone | null } | null>(null);

  const etabId = etab ? getEtabId(etab) : null;
  const key = etabId ? `${etabId}:${timeInMinutes}` : null;

  useEffect(() => {
    if (!enabled || !etab || !key) return;
    const ctrl = new AbortController();
    fetchTransitIsochrone(etab.coordonnees.lat, etab.coordonnees.lon, timeInMinutes * 60, ctrl.signal)
      .then((coordinates) => {
        setResult({
          key,
          iso: {
            coordinates,
            color: etab.color || '#2196f3',
            etablissementId: getEtabId(etab),
          },
        });
      })
      .catch(() => {
        // abort : rien à faire ; autres erreurs : isochrone indisponible
        if (!ctrl.signal.aborted) setResult({ key, iso: null });
      });
    return () => ctrl.abort();
  }, [enabled, etab, key, timeInMinutes]);

  const settled = enabled && !!key && result?.key === key;
  const isochrone = settled ? result.iso : null;
  const loading = enabled && !!key && !settled;
  const failed = settled && !result.iso;
  return { isochrone, loading, failed };
};
