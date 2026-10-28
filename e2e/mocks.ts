import { Page, Route } from '@playwright/test';

/**
 * Réponses simulées des services externes : les tests ne dépendent ni du
 * réseau, ni des quotas, ni de l'évolution des jeux de données.
 */

const site = (
  uai: string,
  nom: string,
  category: string,
  types: string[],
  filieres: number[],
  lat: number,
  lon: number,
  commune: string,
  departement: string,
  region: string,
  extra: Record<string, unknown> = {}
) => ({
  id: uai,
  uai,
  nom,
  coordonnees: { lat, lon },
  commune,
  departement,
  region,
  statut: 'public',
  types,
  filieres,
  category,
  formations: 2,
  apprentissage: false,
  ...extra,
});

export const ETABLISSEMENTS = [
  site('0690192J', 'INSTITUT NATIONAL DES SCIENCES APPLIQUEES DE LYON', 'school', ["Formations des écoles d'ingénieurs"], [2], 45.7833, 4.8781, 'Villeurbanne', 'Rhône', 'Auvergne-Rhône-Alpes', { url: 'https://www.insa-lyon.fr/' }),
  site('0690213G', 'IUT LYON 1', 'university', ['BUT'], [1], 45.779, 4.8696, 'Villeurbanne', 'Rhône', 'Auvergne-Rhône-Alpes'),
  site('0694123A', 'ECOLE NORMALE SUPERIEURE DE LYON', 'school', ["Formations d'art, de design et du spectacle vivant"], [3], 45.73, 4.832, 'Lyon', 'Rhône', 'Auvergne-Rhône-Alpes', { statut: 'prive-contrat' }),
  // Deux sites au même endroit (liste au clic sur le groupe)
  site('0350937D', 'UNIVERSITÉ RENNES 2', 'university', ['Licence'], [3], 48.118, -1.7024, 'Rennes', 'Ille-et-Vilaine', 'Bretagne'),
  site('0352345A', 'UFR SCIENCES HUMAINES, UNIVERSITE DE RENNES 2', 'university', ['Licence'], [3], 48.118, -1.7024, 'Rennes', 'Ille-et-Vilaine', 'Bretagne'),
  site('0290346U', 'UNIVERSITE DE BRETAGNE OCCIDENTALE', 'university', ['Licence', 'BUT'], [0, 1, 3], 48.398, -4.5, 'Brest', 'Finistère', 'Bretagne'),
];

// Les sites renvoient à ces libellés par indice
const FILIERES = ['BTS - Services informatiques aux organisations', 'BUT - Informatique', "Formation d'ingénieur Bac + 5", 'L1 - Psychologie'];

// Une résidence et un restaurant dans la zone de l'INSA, une résidence à Rennes
const CROUS = {
  logements: [
    { id: '1', nom: 'Résidence Jean Zay', ville: 'Villeurbanne', adresse: '9 avenue Albert Einstein 69100 Villeurbanne', lat: 45.785, lon: 4.875, url: 'https://trouverunlogement.lescrous.fr/' },
    { id: '2', nom: 'Résidence Beaulieu', ville: 'Rennes', lat: 48.12, lon: -1.64 },
  ],
  restaurants: [{ id: 'r1', nom: 'Restaurant La Doua', type: 'Restaurant', ville: 'Villeurbanne', lat: 45.782, lon: 4.874, ferme: false }],
};

const FORMATIONS: Record<string, Record<string, unknown[]>> = {
  '069': {
    '0690192J': [
      { nom: "Formation d'ingénieur Bac + 5 - Bac général", type: "Formations des écoles d'ingénieurs", apprentissage: false, fiche: 'https://dossierappel.parcoursup.fr/fiche?g_ta_cod=1' },
      { nom: "Formation d'ingénieur Bac + 5 - en apprentissage", type: "Formations des écoles d'ingénieurs", apprentissage: true },
    ],
  },
};

// [code, nom, population, lat, lon, loyer, bas, haut]
const COMMUNES = [
  ['69266', 'Villeurbanne', 163684, 45.78, 4.88, 16.8, 13.4, 21.1],
  ['69034', 'Caluire-et-Cuire', 43597, 45.797, 4.862, 16.7, 13.1, 21.3],
  ['35238', 'Rennes', 227830, 48.11, -1.68, 14.9, 12, 18.4],
];

const META = {
  generatedAt: '2026-10-26T05:00:00.000Z',
  parcoursup: { year: 2026, processed: '2026-10-22T05:43:07+00:00', url: 'https://data.enseignementsup-recherche.gouv.fr/' },
  rents: { year: 2025, url: 'https://static.data.gouv.fr/loyers.csv', datasetUrl: 'https://www.data.gouv.fr/' },
  communes: { url: 'https://geo.api.gouv.fr/' },
};

const PLACES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.8737, 45.7826] },
      properties: {
        id: '69266_einstein_20',
        label: '20 Avenue Albert Einstein 69100 Villeurbanne',
        context: '69, Rhône, Auvergne-Rhône-Alpes',
        type: 'housenumber',
      },
    },
  ],
};

// PNG transparent 1×1 pour les tuiles de fond de carte
const EMPTY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

/** Carré [lon, lat] autour d'un point, de demi-côté proportionnel à la durée */
const square = (lon: number, lat: number, minutes: number) => {
  const d = minutes * 0.0008;
  return [[[lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d]]];
};

