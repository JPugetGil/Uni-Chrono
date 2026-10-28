import { useEffect, useState } from 'react';
import { Isochrone, bandMinutes } from '../types/isochrone';
import { TransportMode } from '../types/transport';
import { fetchZone } from '../isochroneProvider';
import { IsochroneErrorKind, errorKindOf } from '../isochroneError';
import { colors } from '../design-system/tokens';

/**
 * Zone accessible depuis un point (adresse cherchée, position) pour le mode
 * et la durée courants, avec ses bandes de temps. Calculée seulement quand
 * `enabled` (demande explicite : une requête par point et réglage).
 */
export const useOriginIsochrone = (
  origin: { lat: number; lon: number } | null,
  timeInMinutes: number,
  transportMode: TransportMode,
  enabled: boolean
) => {
  const key = enabled && origin ? `${origin.lat},${origin.lon}:${transportMode}:${timeInMinutes}` : null;
  const [result, setResult] = useState<{ key: string; iso: Isochrone | null; error: IsochroneErrorKind | null } | null>(
    null
  );

  useEffect(() => {
    if (!key || !origin) return;
    const controller = new AbortController();
    const minutes = bandMinutes(timeInMinutes);
    fetchZone(origin.lat, origin.lon, minutes, transportMode, controller.signal)
      .then((bands) => {
        const outer = bands[bands.length - 1];
        setResult({
          key,
          iso: outer ? { coordinates: outer.coordinates, bands, color: colors.origin } : null,
          error: outer ? null : 'failed',
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, iso: null, error: errorKindOf(error) });
      });
    return () => controller.abort();
  }, [key, origin, timeInMinutes, transportMode]);

  const settled = !!key && result?.key === key;
  return {
    isochrone: settled ? result.iso : null,
    loading: !!key && !settled,
    error: settled ? result.error : null,
  };
};
