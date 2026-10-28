/**
 * Recherche d'adresses et de lieux via le service de géocodage de la
 * Géoplateforme (IGN, successeur de l'API Adresse) : sans clé, CORS ouvert.
 */

const GEOCODING_URL = 'https://data.geopf.fr/geocodage/search';

/** « position » : localisation de l'appareil (pas de repère, le point bleu suffit) */
export type PlaceKind = 'housenumber' | 'street' | 'locality' | 'municipality' | 'position';

export interface Place {
  id: string;
  label: string;
  /** Département et région, ex. « 69, Rhône, Auvergne-Rhône-Alpes » */
  context: string;
  kind: PlaceKind;
  lat: number;
  lon: number;
}

interface GeocodingResponse {
  features?: Array<{
    geometry: { coordinates: [number, number] };
    properties: { id?: string; label: string; context?: string; type?: PlaceKind };
  }>;
}

export const searchPlaces = async (query: string, signal?: AbortSignal): Promise<Place[]> => {
  const url = `${GEOCODING_URL}?q=${encodeURIComponent(query)}&limit=4&autocomplete=1`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = (await response.json()) as GeocodingResponse;
  return (data.features ?? []).map((f, i) => ({
    id: f.properties.id || `${f.properties.label}-${i}`,
    label: f.properties.label,
    context: f.properties.context ?? '',
    kind: f.properties.type ?? 'housenumber',
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
};
