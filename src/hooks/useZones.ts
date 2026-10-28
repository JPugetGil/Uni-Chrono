import { useEffect, useState } from 'react';
import { Etablissement } from '../types/etablissement';
import { Isochrone, bandMinutes } from '../types/isochrone';
import { TransportMode } from '../types/transport';
import { getZone, peekZone } from '../zoneCache';
import { IsochroneErrorKind, errorKindOf } from '../isochroneError';

export type ZoneResult = { status: 'pending' } | { status: 'ready'; isochrone: Isochrone } | { status: 'error'; error: IsochroneErrorKind };

const toResult = (e: Etablissement, bands: Isochrone['bands']): ZoneResult => {
  const outer = bands?.[bands.length - 1];
  return outer
    ? { status: 'ready', isochrone: { coordinates: outer.coordinates, bands, color: e.color ?? '#000', etablissementId: e.id } }
    : { status: 'error', error: 'failed' };
};

/**
 * Zones accessibles de quelques établissements (comparaison), demandées l'une
 * après l'autre pour ménager les services, via le cache partagé : les zones
 * déjà vues dans la fiche ne sont pas recalculées.
 */
export const useZones = (etablissements: Etablissement[], timeInMinutes: number, transportMode: TransportMode) => {
  const configKey = `${transportMode}:${timeInMinutes}`;
  const [results, setResults] = useState<{ configKey: string; byId: Record<string, ZoneResult> }>({ configKey, byId: {} });
  const ids = etablissements.map((e) => e.id).join('|');

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      for (const e of etablissements) {
        if (controller.signal.aborted) return;
        let result: ZoneResult;
        try {
          const bands = await getZone(
            e.coordonnees.lat,
            e.coordonnees.lon,
            bandMinutes(timeInMinutes),
            transportMode,
            controller.signal
          );
          result = toResult(e, bands);
        } catch (error) {
          if (controller.signal.aborted) return;
          result = { status: 'error', error: errorKindOf(error) };
        }
        setResults((r) => ({ configKey, byId: { ...(r.configKey === configKey ? r.byId : {}), [e.id]: result } }));
      }
    };
    run();
    return () => controller.abort();
    // `ids` résume la liste : un nouveau tableau aux mêmes établissements ne relance pas le calcul
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, configKey]);

  return (id: string): ZoneResult => {
    const known = results.configKey === configKey ? results.byId[id] : undefined;
    if (known) return known;
    const e = etablissements.find((x) => x.id === id);
    const bands = e && peekZone(e.coordonnees.lat, e.coordonnees.lon, bandMinutes(timeInMinutes), transportMode);
    return e && bands ? toResult(e, bands) : { status: 'pending' };
  };
};
