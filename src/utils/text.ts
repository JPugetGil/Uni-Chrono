/**
 * Forme de comparaison d'un texte : sans accents, en minuscules, apostrophes
 * typographiques unifiées (« École » et « ecole » sont égaux).
 */
export const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();

/** Vrai si chaque mot de la requête (déjà normalisée) apparaît dans le texte normalisé. */
export const matchesAllWords = (normalizedText: string, normalizedQuery: string): boolean =>
  normalizedQuery.split(/\s+/).filter(Boolean).every((word) => normalizedText.includes(word));
