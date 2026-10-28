import { describe, expect, it } from 'vitest';
import { Etablissement } from '../types/etablissement';
import { countActiveFilters, etabId, matchesFilters } from './filters';

const insa: Etablissement = {
  uai: '0690192J',
  implantation_lib: 'Institut national des sciences appliquées de Lyon',
  type_d_etablissement: 'Grand établissement',
  coordonnees: { lat: 45.78, lon: 4.88 },
  reg_nom: 'Auvergne - Rhône-Alpes',
  dep_nom: 'Rhône',
  com_nom: 'Villeurbanne',
};

describe('matchesFilters', () => {
  it('accepte tout sans filtre', () => {
    expect(matchesFilters(insa, {})).toBe(true);
  });

  it('combine les critères géographiques et le type', () => {
    expect(matchesFilters(insa, { region: 'Auvergne - Rhône-Alpes', departement: 'Rhône', commune: 'Villeurbanne' })).toBe(true);
    expect(matchesFilters(insa, { departement: 'Isère' })).toBe(false);
    expect(matchesFilters(insa, { type: 'Grand établissement' })).toBe(true);
    expect(matchesFilters(insa, { type: 'Université' })).toBe(false);
  });

  it('filtre le nom sans accents et mot par mot', () => {
    expect(matchesFilters(insa, { name: 'SCIENCES appliquees' })).toBe(true);
    expect(matchesFilters(insa, { name: 'lyon institut' })).toBe(true);
    expect(matchesFilters(insa, { name: 'sorbonne' })).toBe(false);
  });

  it('accepte un type multiple', () => {
    expect(matchesFilters({ ...insa, type_d_etablissement: ['Université', 'Grand établissement'] }, { type: 'Université' })).toBe(true);
  });
});

describe('etabId', () => {
  it('utilise l’UAI, sinon les coordonnées', () => {
    expect(etabId(insa)).toBe('0690192J');
    expect(etabId({ ...insa, uai: null })).toBe('45.78,4.88');
  });
});

describe('countActiveFilters', () => {
  it('ne compte que les critères renseignés', () => {
    expect(countActiveFilters({})).toBe(0);
    expect(countActiveFilters({ region: 'Bretagne', departement: undefined, name: '' })).toBe(1);
  });
});
