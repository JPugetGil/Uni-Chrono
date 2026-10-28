import { describe, expect, it } from 'vitest';
import { Coordinate } from '../types/isochrone';
import {
  boundsOf,
  ensureCounterClockwise,
  flattenCoordinates,
  isMultiPolygon,
  isPointInIsochrone,
  isochroneAreaKm2,
} from './geo';

// Carré [lat, lon] de 0,1° de côté autour de (45, 5)
const square: Coordinate[] = [
  [44.95, 4.95],
  [44.95, 5.05],
  [45.05, 5.05],
  [45.05, 4.95],
];
const farSquare: Coordinate[] = square.map(([lat, lon]) => [lat + 1, lon + 1]);

describe('isPointInIsochrone', () => {
  it('teste un polygone simple', () => {
    expect(isPointInIsochrone(45, 5, square)).toBe(true);
    expect(isPointInIsochrone(45.2, 5, square)).toBe(false);
  });

  it('teste chaque anneau d’un multi-polygone', () => {
    const multi = [square, farSquare];
    expect(isMultiPolygon(multi)).toBe(true);
    expect(isPointInIsochrone(46, 6, multi)).toBe(true);
    expect(isPointInIsochrone(45.5, 5.5, multi)).toBe(false);
  });

  it('renvoie faux pour une isochrone vide', () => {
    expect(isPointInIsochrone(45, 5, [])).toBe(false);
  });
});

describe('ensureCounterClockwise', () => {
  it('donne le même sens aux deux orientations d’un anneau', () => {
    const reversed = [...square].reverse();
    expect(ensureCounterClockwise(square)).toEqual(ensureCounterClockwise(reversed));
  });
});

describe('isochroneAreaKm2', () => {
  it('approche la surface d’un carré de 0,1° à 45° de latitude', () => {
    // 0,1° de latitude ≈ 11,06 km ; 0,1° de longitude ≈ 7,87 km à 45°
    expect(isochroneAreaKm2(square)).toBeCloseTo(11.0574 * 7.8714, 0);
  });

  it('additionne les anneaux d’un multi-polygone', () => {
    expect(isochroneAreaKm2([square, square])).toBeCloseTo(2 * isochroneAreaKm2(square), 6);
  });

  it('vaut 0 sans coordonnées', () => {
    expect(isochroneAreaKm2([])).toBe(0);
  });
});

describe('boundsOf / flattenCoordinates', () => {
  it('calcule l’emprise de tous les points', () => {
    expect(boundsOf(flattenCoordinates([square, farSquare]))).toEqual([
      [44.95, 4.95],
      [46.05, 6.05],
    ]);
  });

  it('renvoie null sans points', () => {
    expect(boundsOf([])).toBeNull();
  });
});
