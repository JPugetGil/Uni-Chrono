/**
 * Modes de transport supportés.
 * 'transit' (transports en commun) est fourni par Navitia, les autres par Mapbox.
 */
export type TransportMode = 'walking' | 'cycling' | 'driving' | 'transit';

export const TRANSPORT_MODES: TransportMode[] = ['walking', 'cycling', 'driving', 'transit'];

/** Clé i18n par mode (ex. 'driving' → transport.driving) */
export const transportModeLabelKey = (mode: TransportMode): string => `transport.${mode}`;
