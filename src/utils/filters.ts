import { Etablissement, getEtablissementName, getEtablissementTypes } from '../types/etablissement';
import { matchesAllWords, normalizeText } from './text';

export type Filters = {
  type?: string;
  region?: string;
  departement?: string;
  commune?: string;
  /** Mots devant tous apparaître dans le nom (sans tenir compte des accents) */
  name?: string;
};

/** Identifiant stable d'un établissement : UAI, ou coordonnées à défaut */
export const etabId = (e: Etablissement): string => e.uai || `${e.coordonnees.lat},${e.coordonnees.lon}`;

/** Test d'un établissement contre les filtres */
export const matchesFilters = (e: Etablissement, filters: Filters): boolean => {
  if (filters.type && !getEtablissementTypes(e).includes(filters.type)) return false;
  if (filters.region && e.reg_nom !== filters.region) return false;
  if (filters.departement && e.dep_nom !== filters.departement) return false;
  if (filters.commune && e.com_nom !== filters.commune) return false;
  if (filters.name) {
    if (!matchesAllWords(normalizeText(getEtablissementName(e)), normalizeText(filters.name))) return false;
  }
  return true;
};

export const countActiveFilters = (filters: Filters): number =>
  Object.values(filters).filter((v) => v !== undefined && v !== '').length;
