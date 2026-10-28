import { bandColors } from '../design-system/tokens';

/**
 * Represents a coordinate pair in [latitude, longitude] format
 */
export type Coordinate = [number, number];

/**
 * Zone atteignable en `minutes` au plus : anneau extérieur du polygone, ou
 * anneaux de plusieurs îlots (transports en commun)
 */
export interface IsochroneBand {
  minutes: number;
  coordinates: Coordinate[] | Coordinate[][];
}

/**
 * Interface for Isochrone data structure
 */
export interface Isochrone {
  /**
   * Coordinates forming the isochrone: a single polygon ring, or an array of
   * polygon rings (multi-polygons: islands around transit stops, detached areas)
   */
  coordinates: Coordinate[] | Coordinate[][];

  /**
   * Bandes de temps de la plus proche à la plus lointaine ;
   * la dernière correspond à `coordinates`
   */
  bands?: IsochroneBand[];

  /**
   * Couleur d'identité (zones comparées) ; une zone mise en avant suit les
   * couleurs de ses bandes de temps (bandColor)
   */
  color?: string;

  /**
   * Identifiant pour relier l'isochrone à un établissement (UAI ou fallback)
   */
  etablissementId?: string;
}

/**
 * Durées des bandes affichées pour une durée maximale : tiers arrondis à 5 min
 * (15 → 5/10/15, 45 → 15/30/45), moitié en dessous de 15 min, une seule bande
 * pour les très courtes durées. L'IGN calcule une durée par requête, Geoapify
 * toutes les durées en une.
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
 * Opacité de remplissage des bandes, dessinées en anneaux sans recouvrement :
 * chaque bande garde sa couleur, le fond de carte reste lisible dessous.
 */
export const BAND_FILL_OPACITY = 0.45;

/**
 * Couleurs d'une bande (index 0 = la plus proche) parmi `count` : la plus
 * proche en violet, la plus lointaine en jaune, la sarcelle entre les deux.
 */
export const bandColor = (index: number, count: number): { fill: string; line: string } =>
  bandColors[count <= 1 ? 0 : Math.round((index * (bandColors.length - 1)) / (count - 1))];
