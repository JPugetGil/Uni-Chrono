/**
 * Données "se loger autour d'une école" :
 * - communes et arrondissements avec leur loyer d'annonce (€/m² charges
 *   comprises, appartements 1-2 pièces, intervalle de prédiction), préparés au
 *   build (public/data/communes.json, voir scripts/build-data.ts) ;
 * - contour d'une commune à la demande via geo.api.gouv.fr (mis en cache par le service worker).
 */

import { CommuneInfo, CommuneRow } from './types/commune';
import { Coordinate } from './types/isochrone';

let communesPromise: Promise<CommuneInfo[]> | null = null;

export const fetchCommunes = (): Promise<CommuneInfo[]> => {
  communesPromise ??= fetch(`${import.meta.env.BASE_URL}data/communes.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<CommuneRow[]>;
    })
    .then((rows) =>
      rows.map(([code, nom, population, lat, lon, rent, rentLow, rentHigh]) => ({
        code,
        nom,
        population,
        lat,
        lon,
        ...(rent != null ? { rent } : {}),
        ...(rentLow != null ? { rentLow } : {}),
        ...(rentHigh != null ? { rentHigh } : {}),
      }))
    )
    .catch((err) => {
      communesPromise = null; // permet de réessayer plus tard
      throw err;
    });
  return communesPromise;
};

const contourPromises = new Map<string, Promise<Coordinate[][]>>();

/**
 * Contour d'une commune (anneaux extérieurs, [lat, lon]) pour la surbrillance
 * sur la carte ; mis en cache par commune.
 */
export const fetchCommuneContour = (code: string): Promise<Coordinate[][]> => {
  let promise = contourPromises.get(code);
  if (!promise) {
    promise = fetch(`https://geo.api.gouv.fr/communes/${encodeURIComponent(code)}?fields=code&format=geojson&geometry=contour`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>>;
      })
      .then(({ geometry }) => {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        return polygons.map((polygon) => (polygon[0] || []).map(([lon, lat]) => [lat, lon] as Coordinate));
      })
      .catch((err) => {
        contourPromises.delete(code);
        throw err;
      });
    contourPromises.set(code, promise);
  }
  return promise;
};
