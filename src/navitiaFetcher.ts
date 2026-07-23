import { Coordinate } from './types/isochrone';

/**
 * Isochrones en transports en commun via Navitia (https://navitia.io).
 * Clé gratuite sur inscription ; l'option "transit" n'est proposée que si
 * VITE_NAVITIA_API_KEY est définie.
 */

const NAVITIA_BASE_URL = 'https://api.navitia.io/v1';
const NAVITIA_API_KEY = import.meta.env.VITE_NAVITIA_API_KEY || '';

export const hasNavitiaKey = NAVITIA_API_KEY.length > 0;

interface NavitiaIsochroneResponse {
  isochrones?: Array<{
    geojson?: { type: string; coordinates: number[][][][] }; // MultiPolygon [poly][ring][point][lon,lat]
  }>;
}

/**
 * Récupère l'isochrone transports en commun autour d'un point.
 * Retourne un multi-polygone [lat, lon] (les isochrones transit sont des îlots
 * autour des gares/arrêts), au format accepté par Leaflet.
 */
export const fetchTransitIsochrone = async (
  lat: number,
  lon: number,
  timeInSeconds: number,
  signal?: AbortSignal
): Promise<Coordinate[][]> => {
  const from = `${lon};${lat}`;
  const url = `${NAVITIA_BASE_URL}/coverage/${from}/isochrones?from=${from}&max_duration=${timeInSeconds}`;

  const response = await fetch(url, {
    signal,
    headers: { Authorization: NAVITIA_API_KEY },
  });
  if (!response.ok) {
    throw new Error(`Navitia HTTP ${response.status}`);
  }

  const data = (await response.json()) as NavitiaIsochroneResponse;
  const geojson = data.isochrones?.[0]?.geojson;
  if (!geojson || !geojson.coordinates?.length) return [];

  // Anneau extérieur de chaque polygone, converti [lon,lat] → [lat,lon]
  return geojson.coordinates.map((polygon) =>
    (polygon[0] || []).map(([lng, latitude]) => [latitude, lng] as Coordinate)
  );
};
