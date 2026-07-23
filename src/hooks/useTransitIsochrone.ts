import { useEffect, useState } from 'react';
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { fetchTransitIsochrone } from '../navitiaFetcher';

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
  const [result, setResult] = useState<{ key: string; iso: Isochrone } | null>(null);

  const etabId = etab ? etab.uai || `${etab.coordonnees.lat},${etab.coordonnees.lon}` : null;
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
            etablissementId: etab.uai || `${etab.coordonnees.lat},${etab.coordonnees.lon}`,
          },
        });
      })
      .catch(() => {
        // erreurs (abort, quota, pas de clé) : pas d'isochrone affiché
      });
    return () => ctrl.abort();
  }, [enabled, etab, key, timeInMinutes]);

  const isochrone = enabled && key && result?.key === key ? result.iso : null;
  const loading = enabled && !!key && result?.key !== key;
  return { isochrone, loading };
};
