/**
 * Données "se loger autour d'une école" :
 * - communes (code, nom, population, centre, contour) via geo.api.gouv.fr
 * - loyers d'annonce prédits (€/m² charges comprises, appartements 1-2 pièces,
 *   avec intervalle de prédiction) via la Carte des loyers (DHUP, data.gouv.fr)
 * Les deux sources sont sans clé et CORS-ouvertes ; mises en cache par le service worker (CacheFirst).
 */

import { Coordinate } from './types/isochrone';

const COMMUNES_URL = 'https://geo.api.gouv.fr/communes?fields=code,nom,population,centre';
// "Carte des loyers" 2023 — Indicateurs de loyer, appartement de 1 ou 2 pièces
const RENTS_URL =
  'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2023/20240115-134722/pred-app12-mef-dhup.csv';

export interface CommuneInfo {
  code: string;
  nom: string;
  population: number;
  lat: number;
  lon: number;
}

interface RawCommune {
  code: string;
  nom: string;
  population?: number;
  centre?: { coordinates: [number, number] };
}

let communesPromise: Promise<CommuneInfo[]> | null = null;

export const fetchCommunes = (): Promise<CommuneInfo[]> => {
  communesPromise ??= fetch(COMMUNES_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<RawCommune[]>;
    })
    .then((raw) =>
      raw
        .filter((c) => c.centre?.coordinates)
        .map((c) => ({
          code: c.code,
          nom: c.nom,
          population: c.population ?? 0,
          lon: c.centre!.coordinates[0],
          lat: c.centre!.coordinates[1],
        }))
    )
    .catch((err) => {
      communesPromise = null; // permet de réessayer plus tard
      throw err;
    });
  return communesPromise;
};

export interface RentInfo {
  /** Loyer prédit en €/m² */
  rent: number;
  /** Bornes de l'intervalle de prédiction en €/m², si connues */
  low?: number;
  high?: number;
}

let rentsPromise: Promise<Map<string, RentInfo>> | null = null;

const parseDecimal = (value: string | undefined): number => Number((value ?? '').replace(/"/g, '').replace(',', '.'));

/**
 * Retourne une Map code INSEE → loyer prédit et fourchette (€/m²).
 * CSV encodé Latin-1 avec virgules décimales : seuls INSEE_C (col 1),
 * loypredm2 (col 6), lwr.IPm2 (col 7) et upr.IPm2 (col 8) sont lus,
 * les noms de communes viennent de geo.api.gouv.fr.
 */
export const fetchRents = (): Promise<Map<string, RentInfo>> => {
  rentsPromise ??= fetch(RENTS_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((text) => {
      const rents = new Map<string, RentInfo>();
      const lines = text.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        if (cols.length < 7) continue;
        const insee = cols[1].replace(/"/g, '').trim();
        const rent = parseDecimal(cols[6]);
        if (insee && Number.isFinite(rent)) {
          const low = parseDecimal(cols[7]);
          const high = parseDecimal(cols[8]);
          rents.set(insee, {
            rent,
            low: Number.isFinite(low) && low > 0 ? low : undefined,
            high: Number.isFinite(high) && high > 0 ? high : undefined,
          });
        }
      }
      return rents;
    })
    .catch((err) => {
      rentsPromise = null;
      throw err;
    });
  return rentsPromise;
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
