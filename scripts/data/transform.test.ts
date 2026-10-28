import { describe, expect, it } from 'vitest';
import {
  type ParcoursupRecord,
  buildCommunes,
  buildSites,
  categoryOfTypes,
  cleanName,
  latestRentsEdition,
  parseRentsCsv,
  statutOf,
  toTitleCase,
} from './transform.ts';

const record = (overrides: Partial<ParcoursupRecord> = {}): ParcoursupRecord => ({
  etab_uai: '0690192J',
  etab_nom: 'INSA Lyon (Villeurbanne - 69)',
  tc: 'Publics',
  tf: ["Formations des écoles d'ingénieurs"],
  nm: ["Formation d'ingénieur Bac + 5 - Bac général"],
  fl: ["Formation d'ingénieur Bac + 5"],
  app: null,
  region: 'Auvergne-Rhône-Alpes',
  departement: 'Rhône',
  commune: 'Villeurbanne',
  fiche: 'https://dossierappel.parcoursup.fr/fiche?g_ta_cod=1',
  etab_url: 'https://www.insa-lyon.fr/',
  etab_gps: { lat: 45.78334, lon: 4.87812 },
  ...overrides,
});

describe('cleanName / toTitleCase', () => {
  it.each([
    ['Télécom Saint-Etienne (42)', 'Télécom Saint-Etienne'],
    ["IUT de Lille (Villeneuve-d'Ascq - 59)", 'IUT de Lille'],
    ['Polytech Sorbonne (Paris  5e  Arrondissement - 75)', 'Polytech Sorbonne'],
    ['Lycée Pascal Paoli (2B)', 'Lycée Pascal Paoli'],
    ['Lycée agricole Hautes-Alpes (Des)', 'Lycée agricole Hautes-Alpes (Des)'],
  ])('%s → %s', (raw, expected) => {
    expect(cleanName(raw)).toBe(expected);
  });

  it('met en casse de titre un nom tout en capitales, sigles compris', () => {
    expect(cleanName("SITE DE FORMATION D'APPRENTIS PURPLE CAMPUS RODEZ (12)")).toBe("Site de Formation d'Apprentis Purple Campus Rodez");
    expect(toTitleCase('IUT DE LA ROCHELLE')).toBe('IUT de la Rochelle');
    expect(toTitleCase('LYCEE JEAN-BAPTISTE COROT')).toBe('Lycee Jean-Baptiste Corot');
  });
});

describe('categoryOfTypes', () => {
  // Les 25 types de formation de la session 2026
  it.each([
    [['Licence'], 'university'],
    [['Licence sélective'], 'university'],
    [['BUT'], 'university'],
    [['Etudes de santé'], 'university'],
    [['LPE - Licence Professorat des Ecoles'], 'university'],
    [['DEUST'], 'university'],
    [['C.M.I - Cursus Master en Ingénierie'], 'university'],
    [["I.A.E - Instituts d'administration des entreprises"], 'university'],
    [["Diplômes d'université ou d'établissement"], 'university'],
    [['Licence professionnelle'], 'university'],
    [["Formations des écoles d'ingénieurs"], 'school'],
    [['Formations des écoles de commerce et de management'], 'school'],
    [["Formations d'art, de design et du spectacle vivant"], 'school'],
    [["Formations d'architecture, du paysage et du patrimoine"], 'school'],
    [["Sciences Po - Instituts d'études politiques"], 'school'],
    [['Formations des écoles vétérinaires'], 'school'],
    [['Formations diplômantes du travail social'], 'school'],
    [['Formations aux métiers du sport'], 'school'],
    [['BTS - BTSA - BTSM'], 'lycee'],
    [['CPGE'], 'lycee'],
    [['DCG'], 'lycee'],
    [['Certificats de spécialisation et FCIL'], 'lycee'],
    [["Formations préparatoires à l'enseignement supérieur"], 'lycee'],
    [["Formations aux métiers de l'hôtellerie restauration"], 'lycee'],
    [['Formations professionnelles'], 'other'],
    [[], 'other'],
  ])('%j → %s', (types, category) => {
    expect(categoryOfTypes(types)).toBe(category);
  });

  it('donne la priorité à l’université, puis à l’école, puis au lycée', () => {
    expect(categoryOfTypes(['BTS - BTSA - BTSM', 'Licence'])).toBe('university');
    expect(categoryOfTypes(['CPGE', "Formations des écoles d'ingénieurs"])).toBe('school');
  });
});

describe('statutOf', () => {
  it.each([
    ['Publics', 'public'],
    ['Privés en contrat avec l’Etat / EESC', 'prive-contrat'],
    ['Privés', 'prive'],
    [null, 'prive'],
  ])('%s → %s', (tc, statut) => {
    expect(statutOf(tc)).toBe(statut);
  });
});

