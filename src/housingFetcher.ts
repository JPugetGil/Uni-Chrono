/**
 * Données "se loger autour d'une école" :
 * - communes (code, nom, population, centre) via geo.api.gouv.fr
 * - loyers d'annonce prédits (€/m², appartements 1-2 pièces) via la Carte des loyers (DHUP, data.gouv.fr)
 * Les deux sources sont sans clé et CORS-ouvertes ; mises en cache par le service worker (CacheFirst).
 */

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

let rentsPromise: Promise<Map<string, number>> | null = null;

/**
 * Retourne une Map code INSEE → loyer prédit (€/m²).
 * CSV encodé Latin-1 avec virgules décimales : seuls INSEE_C (col 1) et
 * loypredm2 (col 6) sont lus, les noms de communes viennent de geo.api.gouv.fr.
 */
export const fetchRents = (): Promise<Map<string, number>> => {
  rentsPromise ??= fetch(RENTS_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((text) => {
      const rents = new Map<string, number>();
      const lines = text.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        if (cols.length < 7) continue;
        const insee = cols[1].replace(/"/g, '').trim();
        const rent = Number(cols[6].replace(/"/g, '').replace(',', '.'));
        if (insee && Number.isFinite(rent)) {
          rents.set(insee, rent);
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
