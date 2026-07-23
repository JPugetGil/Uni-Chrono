import { useEffect, useMemo, useState } from 'react';
import { Isochrone } from '../types/isochrone';
import { CommuneInfo, fetchCommunes, fetchRents } from '../housingFetcher';
import { isPointInIsochrone } from '../utils/geo';

export interface HousingCommune {
  code: string;
  nom: string;
  population: number;
  /** Loyer d'annonce prédit en €/m² (appartement 1-2 pièces), si connu */
  rent?: number;
}

export type HousingStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Communes situées dans l'isochrone d'un établissement, avec loyer €/m²,
 * triées du loyer le moins cher au plus cher (loyer inconnu en dernier).
 */
export const useHousing = (isochrone?: Isochrone) => {
  const [communes, setCommunes] = useState<CommuneInfo[] | null>(null);
  const [rents, setRents] = useState<Map<string, number> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCommunes(), fetchRents()])
      .then(([c, r]) => {
        if (active) {
          setCommunes(c);
          setRents(r);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return useMemo((): { status: HousingStatus; items: HousingCommune[] } => {
    if (!isochrone || isochrone.coordinates.length === 0) return { status: 'idle', items: [] };
    if (failed) return { status: 'error', items: [] };
    if (!communes || !rents) return { status: 'loading', items: [] };

    const items = communes
      .filter((c) => isPointInIsochrone(c.lat, c.lon, isochrone.coordinates))
      .map((c) => ({ code: c.code, nom: c.nom, population: c.population, rent: rents.get(c.code) }))
      .sort((a, b) => (a.rent ?? Infinity) - (b.rent ?? Infinity) || b.population - a.population);

    return { status: 'ready', items };
  }, [isochrone, communes, rents, failed]);
};
