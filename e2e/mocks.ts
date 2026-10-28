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
  category,
  formations: 2,
  apprentissage: false,
  ...extra,
});

export const ETABLISSEMENTS = [
  site('0690192J', 'INSTITUT NATIONAL DES SCIENCES APPLIQUEES DE LYON', 'school', ["Formations des écoles d'ingénieurs"], 45.7833, 4.8781, 'Villeurbanne', 'Rhône', 'Auvergne-Rhône-Alpes', { url: 'https://www.insa-lyon.fr/' }),
  site('0690213G', 'IUT LYON 1', 'university', ['BUT'], 45.779, 4.8696, 'Villeurbanne', 'Rhône', 'Auvergne-Rhône-Alpes'),
  site('0694123A', 'ECOLE NORMALE SUPERIEURE DE LYON', 'school', ["Formations d'art, de design et du spectacle vivant"], 45.73, 4.832, 'Lyon', 'Rhône', 'Auvergne-Rhône-Alpes', { statut: 'prive-contrat' }),
  // Deux sites au même endroit (liste au clic sur le groupe)
  site('0350937D', 'UNIVERSITÉ RENNES 2', 'university', ['Licence'], 48.118, -1.7024, 'Rennes', 'Ille-et-Vilaine', 'Bretagne'),
  site('0352345A', 'UFR SCIENCES HUMAINES, UNIVERSITE DE RENNES 2', 'university', ['Licence'], 48.118, -1.7024, 'Rennes', 'Ille-et-Vilaine', 'Bretagne'),
  site('0290346U', 'UNIVERSITE DE BRETAGNE OCCIDENTALE', 'university', ['Licence', 'BUT'], 48.398, -4.5, 'Brest', 'Finistère', 'Bretagne'),
];

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
    (url) => /tile\.openstreetmap\.org|waymarkedtrails\.org|openrailwaymap\.org/.test(url.hostname),
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

  return { isochroneCalls };
};
