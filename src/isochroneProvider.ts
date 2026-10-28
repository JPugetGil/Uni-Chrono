import { IsochroneBand } from './types/isochrone';
import { TransportMode } from './types/transport';
import { fetchIsochroneData, hasMapboxKey } from './mapboxFetcher';
import { fetchTransitIsochrone, hasTransitKey } from './geoapifyFetcher';
import { fetchIgnIsochrone } from './ignIsochroneFetcher';
import { IsochroneError } from './isochroneError';

/**
 * Choix du service d'isochrones selon le mode :
 * - transports en commun : Geoapify (clé requise) ;
 * - vélo : Mapbox (clé requise) ;
 * - marche, voiture : Mapbox, ou à défaut l'IGN (sans clé), qui prend aussi
 *   le relais si Mapbox échoue : Mapbox répond 401 sans en-tête CORS, si bien
 *   qu'un navigateur ne distingue pas une clé refusée d'une panne réseau.
 */
export type ZoneProvider = 'mapbox' | 'ign' | 'geoapify';

export const PROVIDER_NAMES: Record<ZoneProvider, string> = {
  mapbox: 'Mapbox',
  ign: 'IGN',
  geoapify: 'Geoapify',
};

/** Service principal du mode, ou null si aucun n'est utilisable */
export const zoneProviderFor = (mode: TransportMode): ZoneProvider | null => {
  if (mode === 'transit') return hasTransitKey ? 'geoapify' : null;
  if (hasMapboxKey) return 'mapbox';
  return mode === 'cycling' ? null : 'ign';
};

/** Calcul en lot (tous les établissements visibles) : réservé à Mapbox, dont le quota le permet */
export const batchAllowed = (mode: TransportMode): boolean => zoneProviderFor(mode) === 'mapbox';

/** Bandes de temps d'une zone accessible depuis un point */
export const fetchZone = async (
  lat: number,
  lon: number,
  minutes: number[],
  mode: TransportMode,
  signal?: AbortSignal
): Promise<IsochroneBand[]> => {
  const provider = zoneProviderFor(mode);
  if (!provider) throw new IsochroneError('unconfigured', `Aucun service pour le mode ${mode}`);
  if (provider === 'geoapify') return fetchTransitIsochrone(lat, lon, minutes, signal);
  const ignMode = mode === 'walking' || mode === 'driving' ? mode : null;
  if (provider === 'ign' && ignMode) return fetchIgnIsochrone(lat, lon, minutes, ignMode, signal);
  try {
    return await fetchIsochroneData(lat, lon, minutes, mode, signal);
  } catch (error) {
    // Échec de Mapbox (clé, quota, réseau) : l'IGN calcule la marche et la voiture
    if (ignMode && !signal?.aborted) return fetchIgnIsochrone(lat, lon, minutes, ignMode, signal);
    throw error;
  }
};
