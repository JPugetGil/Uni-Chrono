/**
 * Represents a coordinate pair in [latitude, longitude] format
 */
export type Coordinate = [number, number];

/**
 * Interface for Isochrone data structure
 */
export interface Isochrone {
  /**
   * Array of coordinates forming the isochrone polygon
   */
  coordinates: Coordinate[];
  
  /**
   * Color to display the isochrone on the map
   */
  color: string;
}
