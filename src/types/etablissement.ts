/**
 * Catégorie d'un site, déduite des formations qu'il propose (couleur du
 * marqueur, légende) : au-delà de trois teintes, les couleurs ne restent pas
 * distinguables entre toutes les paires.
 */
export type EtablissementCategory = 'university' | 'school' | 'lycee' | 'other';

export const ETABLISSEMENT_CATEGORIES: EtablissementCategory[] = ['university', 'school', 'lycee', 'other'];

/** Statut de l'établissement (champ « tc » de Parcoursup) */
export type Statut = 'public' | 'prive-contrat' | 'prive';

export const STATUTS: Statut[] = ['public', 'prive-contrat', 'prive'];

/**
 * Site d'enseignement : un établissement (UAI) à une adresse, avec ses
 * formations Parcoursup. Une même UAI peut avoir plusieurs sites (campus).
 * Produit par scripts/build-data.ts (public/data/etablissements.json).
 */
export interface Etablissement {
  /** Identifiant stable : l'UAI, suivie de la position si l'UAI a plusieurs sites */
  id: string;
  uai: string;
  nom: string;
  coordonnees: {
    lat: number;
    lon: number;
  };
  commune: string;
  departement: string;
  region: string;
  statut: Statut;
  /** Types de formation proposés (BTS, Licence, CPGE…), triés */
  types: string[];
  /** Filières proposées (« BTS - Services informatiques aux organisations »…), triées */
  filieres: string[];
  category: EtablissementCategory;
  /** Nombre de formations sur Parcoursup */
  formations: number;
  /** Au moins une formation en apprentissage */
  apprentissage: boolean;
  /** Site web de l'établissement */
  url?: string;
  /** Couleur d'affichage (catégorie), ajoutée au chargement */
  color?: string;
}

/** Formation Parcoursup d'un site (public/data/formations/<préfixe UAI>.json) */
export interface Formation {
  nom: string;
  type: string;
  apprentissage: boolean;
  /** Fiche de la formation sur Parcoursup */
  fiche?: string;
}

/** Sources et fraîcheur des données préparées (public/data/meta.json) */
export interface DataMeta {
  generatedAt: string;
  parcoursup: { year: number; modified?: string; processed?: string; url: string };
  rents: { year: number; url: string; datasetUrl: string };
  communes: { url: string };
  crous: { processed?: string; url: string };
}
