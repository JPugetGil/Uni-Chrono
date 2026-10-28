import { DataMeta, Etablissement, Formation } from './types/etablissement';
import { CrousData } from './types/crous';
import { categoryColors } from './design-system/tokens';

/**
 * Données préparées au build par scripts/build-data.ts et servies avec
 * l'application (public/data) : un seul fichier par jeu, pas d'API à paginer.
 */
const DATA_URL = `${import.meta.env.BASE_URL}data/`;

const fetchJson = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(`${DATA_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
};

/** Site tel qu'écrit dans etablissements.json : filières données par leur rang dans filieres.json */
type StoredEtablissement = Omit<Etablissement, 'filieres'> & { filieres?: number[] };

const isEtablissement = (e: unknown): e is StoredEtablissement => {
  const x = e as StoredEtablissement;
  return (
    typeof x?.id === 'string' &&
    typeof x.nom === 'string' &&
    Number.isFinite(x.coordonnees?.lat) &&
    Number.isFinite(x.coordonnees?.lon) &&
    Array.isArray(x.types)
  );
};

/**
 * Sites d'enseignement, colorés par catégorie, avec le libellé de leurs
 * filières ; les entrées mal formées sont écartées.
 */
export const fetchEtablissements = async (signal?: AbortSignal): Promise<Etablissement[]> => {
  const [data, filieres] = await Promise.all([
    fetchJson<unknown>('etablissements.json', signal),
    fetchJson<unknown>('filieres.json', signal),
  ]);
  if (!Array.isArray(data) || !Array.isArray(filieres)) throw new Error('Format de etablissements.json inattendu');
  return data.filter(isEtablissement).map((e) => ({
    ...e,
    filieres: (e.filieres ?? []).map((i) => filieres[i]).filter((f): f is string => typeof f === 'string'),
    color: categoryColors[e.category] ?? categoryColors.other,
  }));
};

// Un fichier de formations par préfixe d'UAI (3 premiers caractères), mis en cache
const formationFiles = new Map<string, Promise<Record<string, Formation[]>>>();

/** Formations Parcoursup d'un site */
export const fetchFormations = async (etablissement: Etablissement): Promise<Formation[]> => {
  const prefix = etablissement.uai.slice(0, 3).toLowerCase();
  let file = formationFiles.get(prefix);
  if (!file) {
    file = fetchJson<Record<string, Formation[]>>(`formations/${encodeURIComponent(prefix)}.json`);
    file.catch(() => formationFiles.delete(prefix));
    formationFiles.set(prefix, file);
  }
  return (await file)[etablissement.id] ?? [];
};

let crousPromise: Promise<CrousData> | null = null;

/** Résidences et restaurants CROUS (chargés à la première utilisation) */
export const fetchCrous = (): Promise<CrousData> => {
  crousPromise ??= fetchJson<CrousData>('crous.json').catch((error) => {
    crousPromise = null;
    throw error;
  });
  return crousPromise;
};

let metaPromise: Promise<DataMeta> | null = null;

/** Sources et date de préparation des données */
export const fetchDataMeta = (): Promise<DataMeta> => {
  metaPromise ??= fetchJson<DataMeta>('meta.json').catch((error) => {
    metaPromise = null;
    throw error;
  });
  return metaPromise;
};
