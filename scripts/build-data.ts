/**
 * Prépare les données servies par l'application dans public/data/ :
 * - etablissements.json : sites d'enseignement (formations Parcoursup de la dernière session)
 * - formations/<préfixe UAI>.json : formations de chaque site, chargées à l'ouverture d'une fiche
 * - communes.json : communes et arrondissements avec leur loyer (dernière Carte des loyers)
 * - meta.json : sources et fraîcheur
 *
 * Usage : node scripts/build-data.ts [--if-missing]
 * (Node ≥ 22.18 exécute le TypeScript directement)
 */
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DataMeta } from '../src/types/etablissement.ts';
import {
  type DataGouvDataset,
  type ParcoursupRecord,
  type RawCommune,
  buildCommunes,
  buildSites,
  latestRentsEdition,
  parseRentsCsv,
} from './data/transform.ts';

const OUT_DIR = join(import.meta.dirname, '..', 'public', 'data');
const OUTPUTS = ['etablissements.json', 'communes.json', 'meta.json'];

const PARCOURSUP_DATASET = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-cartographie_formations_parcoursup';
const PARCOURSUP_FIELDS = 'etab_uai,etab_nom,tc,tf,nm,fl,app,region,departement,commune,fiche,etab_url,etab_gps';
const GEO_API = 'https://geo.api.gouv.fr/communes?fields=code,nom,population,centre';
const RENTS_SEARCH = "https://www.data.gouv.fr/api/1/datasets/?q=carte%20des%20loyers%20indicateurs%20de%20loyers%20d%27annonce%20par%20commune&page_size=20";

/** Seuils sous lesquels les données sont jugées incomplètes : le build échoue plutôt que de publier une carte vide */
const MINIMUMS = { etablissements: 4000, communes: 30000, rents: 30000 };

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} pour ${url}`);
  return (await response.json()) as T;
};

const getText = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} pour ${url}`);
  // CSV encodé en Latin-1 : seuls les codes et les nombres sont lus
  return new TextDecoder('latin1').decode(await response.arrayBuffer());
};

const check = (label: string, count: number, minimum: number) => {
  if (count < minimum) throw new Error(`${label} : ${count} lignes, ${minimum} attendues au moins`);
  console.log(`  ${label} : ${count}`);
};

const writeJson = (path: string, data: unknown) => writeFile(path, JSON.stringify(data));

const main = async () => {
  if (process.argv.includes('--if-missing') && OUTPUTS.every((f) => existsSync(join(OUT_DIR, f)))) {
    console.log('Données déjà présentes dans public/data (npm run data pour les rafraîchir)');
    return;
  }

  console.log('Formations Parcoursup…');
  const { results: years } = await getJson<{ results: { annee: string }[] }>(
    `${PARCOURSUP_DATASET}/records?select=annee&group_by=annee&order_by=annee%20desc&limit=1`
  );
  const year = Number(years[0]?.annee);
  if (!year) throw new Error('Session Parcoursup introuvable');
  const [records, dataset] = await Promise.all([
    getJson<ParcoursupRecord[]>(`${PARCOURSUP_DATASET}/exports/json?select=${PARCOURSUP_FIELDS}&where=annee%3D%22${year}%22`),
    getJson<{ metas: { default: { modified?: string; data_processed?: string } } }>(PARCOURSUP_DATASET),
  ]);
  const { etablissements, formationsByPrefix } = buildSites(records);
  check(`Sites (session ${year})`, etablissements.length, MINIMUMS.etablissements);

  console.log('Communes et loyers…');
  const edition = latestRentsEdition((await getJson<{ data: DataGouvDataset[] }>(RENTS_SEARCH)).data);
  const [communes, arrondissements, rentsCsv] = await Promise.all([
    getJson<RawCommune[]>(GEO_API),
    getJson<RawCommune[]>(`${GEO_API}&type=arrondissement-municipal`),
    getText(edition.url),
  ]);
  const rents = parseRentsCsv(rentsCsv);
  check(`Loyers (Carte des loyers ${edition.year})`, rents.size, MINIMUMS.rents);
  const communeRows = buildCommunes(communes, arrondissements, rents);
  check('Communes et arrondissements', communeRows.length, MINIMUMS.communes);
  console.log(`  dont avec loyer : ${communeRows.filter((c) => c[5] != null).length}`);

  const meta: DataMeta = {
    generatedAt: new Date().toISOString(),
    parcoursup: {
      year,
      modified: dataset.metas.default.modified,
      processed: dataset.metas.default.data_processed,
      url: 'https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-cartographie_formations_parcoursup/',
    },
    rents: { year: edition.year, url: edition.url, datasetUrl: edition.datasetUrl },
    communes: { url: 'https://geo.api.gouv.fr/decoupage-administratif/communes' },
  };

  // Écriture en dernier : un échec plus haut laisse les données précédentes intactes
  await rm(join(OUT_DIR, 'formations'), { recursive: true, force: true });
  await mkdir(join(OUT_DIR, 'formations'), { recursive: true });
  await Promise.all([
    writeJson(join(OUT_DIR, 'etablissements.json'), etablissements),
    writeJson(join(OUT_DIR, 'communes.json'), communeRows),
    ...[...formationsByPrefix].map(([prefix, file]) => writeJson(join(OUT_DIR, 'formations', `${prefix}.json`), file)),
  ]);
  await writeJson(join(OUT_DIR, 'meta.json'), meta);
  console.log(`Données écrites dans ${OUT_DIR}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