describe('buildSites', () => {
  it('regroupe les formations d’un même site et garde le nom le plus fréquent', () => {
    const { etablissements, formationsByPrefix } = buildSites([
      record(),
      record({ etab_nom: 'INSA Lyon (Villeurbanne - 69)', tf: ['Licence'], nm: ['Licence - Mathématiques'], app: ['Formations en apprentissage'] }),
      // ~2 m plus loin, même case de ~11 m : même site
      record({ etab_nom: 'INSA Lyon – parcours anglophone (Villeurbanne - 69)', etab_gps: { lat: 45.78333, lon: 4.87814 } }),
    ]);

    expect(etablissements).toHaveLength(1);
    expect(etablissements[0]).toMatchObject({
      id: '0690192J',
      nom: 'INSA Lyon',
      coordonnees: { lat: 45.7833, lon: 4.8781 },
      statut: 'public',
      types: ["Formations des écoles d'ingénieurs", 'Licence'],
      category: 'university',
      formations: 3,
      apprentissage: true,
      url: 'https://www.insa-lyon.fr/',
    });
    expect(formationsByPrefix.get('069')?.['0690192J']).toHaveLength(3);
  });

  it('distingue les sites d’une même UAI par leur position', () => {
    const { etablissements, formationsByPrefix } = buildSites([
      record(),
      record({ etab_nom: 'INSA Lyon - Antenne de Oyonnax (01)', commune: 'Oyonnax', etab_gps: { lat: 46.2554, lon: 5.6551 } }),
    ]);

    expect(etablissements.map((e) => e.id)).toEqual(['0690192J@45.7833,4.8781', '0690192J@46.2554,5.6551']);
    expect(Object.keys(formationsByPrefix.get('069') ?? {})).toHaveLength(2);
  });

  it('écarte les enregistrements sans UAI ou sans position', () => {
    const { etablissements } = buildSites([record({ etab_uai: null }), record({ etab_gps: null })]);
    expect(etablissements).toEqual([]);
  });
});

describe('parseRentsCsv', () => {
  it('repère les colonnes par leur en-tête et lit la virgule décimale', () => {
    const csv = [
      '"id_zone";"INSEE_C";"LIBGEO";"EPCI";"DEP";"REG";"loypredm2";"lwr.IPm2";"upr.IPm2";"TYPPRED"',
      '"1";"75105";"Paris 5e Arrondissement";"";"75";"11";36,2793;28,7909;45,7155;"commune"',
      '"2";"69034";"Caluire-et-Cuire";"";"69";"84";16,7;NA;NA;"maille"',
      '"3";"";"Sans code";"";"";"";12;10;14;"maille"',
      '',
    ].join('\r\n');

    const rents = parseRentsCsv(csv);
    expect(rents.size).toBe(2);
    expect(rents.get('75105')).toEqual({ rent: 36.2793, low: 28.7909, high: 45.7155 });
    expect(rents.get('69034')).toEqual({ rent: 16.7 });
  });

  it('échoue si les colonnes attendues manquent', () => {
    expect(() => parseRentsCsv('"a";"b"\n1;2')).toThrow('Colonnes de loyer introuvables');
  });
});

describe('buildCommunes', () => {
  it('remplace Paris, Lyon et Marseille par leurs arrondissements et joint les loyers', () => {
    const rows = buildCommunes(
      [
        { code: '75056', nom: 'Paris', population: 2_100_000, centre: { coordinates: [2.347, 48.859] } },
        { code: '69266', nom: 'Villeurbanne', population: 163_684, centre: { coordinates: [4.880123, 45.771234] } },
        { code: '00000', nom: 'Sans centre' },
      ],
      [{ code: '75105', nom: 'Paris 5e Arrondissement', population: 55_252, centre: { coordinates: [2.3514, 48.8454] } }],
      new Map([['75105', { rent: 36.2793, low: 28.7909, high: 45.7155 }]])
    );

    expect(rows).toEqual([
      ['69266', 'Villeurbanne', 163_684, 45.77123, 4.88012, null, null, null],
      ['75105', 'Paris 5e Arrondissement', 55_252, 48.8454, 2.3514, 36.28, 28.79, 45.72],
    ]);
  });
});

describe('latestRentsEdition', () => {
  it('choisit l’année la plus récente qui publie le fichier « appartements 1-2 pièces »', () => {
    const dataset = (year: number, files: string[]) => ({
      id: String(year),
      title: `"Carte des loyers" - Indicateurs de loyers d'annonce par commune en ${year}`,
      page: `https://www.data.gouv.fr/datasets/${year}`,
      resources: files.map((f) => ({ url: `https://static.data.gouv.fr/${year}/${f}` })),
    });

    expect(
      latestRentsEdition([
        dataset(2024, ['pred-app12-mef-dhup.csv']),
        dataset(2026, ['pred-mai-mef-dhup.csv']),
        dataset(2025, ['pred-app-mef-dhup.csv', 'pred-app12-mef-dhup.csv']),
      ])
    ).toEqual({ year: 2025, url: 'https://static.data.gouv.fr/2025/pred-app12-mef-dhup.csv', datasetUrl: 'https://www.data.gouv.fr/datasets/2025' });
    expect(() => latestRentsEdition([])).toThrow();
  });
});