export interface MockOptions {
  /** Nombre de réponses en erreur 500 avant que les établissements se chargent */
  etablissementsFailures?: number;
  /** Faux Mapbox en échec : statut HTTP lisible, ou « blocked » comme une vraie clé refusée (401 sans CORS) */
  mapboxStatus?: number | 'blocked';
}

/** Requêtes d'isochrones reçues par le faux Mapbox */
export interface IsochroneCall {
  profile: string;
  minutes: number[];
}

export const mockApis = async (page: Page, options: MockOptions = {}) => {
  const isochroneCalls: IsochroneCall[] = [];
  let failures = options.etablissementsFailures ?? 0;

  const json = (route: Route, body: unknown) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  // Garde-fou : aucun appel réseau sortant non simulé (les routes déclarées ensuite sont prioritaires)
  await page.route((url) => !['localhost', '127.0.0.1'].includes(url.hostname), (route) => route.abort());

  await page.route(
    (url) =>
      /tile\.openstreetmap\.org|waymarkedtrails\.org|openrailwaymap\.org/.test(url.hostname) ||
      (url.hostname === 'data.geopf.fr' && url.pathname === '/wmts'),
    (route) => route.fulfill({ status: 200, contentType: 'image/png', body: EMPTY_PNG })
  );

  // Données préparées (public/data), servies par l'application
  await page.route(
    (url) => ['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname.includes('/data/'),
    (route) => {
      const path = new URL(route.request().url()).pathname.split('/data/')[1];
      if (path === 'etablissements.json') {
        if (failures > 0) {
          failures--;
          return route.fulfill({ status: 500, body: 'Erreur simulée' });
        }
        return json(route, ETABLISSEMENTS);
      }
      if (path === 'communes.json') return json(route, COMMUNES);
      if (path === 'filieres.json') return json(route, FILIERES);
      if (path === 'crous.json') return json(route, CROUS);
      if (path === 'meta.json') return json(route, META);
      const prefix = /^formations\/(\w+)\.json$/.exec(path)?.[1];
      if (prefix) return json(route, FORMATIONS[prefix] ?? {});
      return route.fulfill({ status: 404 });
    }
  );

  await page.route(
    (url) => url.hostname === 'api.mapbox.com' && url.pathname.startsWith('/isochrone/'),
    (route) => {
      const url = new URL(route.request().url());
      const [, , , , profile, coordinates] = url.pathname.split('/');
      const [lon, lat] = coordinates.split(',').map(Number);
      const minutes = (url.searchParams.get('contours_minutes') ?? '').split(',').map(Number);
      isochroneCalls.push({ profile, minutes });
      if (options.mapboxStatus === 'blocked') return route.abort('failed');
      if (options.mapboxStatus && options.mapboxStatus !== 200) {
        return route.fulfill({ status: options.mapboxStatus, contentType: 'application/json', body: '{"message":"Not Authorized"}' });
      }
      // Ordre décroissant, comme une réponse Mapbox possible : l'app ne doit pas en dépendre
      const features = [...minutes]
        .sort((a, b) => b - a)
        .map((m) => ({ type: 'Feature', properties: { contour: m }, geometry: { type: 'Polygon', coordinates: square(lon, lat, m) } }));
      return json(route, { type: 'FeatureCollection', features });
    }
  );

  await page.route(
    (url) => url.hostname === 'geo.api.gouv.fr' && url.pathname.startsWith('/communes/'),
    (route) => {
      const code = new URL(route.request().url()).pathname.split('/').pop();
      const commune = COMMUNES.find((c) => c[0] === code) ?? COMMUNES[0];
      const [lat, lon] = [Number(commune[3]), Number(commune[4])];
      return json(route, { type: 'Feature', properties: { code }, geometry: { type: 'Polygon', coordinates: square(lon, lat, 20) } });
    }
  );

  await page.route(
    (url) => url.hostname === 'data.geopf.fr' && url.pathname.startsWith('/geocodage/'),
    (route) => json(route, PLACES)
  );

  // Geoapify (transports en commun) : îlots autour de deux arrêts par durée
  await page.route(
    (url) => url.hostname === 'api.geoapify.com' && url.pathname === '/v1/isoline',
    (route) => {
      const url = new URL(route.request().url());
      const lat = Number(url.searchParams.get('lat'));
      const lon = Number(url.searchParams.get('lon'));
      const ranges = (url.searchParams.get('range') ?? '').split(',').map(Number);
      isochroneCalls.push({ profile: 'transit', minutes: ranges.map((r) => r / 60) });
      const features = ranges.map((range) => ({
        type: 'Feature',
        properties: { range, mode: 'transit' },
        geometry: { type: 'MultiPolygon', coordinates: [square(lon, lat, range / 120), square(lon + 0.03, lat, range / 240)] },
      }));
      return json(route, { type: 'FeatureCollection', features });
    }
  );

  // IGN (repli sans clé Mapbox ou clé refusée) : une durée par requête
  await page.route(
    (url) => url.hostname === 'data.geopf.fr' && url.pathname === '/navigation/isochrone',
    (route) => {
      const url = new URL(route.request().url());
      const [lon, lat] = (url.searchParams.get('point') ?? '').split(',').map(Number);
      const minutes = Number(url.searchParams.get('costValue')) / 60;
      isochroneCalls.push({ profile: `ign-${url.searchParams.get('profile')}`, minutes: [minutes] });
      return json(route, { geometry: { type: 'Polygon', coordinates: square(lon, lat, minutes) } });
    }
  );

  return { isochroneCalls };
};
