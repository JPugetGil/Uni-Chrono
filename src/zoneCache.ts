import { IsochroneBand } from './types/isochrone';
import { TransportMode } from './types/transport';
import { fetchZone } from './isochroneProvider';

/**
 * Cache des zones accessibles, partagé par la fiche, « depuis ici » et la
 * comparaison : une zone n'est demandée qu'une fois par point (arrondi à
 * 4 décimales, ~11 m, ce qui regroupe aussi les sites d'un même campus), mode
 * et durées, tant que la page est ouverte. Les demandes en cours sont
 * partagées ; elles ne sont annulées que si plus personne ne les attend.
 * Un échec ou une zone vide n'est pas gardé : la demande suivante réessaie.
 */

interface Entry {
  promise: Promise<IsochroneBand[]>;
  controller: AbortController;
  waiters: number;
  bands?: IsochroneBand[];
}

/** Zones gardées au plus (les plus anciennes sont oubliées) */
const MAX_ENTRIES = 100;

const entries = new Map<string, Entry>();

export const zoneKey = (lat: number, lon: number, minutes: number[], mode: TransportMode): string =>
  `${mode}|${lat.toFixed(4)},${lon.toFixed(4)}|${minutes.join(',')}`;

const abortError = () => new DOMException('Aborted', 'AbortError');

const evictOldest = () => {
  for (const [key, entry] of entries) {
    if (entries.size <= MAX_ENTRIES) return;
    if (entry.bands) entries.delete(key);
  }
};

const start = (key: string, lat: number, lon: number, minutes: number[], mode: TransportMode): Entry => {
  const controller = new AbortController();
  const entry: Entry = { controller, waiters: 0, promise: Promise.resolve([]) };
  entry.promise = fetchZone(lat, lon, minutes, mode, controller.signal).then(
    (bands) => {
      if (bands.length > 0) entry.bands = bands;
      else if (entries.get(key) === entry) entries.delete(key);
      return bands;
    },
    (error) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    }
  );
  // Rejet traité par chaque appelant ; évite un rejet non géré si tous ont abandonné
  entry.promise.catch(() => {});
  entries.set(key, entry);
  evictOldest();
  return entry;
};

/** Zone déjà calculée, sans requête */
export const peekZone = (lat: number, lon: number, minutes: number[], mode: TransportMode): IsochroneBand[] | undefined =>
  entries.get(zoneKey(lat, lon, minutes, mode))?.bands;

/** Bandes de temps d'une zone, du cache ou du service */
export const getZone = (
  lat: number,
  lon: number,
  minutes: number[],
  mode: TransportMode,
  signal?: AbortSignal
): Promise<IsochroneBand[]> => {
  const key = zoneKey(lat, lon, minutes, mode);
  const cached = entries.get(key);
  if (cached?.bands) {
    // Récemment utilisée : passe en fin de file
    entries.delete(key);
    entries.set(key, cached);
    return Promise.resolve(cached.bands);
  }
  if (signal?.aborted) return Promise.reject(abortError());

  const entry = cached ?? start(key, lat, lon, minutes, mode);
  entry.waiters++;
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      entry.waiters--;
      if (entry.waiters === 0 && !entry.bands) {
        entry.controller.abort();
        if (entries.get(key) === entry) entries.delete(key);
      }
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    entry.promise.then(
      (bands) => {
        signal?.removeEventListener('abort', onAbort);
        entry.waiters--;
        resolve(bands);
      },
      (error) => {
        signal?.removeEventListener('abort', onAbort);
        entry.waiters--;
        reject(error);
      }
    );
  });
};

/** Pour les tests */
export const clearZoneCache = () => {
  for (const entry of entries.values()) entry.controller.abort();
  entries.clear();
};
