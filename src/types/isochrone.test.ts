import { describe, expect, it } from 'vitest';
import { bandColor, bandMinutes } from './isochrone';
import { bandColors } from '../design-system/tokens';

describe('bandMinutes', () => {
  it.each([
    [5, [5]],
    [10, [5, 10]],
    [15, [5, 10, 15]],
    [20, [5, 15, 20]],
    [30, [10, 20, 30]],
    [45, [15, 30, 45]],
    [60, [20, 40, 60]],
  ])('%i min → %j', (total, expected) => {
    expect(bandMinutes(total)).toEqual(expected);
  });

  it('produit des durées strictement croissantes, au plus 4, finissant par la durée demandée', () => {
    for (let total = 1; total <= 60; total++) {
      const bands = bandMinutes(total);
      expect(bands.length).toBeGreaterThan(0);
      expect(bands.length).toBeLessThanOrEqual(4);
      expect(bands[bands.length - 1]).toBe(total);
      bands.slice(1).forEach((m, i) => expect(m).toBeGreaterThan(bands[i]));
    }
  });
});

describe('bandColor', () => {
  it('donne une couleur par bande, de la plus proche (violet) à la plus lointaine (jaune)', () => {
    expect([0, 1, 2].map((i) => bandColor(i, 3))).toEqual(bandColors);
    // Deux bandes : les extrêmes, pour qu'elles restent bien distinctes
    expect([0, 1].map((i) => bandColor(i, 2))).toEqual([bandColors[0], bandColors[2]]);
    expect(bandColor(0, 1)).toEqual(bandColors[0]);
  });
});
