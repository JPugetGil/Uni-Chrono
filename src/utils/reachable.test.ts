import { describe, expect, it } from 'vitest';
import { Etablissement } from '../types/etablissement';
import { Coordinate, Isochrone } from '../types/isochrone';
import { reachableEtablissements } from './reachable';

const square = (half: number): Coordinate[] => [
  [45 - half, 5 - half],
  [45 - half, 5 + half],
  [45 + half, 5 + half],
  [45 + half, 5 - half],
];

const etab = (id: string, lat: number, lon: number) => ({ id, coordonnees: { lat, lon } }) as Etablissement;

const zone: Isochrone = {
  coordinates: square(0.1),
  bands: [
    { minutes: 5, coordinates: square(0.02) },
    { minutes: 15, coordinates: square(0.1) },
  ],
  color: '#000',
};

describe('reachableEtablissements', () => {
  it('range par bande de temps puis par distance, et écarte ce qui est hors zone', () => {
    const result = reachableEtablissements(
      [etab('loin-dans-zone', 45.09, 5), etab('proche', 45.01, 5), etab('dehors', 45.2, 5), etab('moyen', 45.05, 5)],
      zone,
      { lat: 45, lon: 5 }
    );
    expect(result.map((r) => [r.etablissement.id, r.minutes])).toEqual([
      ['proche', 5],
      ['moyen', 15],
      ['loin-dans-zone', 15],
    ]);
  });

  it('se contente de la zone sans bandes', () => {
    const result = reachableEtablissements([etab('a', 45, 5)], { coordinates: square(0.1), color: '#000' }, { lat: 45, lon: 5 });
    expect(result).toHaveLength(1);
  });
});
