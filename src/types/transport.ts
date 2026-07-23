/**
 * Modes de transport supportés.
 * 'transit' (transports en commun) est fourni par Navitia, les autres par Mapbox.
 */
export type TransportMode = 'walking' | 'cycling' | 'driving-traffic' | 'driving' | 'transit';

export const TRANSPORT_MODES: TransportMode[] = ['walking', 'cycling', 'driving-traffic', 'driving', 'transit'];

/** Clés i18n par mode (ex. 'driving-traffic' → transport.drivingTraffic) */
export const transportModeLabelKey = (mode: TransportMode): string => {
  switch (mode) {
    case 'driving-traffic':
      return 'transport.drivingTraffic';
    case 'transit':
      return 'transport.transit';
    default:
      return `transport.${mode}`;
  }
};
