import { describe, expect, it } from 'vitest';
import { Etablissement, getEtablissementCategory, getEtablissementName } from './etablissement';

const withType = (type: Etablissement['type_d_etablissement']): Etablissement => ({
  type_d_etablissement: type,
  coordonnees: { lat: 0, lon: 0 },
});

describe('getEtablissementCategory', () => {
  // Les 18 libellés du jeu de données MESR (requête group_by du 28/10/2026)
  it.each([
    ['Université', 'university'],
    ["Communauté d'universités et établissements", 'university'],
    ["Pôle de recherche et d'enseignement supérieur", 'university'],
    ['Grand établissement', 'grand'],
    ["Grand établissement relevant d'un autre département ministériel", 'grand'],
    ["École d'ingénieurs", 'school'],
    ['Institut national polytechnique', 'school'],
    ["Écoles nationales supérieures d'ingénieurs", 'school'],
    ["Écoles habilitées à délivrer un diplôme d'ingénieur", 'school'],
    ['École normale supérieure', 'school'],
    ["Institut d'étude politique", 'school'],
    ["Établissement supérieur d'architecture", 'school'],
    ['Instituts et écoles extérieurs aux universités', 'school'],
    ["École extérieure relevant d'un autre département ministériel", 'school'],
    ["École française à l'étranger", 'school'],
    ['Autre établissement', 'other'],
    ["Etablissement relevant d'un autre département ministériel rattaché à un EPSCP", 'other'],
    [null, 'other'],
  ] as const)('%s → %s', (type, category) => {
    expect(getEtablissementCategory(withType(type))).toBe(category);
  });

  it('retient la catégorie prioritaire d’un type multiple', () => {
    expect(getEtablissementCategory(withType(['Autre établissement', 'Université']))).toBe('university');
  });
});

describe('getEtablissementName', () => {
  it('préfère l’implantation, puis le siège, puis l’UAI', () => {
    const base: Etablissement = { coordonnees: { lat: 0, lon: 0 }, uai: '0000000A' };
    expect(getEtablissementName({ ...base, implantation_lib: '  IUT   Lyon 1 ', siege_lib: 'Université' })).toBe('IUT Lyon 1');
    expect(getEtablissementName({ ...base, siege_lib: 'Université Lyon 1' })).toBe('Université Lyon 1');
    expect(getEtablissementName(base)).toBe('0000000A');
  });
});
