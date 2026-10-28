import { Etablissement, Statut } from '../types/etablissement';
import { matchesAllWords, normalizeText } from './text';

export type Filters = {
  /** Type de formation proposé (BTS, Licence…) */
  type?: string;
  statut?: Statut;
  region?: string;
  departement?: string;
  commune?: string;
  /** Mots devant tous apparaître dans le nom (sans tenir compte des accents) */
  name?: string;
};

/** Identifiant stable d'un site d'enseignement */
export const etabId = (e: Etablissement): string => e.id;

/** Test d'un établissement contre les filtres */
export const matchesFilters = (e: Etablissement, filters: Filters): boolean => {
  if (filters.type && !e.types.includes(filters.type)) return false;
  if (filters.statut && e.statut !== filters.statut) return false;
  if (filters.region && e.region !== filters.region) return false;
  if (filters.departement && e.departement !== filters.departement) return false;
  if (filters.commune && e.commune !== filters.commune) return false;
  if (filters.name) {
    if (!matchesAllWords(normalizeText(e.nom), normalizeText(filters.name))) return false;
  }
  return true;
};

export const countActiveFilters = (filters: Filters): number =>
  Object.values(filters).filter((v) => v !== undefined && v !== '').length;
