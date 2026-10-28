import { describe, expect, it } from 'vitest';
import { BAND_FILL_OPACITY, bandMinutes, bandOpacity } from './isochrone';

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

describe('bandOpacity', () => {
  it('reproduit l’empilement des remplissages : la bande la plus proche est la plus opaque', () => {
    expect(bandOpacity(2, 3)).toBeCloseTo(BAND_FILL_OPACITY);
    expect(bandOpacity(0, 3)).toBeGreaterThan(bandOpacity(1, 3));
    expect(bandOpacity(1, 3)).toBeGreaterThan(bandOpacity(2, 3));
  });
});
