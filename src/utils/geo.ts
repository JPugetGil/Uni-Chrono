import { Coordinate } from '../types/isochrone';

/** Un isochrone peut être un polygone simple (anneau) ou un multi-polygone (Navitia). */
export type IsochroneCoordinates = Coordinate[] | Coordinate[][];

export const isMultiPolygon = (coords: IsochroneCoordinates): coords is Coordinate[][] =>
  coords.length > 0 && Array.isArray(coords[0][0]);

/** Aplati un (multi-)polygone en une liste de points [lat, lon]. */
export const flattenCoordinates = (coords: IsochroneCoordinates): Coordinate[] =>
  isMultiPolygon(coords) ? coords.flat() : coords;

/** Test point-dans-anneau par lancer de rayon (ray casting). */
const pointInRing = (lat: number, lon: number, ring: Coordinate[]): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lonI] = ring[i];
    const [latJ, lonJ] = ring[j];
    if (latI > lat !== latJ > lat && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI) {
      inside = !inside;
    }
  }
  return inside;
};

/** Test point-dans-isochrone (polygone simple ou multi-polygone). */
export const isPointInIsochrone = (lat: number, lon: number, coords: IsochroneCoordinates): boolean => {
  if (coords.length === 0) return false;
  if (isMultiPolygon(coords)) {
    return coords.some((ring) => pointInRing(lat, lon, ring));
  }
  return pointInRing(lat, lon, coords);
};
