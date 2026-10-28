import { IsochroneBand } from './types/isochrone';
import { TRANSPORT_MODES, TransportMode } from './types/transport';
import { fetchGeoapifyIsochrone, hasGeoapifyKey } from './geoapifyFetcher';
import { fetchIgnIsochrone } from './ignIsochroneFetcher';
import { IsochroneError } from './isochroneError';

/**
 * Service d'isochrones de chaque mode :
 * - marche, voiture : Géoplateforme de l'IGN, sans clé ni quota partagé ;
 * - vélo, transports en commun : Geoapify (clé requise), que l'IGN ne
 *   calcule pas.
 */
export type ZoneProvider = 'ign' | 'geoapify';

export const PROVIDER_NAMES: Record<ZoneProvider, string> = {
  ign: 'IGN',
  geoapify: 'Geoapify',
};

export const zoneProviderFor = (mode: TransportMode): ZoneProvider =>
  mode === 'walking' || mode === 'driving' ? 'ign' : 'geoapify';

/** Mode proposé : son service est utilisable (clé présente au build) */
export const isModeAvailable = (mode: TransportMode): boolean => zoneProviderFor(mode) === 'ign' || hasGeoapifyKey;

export const availableModes = (): TransportMode[] => TRANSPORT_MODES.filter(isModeAvailable);

/** Bandes de temps d'une zone accessible depuis un point */
export const fetchZone = async (
  lat: number,
  lon: number,
  minutes: number[],
  mode: TransportMode,
  signal?: AbortSignal
): Promise<IsochroneBand[]> => {
  if (mode === 'walking' || mode === 'driving') return fetchIgnIsochrone(lat, lon, minutes, mode, signal);
  if (!isModeAvailable(mode)) throw new IsochroneError('unconfigured', `Aucun service pour le mode ${mode}`);
  return fetchGeoapifyIsochrone(lat, lon, minutes, mode, signal);
};
