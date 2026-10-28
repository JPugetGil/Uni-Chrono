import { Coordinate, IsochroneBand } from './types/isochrone';
import { httpError } from './isochroneError';

/**
 * Isochrones de la Géoplateforme (IGN, réseau BD TOPO), sans clé :
 * à pied et en voiture seulement, une durée par requête.
 * https://geoservices.ign.fr/documentation/services/services-geoplateforme/itineraire
 */

const IGN_ISOCHRONE_URL = 'https://data.geopf.fr/navigation/isochrone';

export type IgnMode = 'walking' | 'driving';

const PROFILES: Record<IgnMode, string> = { walking: 'pedestrian', driving: 'car' };

interface IgnIsochroneResponse {
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

const outerRings = (geometry: IgnIsochroneResponse['geometry']): Coordinate[] | Coordinate[][] => {
  if (!geometry) return [];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const rings = polygons.map((polygon) => (polygon[0] ?? []).map(([lon, lat]) => [lat, lon] as Coordinate)).filter((r) => r.length > 0);
  // Un seul anneau : même forme que les isochrones Mapbox
  return rings.length === 1 ? rings[0] : rings;
};

/**
 * Bandes de temps d'un point, triées. Les durées sont demandées l'une après
 * l'autre pour ménager ce service public partagé.
 */
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
    const response = await fetch(`${IGN_ISOCHRONE_URL}?${params}`, { signal });
    if (!response.ok) throw httpError(response);
    const coordinates = outerRings(((await response.json()) as IgnIsochroneResponse).geometry);
    if (coordinates.length > 0) bands.push({ minutes: m, coordinates });
  }
  return bands;
};
