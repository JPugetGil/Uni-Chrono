import { Page, Route } from '@playwright/test';

/**
 * Réponses simulées des services externes : les tests ne dépendent ni du
 * réseau, ni des quotas, ni de l'évolution des jeux de données.
 */

export const ETABLISSEMENTS = [
  {
    uai: '0690192J',
    implantation_lib: 'INSTITUT NATIONAL DES SCIENCES APPLIQUEES DE LYON',
    siege_lib: 'Institut national des sciences appliquées de Lyon',
    type_d_etablissement: "Écoles nationales supérieures d'ingénieurs",
    coordonnees: { lat: 45.7833, lon: 4.8781 },
    reg_nom: 'Auvergne - Rhône-Alpes',
    dep_nom: 'Rhône',
    com_nom: 'Villeurbanne',
  },
  {
    uai: '0690213G',
    implantation_lib: 'INSTITUT UNIVERSITAIRE DE TECHNOLOGIE LYON 1',
    siege_lib: 'Université Claude Bernard - Lyon 1',
    type_d_etablissement: 'Université',
    coordonnees: { lat: 45.779, lon: 4.8696 },
    reg_nom: 'Auvergne - Rhône-Alpes',
    dep_nom: 'Rhône',
    com_nom: 'Villeurbanne',
  },
  {
    uai: '0694123A',
    implantation_lib: 'ECOLE NORMALE SUPERIEURE DE LYON',
    type_d_etablissement: 'École normale supérieure',
    coordonnees: { lat: 45.73, lon: 4.832 },
    reg_nom: 'Auvergne - Rhône-Alpes',
    dep_nom: 'Rhône',
    com_nom: 'Lyon 7e',
  },
  // Deux implantations au même endroit (liste au clic sur le groupe)
  {
    uai: '0350937D',
    implantation_lib: 'UNIVERSITÉ RENNES 2',
    type_d_etablissement: 'Université',
    coordonnees: { lat: 48.118, lon: -1.7024 },
    reg_nom: 'Bretagne',
    dep_nom: 'Ille-et-Vilaine',
    com_nom: 'Rennes',
  },
  {
    uai: '0352345A',
    implantation_lib: 'UFR SCIENCES HUMAINES, UNIVERSITE DE RENNES 2',
    type_d_etablissement: 'Université',
    coordonnees: { lat: 48.118, lon: -1.7024 },
    reg_nom: 'Bretagne',
    dep_nom: 'Ille-et-Vilaine',
    com_nom: 'Rennes',
  },
  {
    uai: '0290346U',
    implantation_lib: 'UNIVERSITE DE BRETAGNE OCCIDENTALE',
    type_d_etablissement: 'Université',
    coordonnees: { lat: 48.398, lon: -4.5 },
    reg_nom: 'Bretagne',
    dep_nom: 'Finistère',
    com_nom: 'Brest',
  },
];

const COMMUNES = [
  { code: '69266', nom: 'Villeurbanne', population: 163684, centre: { coordinates: [4.88, 45.78] } },
  { code: '69034', nom: 'Caluire-et-Cuire', population: 43597, centre: { coordinates: [4.862, 45.797] } },
  { code: '35238', nom: 'Rennes', population: 227830, centre: { coordinates: [-1.68, 48.11] } },
];

const RENTS_CSV = [
  '"id_zone";"INSEE_C";"LIBGEO";"EPCI";"DEP";"REG";"loypredm2";"lwr.IPm2";"upr.IPm2"',
  '"1";"69266";"Villeurbanne";"";"69";"84";16,8;13,4;21,1',
  '"2";"69034";"Caluire-et-Cuire";"";"69";"84";16,7;13,1;21,3',
  '"3";"35238";"Rennes";"";"35";"53";14,9;12,0;18,4',
].join('\n');

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

  await page.route(
    (url) => url.hostname === 'data.enseignementsup-recherche.gouv.fr',
    (route) => {
      if (failures > 0) {
        failures--;
        return route.fulfill({ status: 500, body: 'Erreur simulée' });
      }
      const offset = Number(new URL(route.request().url()).searchParams.get('offset') ?? 0);
      return json(route, { total_count: ETABLISSEMENTS.length, results: offset === 0 ? ETABLISSEMENTS : [] });
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
    (url) => url.hostname === 'geo.api.gouv.fr' && url.pathname === '/communes',
    (route) => json(route, COMMUNES)
  );

  await page.route(
    (url) => url.hostname === 'geo.api.gouv.fr' && url.pathname.startsWith('/communes/'),
    (route) => {
      const code = new URL(route.request().url()).pathname.split('/').pop();
      const commune = COMMUNES.find((c) => c.code === code) ?? COMMUNES[0];
      const [lon, lat] = commune.centre.coordinates;
      return json(route, { type: 'Feature', properties: { code }, geometry: { type: 'Polygon', coordinates: square(lon, lat, 20) } });
    }
  );

  await page.route(
    (url) => url.hostname === 'static.data.gouv.fr',
    (route) => route.fulfill({ status: 200, contentType: 'text/csv', body: RENTS_CSV })
  );

  await page.route(
    (url) => url.hostname === 'data.geopf.fr' && url.pathname.startsWith('/geocodage/'),
    (route) => json(route, PLACES)
  );

  return { isochroneCalls };
};
