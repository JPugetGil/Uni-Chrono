/**
 * Represents a coordinate pair in [latitude, longitude] format
 */
export type Coordinate = [number, number];

/**
 * Zone atteignable en `minutes` au plus (anneau extérieur du polygone)
 */
export interface IsochroneBand {
  minutes: number;
  coordinates: Coordinate[];
}

/**
 * Interface for Isochrone data structure
 */
export interface Isochrone {
  /**
   * Coordinates forming the isochrone: a single polygon ring (Mapbox),
   * or an array of polygon rings (Navitia transit isochrones are multi-polygons)
   */
  coordinates: Coordinate[] | Coordinate[][];

  /**
   * Bandes de temps de la plus proche à la plus lointaine (Mapbox) ;
   * la dernière correspond à `coordinates`
   */
  bands?: IsochroneBand[];

  /**
   * Color to display the isochrone on the map
   */
  color: string;

  /**
   * Identifiant pour relier l'isochrone à un établissement (UAI ou fallback)
   */
  etablissementId?: string;
}

/**
 * Durées des bandes affichées pour une durée maximale : tiers arrondis à 5 min
 * (15 → 5/10/15, 45 → 15/30/45), moitié en dessous de 15 min, une seule bande
 * pour les très courtes durées. Mapbox accepte jusqu'à 4 contours par requête.
 */
export const bandMinutes = (total: number): number[] => {
  if (total >= 15) {
    const toFive = (m: number) => Math.max(5, Math.round(m / 5) * 5);
    const inner = [toFive(total / 3), toFive((2 * total) / 3)].filter((m) => m < total);
    return [...new Set([...inner, total])].sort((a, b) => a - b);
  }
  if (total >= 6) return [Math.round(total / 2), total];
  return [total];
};

/**
 * Opacité de remplissage par bande : les bandes se superposent, l'opacité
 * perçue croît donc vers le centre. `bandOpacity` donne l'opacité perçue
 * d'une bande (index 0 = la plus proche) pour la légende.
 */
export const BAND_FILL_OPACITY = 0.14;

export const bandOpacity = (index: number, count: number): number =>
  1 - Math.pow(1 - BAND_FILL_OPACITY, count - index);
