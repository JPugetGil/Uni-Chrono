/** Commune (ou arrondissement municipal de Paris, Lyon, Marseille) avec son loyer d'annonce */
export interface CommuneInfo {
  code: string;
  nom: string;
  population: number;
  /** Centre de la commune */
  lat: number;
  lon: number;
  /** Loyer d'annonce prédit en €/m² charges comprises (appartement 1-2 pièces), si connu */
  rent?: number;
  /** Intervalle de prédiction du loyer en €/m² */
  rentLow?: number;
  rentHigh?: number;
}

/**
 * Ligne compacte de public/data/communes.json :
 * [code INSEE, nom, population, lat, lon, loyer, loyer bas, loyer haut]
 */
export type CommuneRow = [string, string, number, number, number, number | null, number | null, number | null];
