/**
 * Transformations des données brutes en fichiers servis par l'application.
 * Fonctions pures : testées dans transform.test.ts, appelées par build-data.ts.
 */
import type { Etablissement, EtablissementCategory, Formation, Statut } from '../../src/types/etablissement.ts';
import type { CommuneRow } from '../../src/types/commune.ts';
import type { CrousData } from '../../src/types/crous.ts';

/** Enregistrement de « Cartographie des formations Parcoursup » (champs utilisés) */
export interface ParcoursupRecord {
  etab_uai: string | null;
  etab_nom: string | null;
  tc: string | null;
  tf: string[] | null;
  nm: string[] | null;
  fl: string[] | null;
  app: string[] | null;
  region: string | null;
  departement: string | null;
  commune: string | null;
  fiche: string | null;
  etab_url: string | null;
  etab_gps: { lat: number; lon: number } | null;
}

export interface RawCommune {
  code: string;
  nom: string;
  population?: number;
  centre?: { coordinates: [number, number] };
}

export interface RentInfo {
  rent: number;
  low?: number;
  high?: number;
}

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[’`]/g, "'").toLowerCase().trim();

// Mots courts laissés en minuscules dans un titre (sauf en tête)
const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'à', 'au', 'aux', 'sur', 'sous', 'pour', 'par']);

/** Casse de titre pour un nom écrit tout en capitales (« LYCEE JEAN MOULIN » → « Lycee Jean Moulin ») */
export const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((part, i) => {
      if (i > 0 && SMALL_WORDS.has(part)) return part;
      // l' / d' : élision en minuscules
      if (/^[ld]$/.test(part) && i > 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('')
    // Sigles usuels
    .replace(/\b(Iut|Ufr|Insa|Cfa|Bts|Ens|Ifsi|Cnam|Ifmk|Inp|Iep)\b/g, (s) => s.toUpperCase());

/**
 * Nom affichable : sans la localisation finale ajoutée par Parcoursup
 * (« (42) », « (Villeneuve-d'Ascq - 59) »), espaces normalisés, et casse
 * de titre si le nom est tout en capitales.
 */
export const cleanName = (raw: string): string => {
  const name = raw
    .replace(/\s*\((?:[^()]*\s-\s*)?(?:\d{2,3}|2A|2B)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name === name.toUpperCase() && /[A-Z]/.test(name) ? toTitleCase(name) : name;
};

// Catégorie d'après les types de formation (champ « tf »), par ordre de priorité
const CATEGORY_RULES: [EtablissementCategory, RegExp][] = [
  ['university', /^(licence|but\b|etudes de sante|lpe\b|deust|c\.m\.i|i\.a\.e|diplomes d'universite)/],
  ['school', /ecoles? d'ingenieurs|ecoles de commerce|art, de design|architecture|sciences po|veterinaires|travail social|metiers du sport/],
  ['lycee', /^(bts|cpge|dcg|certificats de specialisation|formations preparatoires|formations aux metiers de l'hotellerie)/],
];

export const categoryOfTypes = (types: string[]): EtablissementCategory => {
  const normalized = types.map(normalize);
  for (const [category, rule] of CATEGORY_RULES) {
    if (normalized.some((t) => rule.test(t))) return category;
  }
  return 'other';
};

/** « Publics », « Privés en contrat avec l'Etat / EESC », « Privés » */
export const statutOf = (tc: string | null): Statut => {
  const n = normalize(tc ?? '');
  if (n.startsWith('public')) return 'public';
  if (n.includes('contrat')) return 'prive-contrat';
  return 'prive';
};

const mostFrequent = <T>(values: T[], tieBreak: (a: T, b: T) => number): T => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || tieBreak(a[0], b[0]))[0][0];
};

/** Précision des coordonnées d'un site (~11 m) : deux points plus proches sont le même site */
const roundCoord = (value: number) => Math.round(value * 1e4) / 1e4;

export interface SitesResult {
  etablissements: Etablissement[];
  /** Formations par site, regroupées par préfixe d'UAI (3 premiers caractères) */
  formationsByPrefix: Map<string, Record<string, Formation[]>>;
}

/** Regroupe les formations par site (UAI + position) */
export const buildSites = (records: ParcoursupRecord[]): SitesResult => {
  const groups = new Map<string, ParcoursupRecord[]>();
  for (const r of records) {
    if (!r.etab_uai || !r.etab_gps || !Number.isFinite(r.etab_gps.lat) || !Number.isFinite(r.etab_gps.lon)) continue;
    const key = `${r.etab_uai}|${roundCoord(r.etab_gps.lat)}|${roundCoord(r.etab_gps.lon)}`;
    const group = groups.get(key);
    if (group) group.push(r);
    else groups.set(key, [r]);
  }

  // UAI à plusieurs sites : l'identifiant porte aussi la position
  const sitesPerUai = new Map<string, number>();
  for (const key of groups.keys()) {
    const uai = key.split('|')[0];
    sitesPerUai.set(uai, (sitesPerUai.get(uai) ?? 0) + 1);
  }

  const etablissements: Etablissement[] = [];
  const formationsByPrefix = new Map<string, Record<string, Formation[]>>();

  for (const [key, group] of groups) {
    const [uai, lat, lon] = key.split('|');
    const id = (sitesPerUai.get(uai) ?? 0) > 1 ? `${uai}@${lat},${lon}` : uai;
    const first = group[0];
    const names = group.map((r) => cleanName(r.etab_nom ?? '')).filter(Boolean);
    const types = [...new Set(group.flatMap((r) => r.tf ?? []))].sort((a, b) => a.localeCompare(b, 'fr'));
    const filieres = [...new Set(group.map((r) => r.fl?.[0]).filter((f): f is string => !!f))].sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
    const formations: Formation[] = group.map((r) => ({
      nom: r.nm?.[0] ?? r.fl?.[0] ?? '',
      type: r.tf?.[0] ?? '',
      apprentissage: (r.app?.length ?? 0) > 0,
      ...(r.fiche ? { fiche: r.fiche } : {}),
    }));

    etablissements.push({
      id,
      uai,
      nom: names.length > 0 ? mostFrequent(names, (a, b) => a.length - b.length) : uai,
      coordonnees: { lat: Number(lat), lon: Number(lon) },
      commune: first.commune ?? '',
      departement: first.departement ?? '',
      region: first.region ?? '',
      statut: mostFrequent(group.map((r) => statutOf(r.tc)), () => 0),
      types,
      filieres,
      category: categoryOfTypes(types),
      formations: group.length,
      apprentissage: formations.some((f) => f.apprentissage),
      ...(first.etab_url ? { url: first.etab_url } : {}),
    });

    const prefix = uai.slice(0, 3).toLowerCase();
    const file = formationsByPrefix.get(prefix) ?? {};
    file[id] = formations.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    formationsByPrefix.set(prefix, file);
  }

  etablissements.sort((a, b) => a.id.localeCompare(b.id));
  return { etablissements, formationsByPrefix };
};

const parseDecimal = (value: string | undefined): number => Number((value ?? '').replace(/"/g, '').replace(',', '.'));

/**
 * CSV « Carte des loyers » (séparateur « ; », virgule décimale) → loyer par
 * code INSEE. Les colonnes sont repérées par leur en-tête, stable d'une
 * édition à l'autre (INSEE_C, loypredm2, lwr.IPm2, upr.IPm2).
 */
export const parseRentsCsv = (text: string): Map<string, RentInfo> => {
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(';').map((h) => h.replace(/"/g, '').trim());
  const col = (name: string) => header.indexOf(name);
  const [iCode, iRent, iLow, iHigh] = [col('INSEE_C'), col('loypredm2'), col('lwr.IPm2'), col('upr.IPm2')];
  if (iCode < 0 || iRent < 0) throw new Error(`Colonnes de loyer introuvables : ${header.join(', ')}`);

  const rents = new Map<string, RentInfo>();
  for (const line of lines.slice(1)) {
    const cols = line.split(';');
    const code = (cols[iCode] ?? '').replace(/"/g, '').trim();
    const rent = parseDecimal(cols[iRent]);
    if (!code || !Number.isFinite(rent) || rent <= 0) continue;
    const low = iLow >= 0 ? parseDecimal(cols[iLow]) : NaN;
    const high = iHigh >= 0 ? parseDecimal(cols[iHigh]) : NaN;
    rents.set(code, {
      rent,
      ...(Number.isFinite(low) && low > 0 ? { low } : {}),
      ...(Number.isFinite(high) && high > 0 ? { high } : {}),
    });
  }
  return rents;
};

/** Communes dont les loyers sont publiés par arrondissement municipal */
export const PLM_CODES = new Set(['75056', '69123', '13055']);

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * Communes et arrondissements avec leur loyer, en lignes compactes. Paris,
 * Lyon et Marseille sont remplacées par leurs arrondissements : les loyers
 * n'existent qu'à cette échelle.
 */
export const buildCommunes = (
  communes: RawCommune[],
  arrondissements: RawCommune[],
  rents: Map<string, RentInfo>
): CommuneRow[] =>
  [...communes.filter((c) => !PLM_CODES.has(c.code)), ...arrondissements]
    .filter((c) => c.centre?.coordinates)
    .map((c): CommuneRow => {
      const [lon, lat] = c.centre!.coordinates;
      const info = rents.get(c.code);
      return [
        c.code,
        c.nom,
        c.population ?? 0,
        round(lat, 5),
        round(lon, 5),
        info ? round(info.rent, 2) : null,
        info?.low != null ? round(info.low, 2) : null,
        info?.high != null ? round(info.high, 2) : null,
      ];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

/** Jeu data.gouv.fr (champs utilisés) */
export interface DataGouvDataset {
  id: string;
  title: string;
  page: string;
  resources: { url: string }[];
}

/** Dernière édition de la « Carte des loyers » par commune proposant le fichier « appartements 1-2 pièces » */
export const latestRentsEdition = (datasets: DataGouvDataset[]) => {
  const editions = datasets
    .map((d) => {
      const year = Number(/par commune en (\d{4})/i.exec(d.title)?.[1]);
      const resource = d.resources.find((r) => /pred-app12/i.test(r.url));
      return year && resource ? { year, url: resource.url, datasetUrl: d.page } : null;
    })
    .filter((e): e is { year: number; url: string; datasetUrl: string } => e !== null)
    .sort((a, b) => b.year - a.year);
  if (editions.length === 0) throw new Error('Aucune édition de la Carte des loyers trouvée');
  return editions[0];
};

/** Site tel qu'écrit dans etablissements.json : filières remplacées par leur rang dans filieres.json */
export type StoredEtablissement = Omit<Etablissement, 'filieres'> & { filieres: number[] };

/** Dictionnaire des filières (trié) et sites qui y renvoient par indice : fichier plus léger */
export const indexFilieres = (etablissements: Etablissement[]): { labels: string[]; sites: StoredEtablissement[] } => {
  const labels = [...new Set(etablissements.flatMap((e) => e.filieres))].sort((a, b) => a.localeCompare(b, 'fr'));
  const rank = new Map(labels.map((label, i) => [label, i]));
  return { labels, sites: etablissements.map((e) => ({ ...e, filieres: e.filieres.map((f) => rank.get(f)!) })) };
};

type GeoPoint = { lat: number; lon: number } | null | undefined;

export interface CrousLogementRaw {
  id: string | number;
  title: string | null;
  short_desc?: string | null;
  zone?: string | null;
  address?: string | null;
  bookingurl?: string | null;
  interneturl?: string | null;
  geocalisation?: GeoPoint;
}

export interface CrousRestaurantRaw {
  id: string | number;
  title: string | null;
  type?: string | null;
  zone?: string | null;
  geolocalisation?: GeoPoint;
  closing?: number | string | null;
}

const validPoint = (p: GeoPoint): p is { lat: number; lon: number } =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && !(p.lat === 0 && p.lon === 0);

const tidy = (value: string | null | undefined): string | undefined => value?.replace(/\s+/g, ' ').trim() || undefined;

/** Résidences et restaurants CROUS géolocalisés ; « closing » à 1 signale un lieu fermé */
export const buildCrous = (logements: CrousLogementRaw[], restaurants: CrousRestaurantRaw[]): CrousData => ({
  logements: logements
    .filter((l) => tidy(l.title) && validPoint(l.geocalisation))
    .map((l) => {
      const url = tidy(l.bookingurl) ?? tidy(l.interneturl);
      return {
        id: String(l.id),
        nom: tidy(l.title)!,
        ville: tidy(l.zone) ?? '',
        ...(tidy(l.address) ? { adresse: tidy(l.address) } : {}),
        ...(tidy(l.short_desc) ? { description: tidy(l.short_desc) } : {}),
        lat: round(l.geocalisation!.lat, 5),
        lon: round(l.geocalisation!.lon, 5),
        ...(url ? { url } : {}),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id)),
  restaurants: restaurants
    .filter((r) => tidy(r.title) && validPoint(r.geolocalisation))
    .map((r) => ({
      id: String(r.id),
      nom: tidy(r.title)!,
      type: tidy(r.type) ?? 'Restaurant',
      ville: tidy(r.zone) ?? '',
      lat: round(r.geolocalisation!.lat, 5),
      lon: round(r.geolocalisation!.lon, 5),
      ferme: Number(r.closing) === 1,
    }))
    .sort((a, b) => a.id.localeCompare(b.id)),
});
