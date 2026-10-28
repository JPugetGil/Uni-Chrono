import { useEffect, useState } from 'react';
import { Etablissement } from '../types/etablissement';
import { Isochrone, bandMinutes } from '../types/isochrone';
import { fetchTransitIsochrone } from '../geoapifyFetcher';
import { IsochroneErrorKind, errorKindOf } from '../isochroneError';
import { etabId as getEtabId } from '../utils/filters';

/**
 * Isochrone transports en commun (Geoapify), avec ses bandes de temps, pour
 * l'établissement sélectionné. Le quota gratuit est partagé par tous les
 * visiteurs : calcul à la demande, uniquement pour la sélection courante.
 */
export const useTransitIsochrone = (
  etab: Etablissement | null,
  timeInMinutes: number,
  enabled: boolean
) => {
  // iso null : échec, dont la cause est dans error
  const [result, setResult] = useState<{ key: string; iso: Isochrone | null; error: IsochroneErrorKind | null } | null>(
    null
  );

  const etabId = etab ? getEtabId(etab) : null;
  const key = etabId ? `${etabId}:${timeInMinutes}` : null;

  useEffect(() => {
    if (!enabled || !etab || !key) return;
    const ctrl = new AbortController();
    fetchTransitIsochrone(etab.coordonnees.lat, etab.coordonnees.lon, bandMinutes(timeInMinutes), ctrl.signal)
      .then((bands) => {
        const outer = bands[bands.length - 1];
        setResult({
          key,
          iso: outer
            ? { coordinates: outer.coordinates, bands, color: etab.color || '#2a78d6', etablissementId: getEtabId(etab) }
            : null,
          error: outer ? null : 'failed',
        });
      })
      .catch((error) => {
        if (!ctrl.signal.aborted) setResult({ key, iso: null, error: errorKindOf(error) });
      });
    return () => ctrl.abort();
  }, [enabled, etab, key, timeInMinutes]);

  const settled = enabled && !!key && result?.key === key;
  const isochrone = settled ? result.iso : null;
  const loading = enabled && !!key && !settled;
  const error = settled ? result.error : null;
  return { isochrone, loading, error };
};
