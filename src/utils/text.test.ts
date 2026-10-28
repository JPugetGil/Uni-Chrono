import { describe, expect, it } from 'vitest';
import { matchesAllWords, normalizeText } from './text';

describe('normalizeText', () => {
  it('retire accents, majuscules et espaces de bord', () => {
    expect(normalizeText('  École Normale SUPÉRIEURE ')).toBe('ecole normale superieure');
  });

  it('unifie les apostrophes typographiques', () => {
    expect(normalizeText('Institut d’Études')).toBe("institut d'etudes");
  });
});

describe('matchesAllWords', () => {
  const name = normalizeText('Institut national des sciences appliquées de Lyon');

  it('exige chaque mot, dans n’importe quel ordre', () => {
    expect(matchesAllWords(name, 'lyon sciences')).toBe(true);
    expect(matchesAllWords(name, 'lyon rennes')).toBe(false);
  });

  it('ignore les espaces multiples', () => {
    expect(matchesAllWords(name, '  appliquees   de ')).toBe(true);
  });
});
