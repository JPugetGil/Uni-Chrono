/**
 * Modes de transport supportés.
 * Marche et voiture : IGN ; vélo et transports en commun : Geoapify (isochroneProvider).
 */
export type TransportMode = 'walking' | 'cycling' | 'driving' | 'transit';

export const TRANSPORT_MODES: TransportMode[] = ['walking', 'cycling', 'driving', 'transit'];

/** Clé i18n par mode (ex. 'driving' → transport.driving) */
export const transportModeLabelKey = (mode: TransportMode): string => `transport.${mode}`;
