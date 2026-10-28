import { Coordinate, IsochroneBand } from './types/isochrone';
import { IsochroneError, httpError } from './isochroneError';

/**
 * Isochrones à vélo et en transports en commun via l'API Isoline de Geoapify
 * (https://apidocs.geoapify.com/docs/isolines/) :
 * - vélo : mode « bicycle » ; mesuré le 28/10/2026 à 15 min, zone proche de
 *   celle de Mapbox (recouvrement 0,83 à Paris 13e, 0,88 à Villeurbanne) ;
 * - transports en commun : mode « approximated_transit », estimation à partir
 *   des lignes de transport d'OpenStreetMap, sans horaires. Le mode « transit »
 *   ne suit pas les réseaux français : à 30 min depuis l'INSA Lyon, 7,0 km²
 *   contre 9,5 km² à pied et 35 km² en « approximated_transit », zone qui suit
 *   métro et tramways.
 * Offre gratuite : 3 000 crédits par jour, partagés par tous les visiteurs
 * (la clé est publique) : une zone n'est calculée qu'à la demande et mise en
 * cache (zoneCache). Ces modes ne sont proposés que si VITE_GEOAPIFY_API_KEY
 * est définie. L'API n'accepte pas d'heure de départ.
 */

const GEOAPIFY_URL = 'https://api.geoapify.com/v1/isoline';
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

export const hasGeoapifyKey = GEOAPIFY_API_KEY.length > 0;

export type GeoapifyMode = 'cycling' | 'transit';

const MODES: Record<GeoapifyMode, string> = { cycling: 'bicycle', transit: 'approximated_transit' };

/**
 * Calcul long : l'API répond 202 avec un identifiant à interroger de nouveau.
 * Chaque interrogation coûte un crédit : attentes croissantes (2, 3, 5 puis 8 s).
 */
const POLL_DELAYS_MS = [2000, 3000, 5000, 8000];
const MAX_POLLS = 8;

const pollDelay = (poll: number) => POLL_DELAYS_MS[Math.min(poll, POLL_DELAYS_MS.length - 1)];

interface IsolineResponse {
  properties?: { id?: string };
  features?: Array<{
    properties?: { range?: number; id?: string };
    geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  }>;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });

const request = async (params: Record<string, string>, signal?: AbortSignal) => {
  const query = new URLSearchParams({ ...params, apiKey: GEOAPIFY_API_KEY });
  const response = await fetch(`${GEOAPIFY_URL}?${query}`, { signal });
  if (!response.ok) throw httpError(response);
  return { status: response.status, body: (await response.json()) as IsolineResponse };
};

/** Anneaux extérieurs d'un (multi-)polygone, [lon, lat] → [lat, lon] (îlots autour des arrêts) */
const outerRings = (geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null | undefined): Coordinate[][] => {
  if (!geometry) return [];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) => (polygon[0] ?? []).map(([lon, lat]) => [lat, lon] as Coordinate))
    .filter((ring) => ring.length > 0);
};

/**
 * Isochrones d'un point pour plusieurs durées en une requête (bandes de
 * temps), triées de la plus courte à la plus longue.
 */
export const fetchGeoapifyIsochrone = async (
  lat: number,
  lon: number,
  contoursMinutes: number[],
  mode: GeoapifyMode,
  signal?: AbortSignal
): Promise<IsochroneBand[]> => {
  if (!hasGeoapifyKey) throw new IsochroneError('unconfigured', 'VITE_GEOAPIFY_API_KEY absente');

  const minutes = [...new Set(contoursMinutes.map((m) => Math.min(60, Math.max(1, Math.round(m)))))].sort((a, b) => a - b);
  let { status, body } = await request(
    { lat: String(lat), lon: String(lon), type: 'time', mode: MODES[mode], range: minutes.map((m) => m * 60).join(',') },
    signal
  );

  for (let poll = 0; status === 202 && poll < MAX_POLLS; poll++) {
    const id = body.properties?.id ?? body.features?.[0]?.properties?.id;
    if (!id) break;
    await wait(pollDelay(poll), signal);
    ({ status, body } = await request({ id }, signal));
  }
  if (status === 202) throw new IsochroneError('failed', 'Calcul toujours en cours');

  return (body.features ?? [])
    .map((feature) => ({
      minutes: Math.round((feature.properties?.range ?? 0) / 60),
      coordinates: outerRings(feature.geometry),
    }))
    .filter((band) => band.minutes > 0 && band.coordinates.length > 0)
    .sort((a, b) => a.minutes - b.minutes);
};
