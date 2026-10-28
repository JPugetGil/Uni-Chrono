import { describe, expect, it } from 'vitest';
import { Etablissement } from '../types/etablissement';
import { countActiveFilters, etabId, matchesFilters } from './filters';

const insa: Etablissement = {
  id: '0690192J',
  uai: '0690192J',
  nom: 'Institut national des sciences appliquées de Lyon',
  coordonnees: { lat: 45.78, lon: 4.88 },
  commune: 'Villeurbanne',
  departement: 'Rhône',
  region: 'Auvergne-Rhône-Alpes',
  statut: 'public',
  types: ["Formations des écoles d'ingénieurs", 'Licence'],
  filieres: ["Formation d'ingénieur Bac + 5", 'L1 - Mathématiques'],
  category: 'school',
  formations: 4,
  apprentissage: false,
};

describe('matchesFilters', () => {
  it('accepte tout sans filtre', () => {
    expect(matchesFilters(insa, {})).toBe(true);
  });

  it('combine les critères géographiques, le type de formation et le statut', () => {
    expect(matchesFilters(insa, { region: 'Auvergne-Rhône-Alpes', departement: 'Rhône', commune: 'Villeurbanne' })).toBe(true);
    expect(matchesFilters(insa, { departement: 'Isère' })).toBe(false);
    expect(matchesFilters(insa, { type: 'Licence' })).toBe(true);
    expect(matchesFilters(insa, { type: 'BTS - BTSA - BTSM' })).toBe(false);
    expect(matchesFilters(insa, { statut: 'public' })).toBe(true);
    expect(matchesFilters(insa, { statut: 'prive' })).toBe(false);
  });

  it('filtre le nom sans accents et mot par mot', () => {
    expect(matchesFilters(insa, { name: 'SCIENCES appliquees' })).toBe(true);
    expect(matchesFilters(insa, { name: 'lyon institut' })).toBe(true);
    expect(matchesFilters(insa, { name: 'sorbonne' })).toBe(false);
  });
});

describe('etabId', () => {
  it('renvoie l’identifiant du site', () => {
    expect(etabId(insa)).toBe('0690192J');
    expect(etabId({ ...insa, id: '0690192J@45.78,4.88' })).toBe('0690192J@45.78,4.88');
  });
});

describe('countActiveFilters', () => {
  it('ne compte que les critères renseignés', () => {
    expect(countActiveFilters({})).toBe(0);
    expect(countActiveFilters({ region: 'Bretagne', departement: undefined, name: '' })).toBe(1);
  });
});
