/** Résidence CROUS (public/data/crous.json) */
export interface CrousLogement {
  id: string;
  nom: string;
  ville: string;
  adresse?: string;
  description?: string;
  lat: number;
  lon: number;
  /** Réservation (Trouver un logement) ou site du CROUS */
  url?: string;
}

/** Restaurant ou cafétéria CROUS */
export interface CrousRestaurant {
  id: string;
  nom: string;
  type: string;
  ville: string;
  lat: number;
  lon: number;
  /** Fermé (temporairement) d'après le CROUS */
  ferme: boolean;
}

export interface CrousData {
  logements: CrousLogement[];
  restaurants: CrousRestaurant[];
}
