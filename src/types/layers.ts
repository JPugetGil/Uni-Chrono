/** Fonds de carte proposés : Plan IGN (par défaut) ou OpenStreetMap */
export const BASE_LAYERS = ['ign', 'osm'] as const;
export type BaseLayer = (typeof BASE_LAYERS)[number];

/** Calques facultatifs */
export interface Overlays {
  crousLogements: boolean;
  crousRestaurants: boolean;
}

/**
 * Fond de carte en échec pour la vue : assez de tuiles refusées, en part des
 * tuiles reçues. Le Plan IGN répond 404 hors de sa couverture (France,
 * outre-mer et frontières) dès le zoom 8 à 11 selon les lieux (mesuré le
 * 28/10/2026) ; quelques tuiles en échec au bord d'une vue frontalière ne
 * suffisent pas, une panne ou une vue hors de France, si.
 */
export const MIN_TILE_ERRORS = 3;
export const MIN_TILE_ERROR_SHARE = 0.2;

export const baseLayerFailing = (errors: number, loaded: number): boolean =>
  errors >= MIN_TILE_ERRORS && errors / (errors + loaded) >= MIN_TILE_ERROR_SHARE;
