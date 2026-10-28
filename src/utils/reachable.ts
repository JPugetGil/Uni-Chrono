import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';
import { boundsOf, flattenCoordinates, isPointInIsochrone } from './geo';

export interface ReachableEtablissement {
  etablissement: Etablissement;
  /** Plus petite bande de temps qui contient l'établissement */
  minutes: number;
}

/**
 * Établissements situés dans une zone accessible, rangés par bande de temps
 * (les plus proches d'abord), puis par distance au point de départ.
 */
export const reachableEtablissements = (
  etablissements: Etablissement[],
  zone: Isochrone,
  origin: { lat: number; lon: number }
): ReachableEtablissement[] => {
  const bounds = boundsOf(flattenCoordinates(zone.coordinates));
  if (!bounds) return [];
  const [[south, west], [north, east]] = bounds;
  const bands = zone.bands?.length ? zone.bands : [{ minutes: 0, coordinates: zone.coordinates }];
  const cos = Math.cos((origin.lat * Math.PI) / 180);
  const distance = (e: Etablissement) =>
    (e.coordonnees.lat - origin.lat) ** 2 + ((e.coordonnees.lon - origin.lon) * cos) ** 2;

  const result: ReachableEtablissement[] = [];
  for (const etablissement of etablissements) {
    const { lat, lon } = etablissement.coordonnees;
    // Pré-filtre par l'emprise de la zone avant le test point-dans-polygone
    if (lat < south || lat > north || lon < west || lon > east) continue;
    const band = bands.find((b) => isPointInIsochrone(lat, lon, b.coordinates));
    if (band) result.push({ etablissement, minutes: band.minutes });
  }
  return result.sort((a, b) => a.minutes - b.minutes || distance(a.etablissement) - distance(b.etablissement));
};
