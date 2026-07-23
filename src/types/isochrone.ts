/**
 * Represents a coordinate pair in [latitude, longitude] format
 */
export type Coordinate = [number, number];

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
   * Color to display the isochrone on the map
   */
  color: string;

  /**
   * Identifiant pour relier l'isochrone à un établissement (UAI ou fallback)
   */
  etablissementId?: string;
}
