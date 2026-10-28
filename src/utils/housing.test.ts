import { describe, expect, it } from 'vitest';
import { CommuneInfo } from '../types/commune';
import { Coordinate } from '../types/isochrone';
import { communesInIsochrone, medianRent } from './housing';

// Isochrone carrée de ~2 km autour de (45.78, 4.88)
const zone: Coordinate[] = [
  [45.77, 4.87],
  [45.77, 4.89],
  [45.79, 4.89],
  [45.79, 4.87],
];

const communes: CommuneInfo[] = [
  // centre dans la zone
  { code: '69266', nom: 'Villeurbanne', population: 160000, lat: 45.78, lon: 4.88, rent: 16.8, rentLow: 13.4, rentHigh: 21.1 },
  // centre hors zone mais le plus proche du coin nord-ouest
  { code: '69034', nom: 'Caluire-et-Cuire', population: 43000, lat: 45.795, lon: 4.865, rent: 16.7 },
  // loin : ni dedans ni le plus proche d'un sommet
  { code: '69381', nom: 'Lyon 1er Arrondissement', population: 30000, lat: 45.6, lon: 4.6, rent: 19 },
];

describe('communesInIsochrone', () => {
  it('retient les centres inclus et les communes les plus proches des sommets', () => {
    const items = communesInIsochrone(zone, communes);
    expect(items.map((c) => c.code).sort()).toEqual(['69034', '69266']);
  });

  it('trie par loyer croissant et reporte la fourchette', () => {
    const items = communesInIsochrone(zone, communes);
    expect(items.map((c) => c.nom)).toEqual(['Caluire-et-Cuire', 'Villeurbanne']);
    expect(items[1]).toMatchObject({ rent: 16.8, rentLow: 13.4, rentHigh: 21.1 });
  });

  it('place les communes sans loyer en dernier, par population décroissante', () => {
    const withoutRent = communes.map((c) => (c.code === '69034' ? { ...c, rent: 15 } : { ...c, rent: undefined }));
    const items = communesInIsochrone(zone, withoutRent);
    expect(items.map((c) => c.nom)).toEqual(['Caluire-et-Cuire', 'Villeurbanne']);
    expect(items[1].rent).toBeUndefined();
  });
});

describe('medianRent', () => {
  const commune = (rent?: number) => ({ code: '', nom: '', population: 0, lat: 0, lon: 0, rent });

  it('ignore les loyers inconnus', () => {
    expect(medianRent([commune(10), commune(), commune(14), commune(12)])).toBe(12);
  });

  it('fait la moyenne des deux valeurs centrales pour un effectif pair', () => {
    expect(medianRent([commune(10), commune(20)])).toBe(15);
  });

  it('renvoie undefined sans loyer connu', () => {
    expect(medianRent([commune()])).toBeUndefined();
  });
});
