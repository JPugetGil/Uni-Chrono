import { describe, expect, it } from 'vitest';
import { baseLayerFailing } from './layers';

describe('baseLayerFailing', () => {
  it('ne réagit pas à une ou deux tuiles en échec', () => {
    expect(baseLayerFailing(2, 0)).toBe(false);
  });

  it('juge le fond en échec quand toutes les tuiles échouent (panne, vue hors de France)', () => {
    expect(baseLayerFailing(3, 0)).toBe(true);
  });

  it('tolère quelques tuiles hors couverture au bord d’une vue frontalière', () => {
    expect(baseLayerFailing(4, 26)).toBe(false);
    expect(baseLayerFailing(8, 22)).toBe(true);
  });
});
