import { Coordinate, IsochroneBand } from './types/isochrone';
import { IsochroneError, httpError } from './isochroneError';

/**
 * Isochrones en transports en commun via l'API Isoline de Geoapify
 * (https://apidocs.geoapify.com/docs/isolines/, mode « transit »).
 * Offre gratuite : 3 000 crédits par jour, partagés par tous les visiteurs
 * (la clé est publique) : le calcul est fait pour l'établissement
 * sélectionné uniquement. L'option n'est proposée que si
 * VITE_GEOAPIFY_API_KEY est définie. L'API n'accepte pas d'heure de départ.
 */

const GEOAPIFY_URL = 'https://api.geoapify.com/v1/isoline';
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

export const hasTransitKey = GEOAPIFY_API_KEY.length > 0;

/** Calcul long : l'API répond 202 avec un identifiant à interroger de nouveau */
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 20;

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
 * Isochrones transports en commun d'un point pour plusieurs durées en une
 * requête (bandes de temps), triées de la plus courte à la plus longue.
 */
export const fetchTransitIsochrone = async (
  lat: number,
  lon: number,
  contoursMinutes: number[],
  signal?: AbortSignal
): Promise<IsochroneBand[]> => {
  if (!hasTransitKey) throw new IsochroneError('unconfigured', 'VITE_GEOAPIFY_API_KEY absente');

  const minutes = [...new Set(contoursMinutes.map((m) => Math.min(60, Math.max(1, Math.round(m)))))].sort((a, b) => a - b);
  let { status, body } = await request(
    { lat: String(lat), lon: String(lon), type: 'time', mode: 'transit', range: minutes.map((m) => m * 60).join(',') },
    signal
  );

  for (let poll = 0; status === 202 && poll < MAX_POLLS; poll++) {
    const id = body.properties?.id ?? body.features?.[0]?.properties?.id;
    if (!id) break;
    await wait(POLL_INTERVAL_MS, signal);
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
