import { Coordinate, IsochroneBand } from './types/isochrone';
import { httpError } from './isochroneError';
import { Throttle } from './throttle';

/**
 * Isochrones de la Géoplateforme (IGN, réseau BD TOPO), sans clé :
 * à pied et en voiture, une durée par requête.
 * https://geoservices.ign.fr/documentation/services/services-geoplateforme/itineraire
 *
 * Limite mesurée le 28/10/2026 : environ 5 requêtes par seconde et par adresse
 * IP, puis 429 et blocage de 4 à 5 s. La limite est propre à chaque visiteur :
 * pas de quota partagé. Les requêtes partent au plus à 4 par seconde.
 */

const IGN_ISOCHRONE_URL = 'https://data.geopf.fr/navigation/isochrone';

export type IgnMode = 'walking' | 'driving';

const PROFILES: Record<IgnMode, string> = { walking: 'pedestrian', driving: 'car' };

const throttle = new Throttle(250);
/** Nouvelles tentatives après un 429 */
const MAX_RETRIES = 2;
/** Attente après un 429 : l'en-tête Retry-After n'est pas exposé au navigateur (CORS) */
const DEFAULT_BLOCK_MS = 5000;

interface IgnIsochroneResponse {
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

const outerRings = (geometry: IgnIsochroneResponse['geometry']): Coordinate[] | Coordinate[][] => {
  if (!geometry) return [];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const rings = polygons.map((polygon) => (polygon[0] ?? []).map(([lon, lat]) => [lat, lon] as Coordinate)).filter((r) => r.length > 0);
  // Un seul anneau : polygone simple
  return rings.length === 1 ? rings[0] : rings;
};

const requestBand = async (params: URLSearchParams, signal?: AbortSignal): Promise<IgnIsochroneResponse> => {
  for (let attempt = 0; ; attempt++) {
    await throttle.wait(signal);
    const response = await fetch(`${IGN_ISOCHRONE_URL}?${params}`, { signal });
    if (response.ok) return (await response.json()) as IgnIsochroneResponse;
    const error = httpError(response);
    if (error.kind !== 'quota' || attempt >= MAX_RETRIES) throw error;
    throttle.pause(error.retryAfterMs ?? DEFAULT_BLOCK_MS);
  }
};

/** Bandes de temps d'un point, triées ; les durées sont demandées l'une après l'autre */
export const fetchIgnIsochrone = async (
  lat: number,
  lon: number,
  contoursMinutes: number[],
  mode: IgnMode,
  signal?: AbortSignal
): Promise<IsochroneBand[]> => {
  const minutes = [...new Set(contoursMinutes.map((m) => Math.max(1, Math.round(m))))].sort((a, b) => a - b);
  const bands: IsochroneBand[] = [];
  for (const m of minutes) {
    const params = new URLSearchParams({
      resource: 'bdtopo-valhalla',
      point: `${lon},${lat}`,
      costValue: String(m * 60),
      costType: 'time',
      profile: PROFILES[mode],
      direction: 'departure',
      geometryFormat: 'geojson',
    });
    const coordinates = outerRings((await requestBand(params, signal)).geometry);
    if (coordinates.length > 0) bands.push({ minutes: m, coordinates });
  }
  return bands;
};
