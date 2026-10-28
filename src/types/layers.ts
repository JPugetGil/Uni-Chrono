/** Fonds de carte proposés : Plan IGN (par défaut) ou OpenStreetMap */
export const BASE_LAYERS = ['ign', 'osm'] as const;
export type BaseLayer = (typeof BASE_LAYERS)[number];

/** Calques facultatifs */
export interface Overlays {
  crousLogements: boolean;
  crousRestaurants: boolean;
}
