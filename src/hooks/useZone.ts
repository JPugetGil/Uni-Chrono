import { useEffect, useMemo, useRef, useState } from 'react';
import { Isochrone, IsochroneBand, bandMinutes } from '../types/isochrone';
import { TransportMode } from '../types/transport';
import { getZone, peekZone, zoneKey } from '../zoneCache';
import { IsochroneErrorKind, errorKindOf } from '../isochroneError';

/**
 * Attente après un changement de mode ou de durée pour un même point : on
 * ne calcule que le réglage retenu, pas chaque clic intermédiaire.
 */
export const SETTINGS_DEBOUNCE_MS = 400;

/**
 * Zone accessible depuis un point (établissement sélectionné, adresse,
 * position) pour le mode et la durée courants, avec ses bandes de temps.
 * Passe par le cache partagé : une zone déjà calculée s'affiche sans requête.
 */
export const useZone = (
  point: { lat: number; lon: number } | null,
  timeInMinutes: number,
  mode: TransportMode,
  { enabled = true, color, etablissementId }: { enabled?: boolean; color: string; etablissementId?: string }
) => {
  const lat = point?.lat;
  const lon = point?.lon;
  const minutes = bandMinutes(timeInMinutes);
  const key = enabled && lat !== undefined && lon !== undefined ? zoneKey(lat, lon, minutes, mode) : null;
  const cached = key && lat !== undefined && lon !== undefined ? peekZone(lat, lon, minutes, mode) : undefined;

  const [result, setResult] = useState<{ key: string; bands: IsochroneBand[] | null; error: IsochroneErrorKind | null } | null>(
    null
  );
  const [attempt, setAttempt] = useState(0);
  const last = useRef<{ key: string | null; point: string | null }>({ key: null, point: null });

  useEffect(() => {
    if (!key || lat === undefined || lon === undefined) return;
    const pointKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const settingsChanged = last.current.point === pointKey && last.current.key !== key;
    last.current = { key, point: pointKey };
    const contours = bandMinutes(timeInMinutes);
    if (peekZone(lat, lon, contours, mode)) return;

    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        getZone(lat, lon, contours, mode, controller.signal).then(
          (bands) => setResult({ key, bands, error: bands.length > 0 ? null : 'failed' }),
          (error) => {
            if (!controller.signal.aborted) setResult({ key, bands: null, error: errorKindOf(error) });
          }
        );
      },
      settingsChanged ? SETTINGS_DEBOUNCE_MS : 0
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, lat, lon, timeInMinutes, mode, attempt]);

  const settled = result && result.key === key ? result : null;
  const bands = cached ?? settled?.bands ?? null;
  const isochrone = useMemo<Isochrone | null>(() => {
    const outer = bands?.[bands.length - 1];
    return outer ? { coordinates: outer.coordinates, bands: bands ?? undefined, color, etablissementId } : null;
  }, [bands, color, etablissementId]);

  return {
    isochrone,
    loading: !!key && !cached && !settled,
    error: cached ? null : (settled?.error ?? null),
    retry: () => {
      setResult(null);
      setAttempt((a) => a + 1);
    },
  };
};
