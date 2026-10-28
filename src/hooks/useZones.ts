import { useEffect, useState } from 'react';
import { Etablissement } from '../types/etablissement';
import { Isochrone, bandMinutes } from '../types/isochrone';
import { TransportMode } from '../types/transport';
import { fetchZone } from '../isochroneProvider';
import { IsochroneErrorKind, errorKindOf } from '../isochroneError';

export type ZoneResult = { status: 'pending' } | { status: 'ready'; isochrone: Isochrone } | { status: 'error'; error: IsochroneErrorKind };

/**
 * Zones accessibles de quelques établissements (comparaison), calculées l'une
 * après l'autre pour ménager les quotas, et recalculées au changement de réglage.
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
        try {
          const bands = await fetchZone(
            e.coordonnees.lat,
            e.coordonnees.lon,
            bandMinutes(timeInMinutes),
            transportMode,
            controller.signal
          );
          const outer = bands[bands.length - 1];
          const result: ZoneResult = outer
            ? { status: 'ready', isochrone: { coordinates: outer.coordinates, bands, color: e.color ?? '#000', etablissementId: e.id } }
            : { status: 'error', error: 'failed' };
          setResults((r) => ({ configKey, byId: { ...(r.configKey === configKey ? r.byId : {}), [e.id]: result } }));
        } catch (error) {
          if (controller.signal.aborted) return;
          setResults((r) => ({
            configKey,
            byId: { ...(r.configKey === configKey ? r.byId : {}), [e.id]: { status: 'error', error: errorKindOf(error) } },
          }));
        }
      }
    };
    run();
    return () => controller.abort();
    // `ids` résume la liste : un nouveau tableau aux mêmes établissements ne relance pas le calcul
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, configKey]);

  return (id: string): ZoneResult => (results.configKey === configKey ? results.byId[id] : undefined) ?? { status: 'pending' };
};
