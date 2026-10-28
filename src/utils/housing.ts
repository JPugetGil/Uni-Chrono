import { CommuneInfo, RentInfo } from '../housingFetcher';
import { IsochroneCoordinates, flattenCoordinates, isPointInIsochrone } from './geo';

export interface HousingCommune {
  code: string;
  nom: string;
  population: number;
  /** Centre de la commune */
  lat: number;
  lon: number;
  /** Loyer d'annonce prédit en €/m² charges comprises (appartement 1-2 pièces), si connu */
  rent?: number;
  /** Intervalle de prédiction du loyer en €/m² */
  rentLow?: number;
  rentHigh?: number;
}

/**
 * Communes couvertes par une isochrone, avec loyer €/m², triées du loyer le
 * moins cher au plus cher (loyer inconnu en dernier, puis par population).
 * Une commune est retenue si son centre est dans l'isochrone OU si l'isochrone
 * la survole (petites isochrones sans aucun centre de commune à l'intérieur).
 */
export const communesInIsochrone = (
  coordinates: IsochroneCoordinates,
  communes: CommuneInfo[],
  rents: Map<string, RentInfo>
): HousingCommune[] => {
  // Communes couvertes par l'isochrone (codes INSEE).
  const covered = new Set<string>();

  // Boîte englobante de l'isochrone : pré-filtre les communes candidates.
  const ring = flattenCoordinates(coordinates);
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [la, lo] of ring) {
    if (la < minLat) minLat = la;
    if (la > maxLat) maxLat = la;
    if (lo < minLon) minLon = lo;
    if (lo > maxLon) maxLon = lo;
  }
  // Marge pour capter les communes dont le centre est juste hors de l'isochrone
  // (petites isochrones logées dans une grande commune rurale, ~5,5 km min).
  const marginLat = Math.max(0.05, (maxLat - minLat) * 0.5);
  const marginLon = Math.max(0.05, (maxLon - minLon) * 0.5);
  const near = communes.filter(
    (c) =>
      c.lat >= minLat - marginLat && c.lat <= maxLat + marginLat &&
      c.lon >= minLon - marginLon && c.lon <= maxLon + marginLon
  );

  // 1) Communes dont le centre tombe dans l'isochrone : couvre les grandes zones
  //    qui s'étendent sur plusieurs communes (marche longue, vélo, voiture…).
  for (const c of near) {
    if (isPointInIsochrone(c.lat, c.lon, coordinates)) covered.add(c.code);
  }

  // 2) Communes réellement survolées par l'isochrone même si aucun centre n'est à
  //    l'intérieur : cas fréquent des petites isochrones (marche, temps court)
  //    logées dans une seule commune, dont le centre (mairie) est à plusieurs km.
  //    Chaque sommet de l'anneau est rattaché à la commune dont le centre est le
  //    plus proche (approximation de Voronoï). Sous-échantillonnage : des sommets
  //    voisins désignent la même commune.
  const step = Math.max(1, Math.floor(ring.length / 48));
  for (let v = 0; v < ring.length; v += step) {
    const [vlat, vlon] = ring[v];
    let bestCode: string | null = null;
    let bestDist = Infinity;
    for (const c of communes) {
      const dLat = c.lat - vlat;
      const dLon = c.lon - vlon;
      const dist = dLat * dLat + dLon * dLon;
      if (dist < bestDist) {
        bestDist = dist;
        bestCode = c.code;
      }
    }
    if (bestCode) covered.add(bestCode);
  }

  return communes
    .filter((c) => covered.has(c.code))
    .map((c) => {
      const info = rents.get(c.code);
      return {
        code: c.code,
        nom: c.nom,
        population: c.population,
        lat: c.lat,
        lon: c.lon,
        rent: info?.rent,
        rentLow: info?.low,
        rentHigh: info?.high,
      };
    })
    .sort((a, b) => (a.rent ?? Infinity) - (b.rent ?? Infinity) || b.population - a.population);
};

/** Médiane des loyers connus (€/m²) des communes de la zone */
export const medianRent = (items: HousingCommune[]): number | undefined => {
  const rents = items.map((c) => c.rent).filter((r): r is number => r != null).sort((a, b) => a - b);
  if (rents.length === 0) return undefined;
  const mid = Math.floor(rents.length / 2);
  return rents.length % 2 ? rents[mid] : (rents[mid - 1] + rents[mid]) / 2;
};
